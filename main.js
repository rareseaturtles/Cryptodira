// main.js — Turtle Cleanup Tool (fixed address + ready for API)

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

  // CONNECT WALLET
  connectBtn.addEventListener('click', async () => {
    if (!provider) return alert("Phantom not found — install it and refresh");
    try {
      const resp = await provider.connect();
      publicKey = resp.publicKey;
      const short = `\( {publicKey.toString().slice(0,8)}... \){publicKey.toString().slice(-6)}`;
      statusDiv.innerHTML = `✅ Connected: <span class="font-mono">${short}</span>`;
      connectBtn.classList.add('hidden');
      scanBtn.classList.remove('hidden');
    } catch (e) {
      alert("Connection rejected");
    }
  });

  // SCAN (already working)
  scanBtn.addEventListener('click', async () => {
    // ... (your existing scan code is fine — it already showed 0 accounts)
    executeBtn.classList.remove('hidden');
  });

  // EXECUTE — now uses your real Sol Incinerator API
  executeBtn.addEventListener('click', async () => {
    executeBtn.textContent = "Creating transactions...";
    try {
      const res = await fetch('/.netlify/functions/incinerator-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString() })
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "API error");

      alert(`🎉 Done! ${data.accountsClosed} accounts closed — ${data.solReclaimed} SOL reclaimed to your wallet!`);
    } catch (err) {
      alert("Cleanup error: " + err.message);
    }
    executeBtn.textContent = "Incinerate / Close Accounts & Reclaim";
  });
});