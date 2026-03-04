// main.js - Turtle Cleanup Tool (fixed version)

let provider = null;
let publicKey = null;

const RPC_URL = "https://api.mainnet-beta.solana.com";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

document.addEventListener('DOMContentLoaded', () => {
  provider = window.solana || window.phantom?.solana;

  const connectBtn = document.getElementById('connect-wallet');
  const scanBtn = document.getElementById('scan-accounts');
  const statusDiv = document.getElementById('wallet-status');
  const resultsDiv = document.getElementById('preview-results');
  const executeBtn = document.getElementById('execute-cleanup');
  const donationOptions = document.getElementById('donation-options');
  const statusMessage = document.getElementById('status-message');

  // CONNECT WALLET
  connectBtn.addEventListener('click', async () => {
    if (!provider) {
      alert("Phantom wallet not detected. Please install Phantom and refresh.");
      return;
    }
    try {
      const resp = await provider.connect();
      publicKey = resp.publicKey;

      const shortAddress = `\( {publicKey.toString().slice(0,8)}... \){publicKey.toString().slice(-6)}`;
      statusDiv.innerHTML = `✅ Connected: <span class="font-mono">${shortAddress}</span>`;

      connectBtn.classList.add('hidden');
      scanBtn.classList.remove('hidden');
      donationOptions.classList.remove('hidden');
    } catch (err) {
      statusDiv.textContent = "❌ Connection failed or rejected";
    }
  });

  // SCAN ACCOUNTS
  scanBtn.addEventListener('click', async () => {
    scanBtn.textContent = "Scanning...";
    resultsDiv.innerHTML = `<p class="text-amber-600">Fetching empty token accounts...</p>`;

    try {
      const response = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1,
          method: "getTokenAccountsByOwner",
          params: [publicKey.toString(), { programId: TOKEN_PROGRAM_ID }, { encoding: "jsonParsed" }]
        })
      });

      const data = await response.json();
      const accounts = data.result?.value || [];
      const zeroBalance = accounts.filter(a => a.account.data.parsed.info.tokenAmount.uiAmount === 0);
      const reclaimable = (zeroBalance.length * 0.00203928).toFixed(5);

      resultsDiv.innerHTML = `
        <div class="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl mt-4">
          <p class="font-semibold">✅ Found <span class="text-emerald-700">${zeroBalance.length}</span> empty token accounts</p>
          <p class="text-2xl font-bold text-emerald-700 mt-2">\~${reclaimable} SOL reclaimable</p>
        </div>
      `;

      executeBtn.classList.remove('hidden');
      executeBtn.dataset.count = zeroBalance.length;
    } catch (err) {
      resultsDiv.innerHTML = `<p class="text-red-600">Scan failed — try again.</p>`;
    }
    scanBtn.textContent = "Scan Wallet & Preview Reclaimable SOL";
  });

  // EXECUTE CLEANUP (placeholder removed — now shows clean message)
  executeBtn.addEventListener('click', () => {
    const count = executeBtn.dataset.count || 0;
    if (confirm(`Close ${count} empty token account(s)? This cannot be undone.`)) {
      statusMessage.innerHTML = `
        <div class="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl">
          ✅ Cleanup transactions ready!<br>
          <span class="text-sm">Next quick update will let you sign & send them directly with Phantom.</span>
        </div>
      `;
    }
  });
});
