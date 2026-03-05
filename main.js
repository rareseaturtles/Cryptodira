const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");
let walletPubkey = null;

// Connect wallet
async function connectWallet() {
  if (!window.solana || !window.solana.isPhantom) {
    document.getElementById("status").innerText = "Phantom not installed—grab it!";
    return;
  }
  try {
    const resp = await window.solana.connect();
    walletPubkey = new solanaWeb3.PublicKey(resp.publicKey.toString());
    document.getElementById("status").innerText = `Connected: ${walletPubkey.toBase58().slice(0,8)}...`;
  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText = "Connect failed—try again.";
  }
}

// Scan junk via proxy
async function scanJunk() {
  if (!walletPubkey) return alert("Connect wallet first!");
  try {
    const res = await fetch('/.netlify/functions/sol-incinerator/close/preview', {
      method: 'POST',  // their preview wants POST
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: walletPubkey.toBase58() })
    });
    const data = await res.json();
    
    if (data.error) throw new Error(data.error);
    
    const count = data.accounts?.length || 0;
    const estSol = (count * 0.002).toFixed(3); // rough, but close
    document.getElementById("preview").innerText = `Found \( {count} junk accounts — \~ \){estSol} SOL reclaimable!`;
    window.junkData = data; // save for donate
  } catch (err) {
    console.error(err);
    document.getElementById("preview").innerText = "Scan error—check console.";
  }
}

// Donate: close-all, sign, send
async function donateJunk() {
  if (!window.junkData || !window.junkData.serializedTx) {
    return alert("Scan first—nothing to donate!");
  }
  try {
    const txBuf = Uint8Array.from(atob(window.junkData.serializedTx), c => c.charCodeAt(0));
    const tx = solanaWeb3.Transaction.from(txBuf);
    
    const signed = await window.solana.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig);
    
    document.getElementById("status").innerText = `Donated! Tx: ${sig}`;
    window.junkData = null; // reset
  } catch (err) {
    console.error(err);
    alert("Donate failed—maybe fees low? Check console.");
  }
}