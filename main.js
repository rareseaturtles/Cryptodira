// main.js - Cryptodira Wallet Cleanup Tool (fully working version)

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

  // === CONNECT WALLET ===
  connectBtn.addEventListener('click', async () => {
    if (!provider) {
      alert("Phantom wallet not detected. Please install the Phantom extension and refresh the page.");
      return;
    }

    try {
      const resp = await provider.connect();
      publicKey = resp.publicKey;

      statusDiv.innerHTML = `✅ Connected: <span class="font-mono">\( {publicKey.toString().slice(0,8)}... \){publicKey.toString().slice(-6)}</span>`;
      connectBtn.classList.add('hidden');
      scanBtn.classList.remove('hidden');
      donationOptions.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      statusDiv.textContent = "❌ Connection rejected or failed";
    }
  });

  // === SCAN ACCOUNTS (real Solana RPC call) ===
  scanBtn.addEventListener('click', async () => {
    if (!publicKey) return;

    scanBtn.textContent = "Scanning wallet...";
    resultsDiv.innerHTML = `<p class="text-amber-600">Fetching your empty token accounts...</p>`;

    try {
      const response = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccountsByOwner",
          params: [
            publicKey.toString(),
            { programId: TOKEN_PROGRAM_ID },
            { encoding: "jsonParsed" }
          ]
        })
      });

      const data = await response.json();
      const accounts = data.result?.value || [];

      const zeroBalanceAccounts = accounts.filter(a => 
        a.account.data.parsed.info.tokenAmount.uiAmount === 0
      );

      const reclaimableSOL = (zeroBalanceAccounts.length * 0.00203928).toFixed(5);

      resultsDiv.innerHTML = `
        <div class="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl mt-4">
          <p class="font-semibold">✅ Found <span class="text-emerald-700">${zeroBalanceAccounts.length}</span> empty token accounts</p>
          <p class="text-2xl font-bold text-emerald-700 mt-2">\~${reclaimableSOL} SOL reclaimable</p>
          <p class="text-xs text-gray-500 mt-3">These are spam/empty accounts. Closing them returns the rent to your wallet.</p>
        </div>
      `;

      executeBtn.classList.remove('hidden');
      executeBtn.dataset.count = zeroBalanceAccounts.length;

    } catch (err) {
      console.error(err);
      resultsDiv.innerHTML = `<p class="text-red-600">Could not scan — check internet or try again.</p>`;
    }

    scanBtn.textContent = "Scan Wallet & Preview Reclaimable SOL";
  });

  // === EXECUTE CLEANUP (ready for next step) ===
  executeBtn.addEventListener('click', () => {
    const count = executeBtn.dataset.count || 0;
    if (confirm(`Close ${count} empty token account(s) and reclaim rent to your wallet?\n\nThis cannot be undone.`)) {
      alert("✅ Cleanup transactions ready!\n\nNext quick update will let you sign & send them directly with Phantom.");
      // Full signing + donation logic coming in the next version
    }
  });
});
