// main.js - Wallet Cleanup with Donation

const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = solanaWeb3;
const { PhantomWalletAdapter } = window.SolanaWalletAdapterPhantom;

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
const API_BASE = "https://v1.api.sol-incinerator.com/";
const API_KEY = "YOUR_API_KEY_HERE";  // ← Replace with your wallet-bound key from https://api.dashboard.sol-incinerator.com/
const TREASURY = new PublicKey("293Py67fg8fNYMt1USR6Vb5pkG1Wxp5ehaSAPQvBYsJy");

let wallet = null;
let publicKey = null;
let reclaimEstimate = 0;

// Elements
const connectBtn = document.getElementById("connect-wallet");
const statusEl = document.getElementById("wallet-status");
const scanBtn = document.getElementById("scan-accounts");
const previewEl = document.getElementById("preview-results");
const donateCheck = document.getElementById("donate-checkbox");
const donateAmountDiv = document.getElementById("donate-amount");
const donateInput = document.getElementById("donate-value");
const maxDonateEl = document.getElementById("max-donate");
const executeBtn = document.getElementById("execute-cleanup");
const statusMsg = document.getElementById("status-message");

// Connect wallet
connectBtn.addEventListener("click", async () => {
  try {
    wallet = new PhantomWalletAdapter();
    await wallet.connect();
    publicKey = wallet.publicKey.toString();
    statusEl.textContent = `Connected: ${publicKey.slice(0,6)}...${publicKey.slice(-4)}`;
    scanBtn.classList.remove("hidden");
    connectBtn.disabled = true;
  } catch (err) {
    statusMsg.textContent = "Connection failed: " + err.message;
  }
});

// Scan / Preview
scanBtn.addEventListener("click", async () => {
  if (!publicKey) return;
  statusMsg.textContent = "Scanning...";

  try {
    const res = await axios.post(`${API_BASE}close_accounts/preview`, 
      { userPublicKey: publicKey },
      { headers: { "x-api-key": API_KEY } }
    );

    const { accounts = [], totalSolanaReclaimed = 0 } = res.data;
    reclaimEstimate = totalSolanaReclaimed;

    let html = `<p class="font-bold">Estimated reclaim: ${totalSolanaReclaimed.toFixed(6)} SOL</p>`;
    if (accounts.length > 0) {
      html += "<ul class='list-disc pl-5 mt-2'>";
      accounts.forEach(a => {
        html += `<li>${a.address.slice(0,8)}... → ${a.reclaimable_sol?.toFixed(6) || "?"} SOL</li>`;
      });
      html += "</ul>";
    } else {
      html += "<p class='text-yellow-400'>No empty accounts found to close.</p>";
    }

    previewEl.innerHTML = html;
    maxDonateEl.textContent = totalSolanaReclaimed.toFixed(6);
    donateInput.value = totalSolanaReclaimed.toFixed(6);
    document.getElementById("donation-options").classList.remove("hidden");
    executeBtn.classList.remove("hidden");
    statusMsg.textContent = "";
  } catch (err) {
    statusMsg.textContent = "Preview failed: " + (err.response?.data?.message || err.message);
  }
});

// Toggle donation input
donateCheck.addEventListener("change", () => {
  donateAmountDiv.classList.toggle("hidden", !donateCheck.checked);
});

// Execute cleanup + optional donation
executeBtn.addEventListener("click", async () => {
  if (!publicKey || !wallet) return;
  statusMsg.textContent = "Preparing transaction...";

  let donateLamports = 0;
  if (donateCheck.checked) {
    const donateSol = parseFloat(donateInput.value) || 0;
    if (donateSol > reclaimEstimate || donateSol <= 0) {
      statusMsg.textContent = "Invalid donation amount.";
      return;
    }
    donateLamports = Math.floor(donateSol * LAMPORTS_PER_SOL);
  }

  try {
    // Get close transaction from API (assuming it returns serialized tx)
    const res = await axios.post(`${API_BASE}close_accounts/transaction`, 
      { userPublicKey: publicKey },
      { headers: { "x-api-key": API_KEY } }
    );

    const serializedTx = res.data.transaction; // Adjust key if different (check your API response)
    let tx = Transaction.from(bs58.decode(serializedTx));

    // Add donation if requested
    if (donateLamports > 0) {
      const transferIx = SystemProgram.transfer({
        fromPubkey: new PublicKey(publicKey),
        toPubkey: TREASURY,
        lamports: donateLamports,
      });
      tx.add(transferIx);
    }

    // Sign & send
    const signedTx = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      maxRetries: 3
    });

    await connection.confirmTransaction(signature, "confirmed");

    statusMsg.innerHTML = `Success! <a href="https://solscan.io/tx/${signature}" target="_blank" class="underline">View tx</a>`;
    executeBtn.disabled = true;
  } catch (err) {
    statusMsg.textContent = "Failed: " + (err.message || "Unknown error");
    console.error(err);
  }
});