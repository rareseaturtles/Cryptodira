// main.js - Turtle Cleanup full flow

// These globals come from CDNs in index.html - make sure they're there!
const { Connection, PublicKey, Transaction } = window.solanaWeb3 || {};
const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

let walletPubkey = null;

// Connect Phantom
async function connectWallet() {
  if (!window.solana || !window.solana.isPhantom) {
    document.getElementById("status").innerText = "Phantom not found—install it!";
    return;
  }
  try {
    const resp = await window.solana.connect();
    walletPubkey = new PublicKey(resp.publicKey.toString());
    document.getElementById("status").innerText = `Connected: ${walletPubkey.toBase58().slice(0, 8)}...`;
  } catch (err) {
    console.error("Connect error:", err);
    document.getElementById("status").innerText = "Connect failed—try again.";
  }
}

// Scan junk via Netlify proxy
async function scanJunk() {
  if (!walletPubkey) return alert("Connect wallet first!");
  if (!Connection || !PublicKey) return alert("Solana libs not loaded—check index.html CDNs");

  try {
    const res = await fetch('/.netlify/functions/sol-incinerator/close/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: walletPubkey.toBase58() })
    });

    if (!res.ok) throw new Error(`Proxy error: ${res.status}`);

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const count = data.accounts?.length || 0;
    const estSol = (count * 0.002).toFixed(3); // estimate
    document.getElementById("preview").innerText = `Found \( {count} junk — \~ \){estSol} SOL reclaimable!`;

    window.junkData = data; // save serialized tx for donate
  } catch (err) {
    console.error("Scan failed:", err);
    document.getElementById("preview").innerText = `Scan error: ${err.message}`;
  }
}

// Donate: sign & send tx from proxy
async function donateJunk() {
  if (!walletPubkey) return alert("Connect first!");
  if (!window.junkData || !window.junkData.serializedTx) return alert("Scan first—nothing ready!");

  try {
    const txBuf = Uint8Array.from(atob(window.junkData.serializedTx), c => c.charCodeAt(0));
    const tx = Transaction.from(txBuf);

    const signedTx = await window.solana.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(sig);

    document.getElementById("status").innerText = `Success! Tx: ${sig}`;
    window.junkData = null;
  } catch (err) {
    console.error("Donate failed:", err);
    alert(`Donate error: ${err.message}`);
  }
}