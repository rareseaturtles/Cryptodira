async function scanJunk() {
  if (!walletPubkey) return alert("Connect first!");
  try {
    const res = await fetch('/.netlify/functions/sol-incinerator/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPublicKey: walletPubkey })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    document.getElementById("preview").innerText = 
      `Found \( {data.accountsToClose || 0} junk — \~ \){(data.totalSolanaReclaimed / 1e9 || 0).toFixed(4)} SOL!`;  // lamports to SOL
  } catch (err) {
    document.getElementById("preview").innerText = `Scan: ${err.message}`;
  }
}

async function donateJunk() {
  if (!walletPubkey) return alert("Connect first!");
  try {
    const res = await fetch('/.netlify/functions/sol-incinerator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPublicKey: walletPubkey })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // Sign/send txs (docs say base58-encoded)
    for (const raw of data.transactions || []) {
      const txBytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
      const tx = solanaWeb3.VersionedTransaction.deserialize(txBytes);
      const signed = await window.solana.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig);
    }
    document.getElementById("status").innerText = `Done! ${data.accountsClosed || 0} cleaned.`;
  } catch (err) {
    alert(`Donate: ${err.message}`);
  }
}