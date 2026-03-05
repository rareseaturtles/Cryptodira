// main.js - matches YOUR proxy exactly
let walletPubkey = null;

async function connectWallet() {
  if (!window.solana || !window.solana.isPhantom) {
    document.getElementById("status").innerText = "Phantom not found—install it!";
    return;
  }
  try {
    const resp = await window.solana.connect();
    walletPubkey = resp.publicKey.toString();
    document.getElementById("status").innerText = `Connected: ${walletPubkey.slice(0,8)}...`;
  } catch (err) {
    document.getElementById("status").innerText = "Connect failed—retry.";
  }
}

async function scanJunk() {
  if (!walletPubkey) return alert("Connect wallet first!");
  try {
    const res = await fetch('/.netlify/functions/sol-incinerator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: walletPubkey })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    document.getElementById("preview").innerText = 
      `Found \( {data.accountsClosed || 0} junk accounts — \~ \){(data.solReclaimed || 0).toFixed(3)} SOL reclaimed!`;
  } catch (err) {
    console.error(err);
    document.getElementById("preview").innerText = "Scan failed—check Netlify logs";
  }
}

async function donateJunk() {
  if (!walletPubkey) return alert("Connect first!");
  // Your proxy already does the full cleanup in one call
  scanJunk();  // just re-use it — SOL goes back to user's wallet
}