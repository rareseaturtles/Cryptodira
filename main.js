<script src="https://unpkg.com/@solana/web3.js@1.95.3/lib/index.iife.min.js"></script>
<script src="https://unpkg.com/@solana/spl-token@0.4.8/lib/index.iife.min.js"></script>

<script>
  const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const treasury = new solanaWeb3.PublicKey("293Py67fg8fNYMt1USR6Vb5pkG1Wxp5ehaSAPQvBYsJy");

  let walletPubkey = null;

  // Connect button (add onclick="connectWallet()" to your button)
  async function connectWallet() {
    if (window.solana && window.solana.isPhantom) {
      try {
        const resp = await window.solana.connect();
        walletPubkey = resp.publicKey;
        document.getElementById("status").innerText = `Connected: ${walletPubkey.toBase58().slice(0,8)}...`;
      } catch (err) {
        console.error(err);
        document.getElementById("status").innerText = "Connect failed—try Phantom.";
      }
    } else {
      document.getElementById("status").innerText = "Phantom not found—install it.";
    }
  }

  // Scan & Preview (onclick="scanJunk()")
  async function scanJunk() {
    if (!walletPubkey) return alert("Connect wallet first!");
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, { programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") });
      
      let reclaimable = 0;
      const junk = [];
      for (const acc of tokenAccounts.value) {
        const info = acc.account.data.parsed.info;
        if (info.tokenAmount.uiAmount === 0) {
          junk.push(acc.pubkey);
          reclaimable += 0.002; // rough rent estimate
        }
      }
      
      document.getElementById("preview").innerText = `Found \( {junk.length} junk accounts — \~ \){reclaimable.toFixed(3)} SOL reclaimable!`;
      // Store junk list for donate step
      window.junkAccounts = junk;
    } catch (err) {
      console.error(err);
      document.getElementById("preview").innerText = "Scan failed—check console.";
    }
  }

  // Donate/Reclaim (onclick="donateJunk()")
  async function donateJunk() {
    if (!window.junkAccounts || window.junkAccounts.length === 0) return alert("Scan first!");
    try {
      const tx = new solanaWeb3.Transaction();
      for (const acc of window.junkAccounts) {
        const ix = await splToken.createCloseAccountInstruction(
          acc, // account to close
          treasury, // dest
          walletPubkey, // owner
          [],
          splToken.TOKEN_PROGRAM_ID
        );
        tx.add(ix);
      }
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = walletPubkey;

      const signed = await window.solana.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig);
      
      document.getElementById("status").innerText = `Donated! Tx: ${sig}`;
      window.junkAccounts = []; // clear
    } catch (err) {
      console.error(err);
      alert("Failed—maybe not enough SOL for fees?");
    }
  }
</script>