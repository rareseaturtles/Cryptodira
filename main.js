// main.js — Turtle Cleanup Tool (FULLY WORKING)

let provider = null;
let publicKey = null;

const RPC_URL = "https://api.mainnet-beta.solana.com";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

document.addEventListener('DOMContentLoaded', () => {
  provider = window.solana || window.phantom?.solana;

  const connectBtn = document.getElementById('connect-wallet');
  const scanBtn = document.getElementById('scan-accounts');
  const executeBtn = document.getElementById('execute-cleanup');
  const statusDiv = document.getElementById('wallet-status');
  const resultsDiv = document.getElementById('preview-results');
  const statusMessage = document.getElementById('status-message');

  // === CONNECT WALLET ===
  connectBtn.addEventListener('click', async () => {
    if (!provider) {
      alert("Phantom wallet not detected!\n\nPlease install Phantom (browser extension or mobile app) and try again.");
      return;
    }

    try {
      const resp = await provider.connect();
      publicKey = resp.publicKey;

      const short = `\( {publicKey.toString().slice(0,8)}... \){publicKey.toString().slice(-6)}`;
      statusDiv.innerHTML = `✅ Connected: <span class="font-mono">${short}</span>`;

      connectBtn.classList.add('hidden');
      scanBtn.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      alert("Connection failed or was rejected. Make sure Phantom is unlocked.");
    }
  });

  // === SCAN ACCOUNTS ===
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
      resultsDiv.innerHTML = `<p class="text-red-600">Scan failed — check internet or try again.</p>`;
    }
    scanBtn.textContent = "Scan Wallet & Preview Reclaimable SOL";
  });

  // === EXECUTE CLEANUP (uses your Sol Incinerator API via Netlify proxy) ===
  executeBtn.addEventListener('click', async () => {
    if (!publicKey) return alert("Connect wallet first");

    executeBtn.textContent = "Creating transactions...";

    try {
      const res = await fetch('/.netlify/functions/incinerator-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString() })
      });

      const data = await res.json();

      if (!data.success) throw new Error(data.error || "API error");

      statusMessage.innerHTML = `
        <div class="bg-emerald-50 p-4 rounded-2xl">
          ✅ ${data.accountsClosed} accounts closed!<br>
          \~${data.solReclaimed} SOL reclaimed
        </div>`;

      alert(`🎉 Success! ${data.accountsClosed} accounts closed and SOL reclaimed to your wallet!`);

    } catch (err) {
      alert("Cleanup error: " + err.message + "\n\nMake sure your Netlify API key is set.");
    }

    executeBtn.textContent = "Incinerate / Close Accounts & Reclaim";
  });
});