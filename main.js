let walletPubkey = null;

async function connectWallet() {
  if (!window.solana || !window.solana.isPhantom) {
    document.getElementById("status").innerText = "No Phantom—install it!";
    return;
  }
  try {
    const resp = await window.solana.connect();
    walletPubkey = resp.publicKey.toString();
    document.getElementById("status").innerText = `Connected: ${walletPubkey.slice(0,8)}...`;
  } catch (err) {
    document.getElementById("status").innerText = "Connect failed.";
  }
}

async function scanJunk() {
  if (!walletPubkey) return alert("Connect first!");
  try {
    const res = await fetch('/.netlify/functions/sol-incinerator/preview', {  // note /preview path
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: walletPubkey })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    document.getElementById("preview").innerText = 
      `Found \( {data.accountsToClose || 0} junk — \~ \){(data.totalSolanaReclaimed || 0).toFixed(4)} SOL!`;
    window.cleanupTxs = data.transactions;  // save for donate if needed
  } catch (err) {
    document.getElementById("preview").innerText = `Scan: ${err.message}`;
  }
}

async function donateJunk() {
  if (!walletPubkey) return alert("Connect first!");
  try {
    const res = await fetch('/.netlify/functions/sol-incinerator', {  // no /preview
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: walletPubkey })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    if (!data.transactions) throw new Error("No txs returned");

    for (const serTx of data.transactions) {
      const tx = solanaWeb3.VersionedTransaction.deserialize(Uint8Array.from(atob(serTx), c => c.charCodeAt(0)));
      const signed = await window.solana.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig);
    }

    document.getElementById("status").innerText = `Donated! ${data.accountsClosed || 0} closed.`;
  } catch (err) {
    alert(`Donate: ${err.message}`);
  }
}