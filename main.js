// DOM Elements
const tokenInfoEl       = document.getElementById("token-info");
const darkModeToggle    = document.getElementById("darkModeToggle");
const connectWalletBtn  = document.getElementById("connect-wallet-btn");
const addTickBtn        = document.getElementById("addTick");
const donateAmountInput = document.getElementById("donate-amount");
const balanceInfoEl     = document.getElementById("balance-info");
const walletStatusEl    = document.getElementById("walletStatus");
const tickCountEl       = document.getElementById("tickCount");

// Constants
const TOTAL_TOKEN_SUPPLY = 4880000;
const TOKEN_MINT = "53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8";
const DONATION_RECEIVER = "293Py67fg8fNYMt1USR6Vb5pkG1Wxp5ehaSAPQvBYsJy";

const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", "confirmed");

// Dark Mode
if (localStorage.getItem("darkMode") === "enabled") {
  document.body.classList.add("dark-mode");
  darkModeToggle.textContent = "Light Mode";
}

darkModeToggle.onclick = () => {
  const enabled = document.body.classList.toggle("dark-mode");
  darkModeToggle.textContent = enabled ? "Light Mode" : "Dark Mode";
  localStorage.setItem("darkMode", enabled ? "enabled" : "disabled");
};

// Fetch Token Info using Birdeye Public API
async function updateTokenInfo() {
  tokenInfoEl.innerHTML = `
    <p>Loading token data... <span class="loader"></span></p>
    <button class="button" id="refresh-token">Refresh</button>
  `;

  try {
    const res = await fetch(
      `https://public-api.birdeye.so/defi/market-cap?address=${TOKEN_MINT}&chain=solana`,
      { headers: { "x-chain": "solana" } }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const mc = data.data?.marketCapUsd;

    if (!mc) throw new Error("Market Cap unavailable");

    const price = (mc / TOTAL_TOKEN_SUPPLY).toFixed(8);

    tokenInfoEl.innerHTML = `
      <p><strong>Price:</strong> $${price}</p>
      <p><strong>Market Cap:</strong> $${mc.toLocaleString()}</p>
      <p><strong>Track:</strong> <a href="https://birdeye.so/token/${TOKEN_MINT}?chain=solana" target="_blank">Birdeye</a></p>
      <button class="button" id="refresh-token">Refresh</button>
    `;
  } catch (err) {
    tokenInfoEl.innerHTML = `
      <p>Error loading token info: ${err.message}</p>
      <button class="button" id="refresh-token">Refresh</button>
    `;
  }
}

// Connect Wallet
async function connectWallet() {
  const provider = window.solana;

  if (!provider) return alert("Install Phantom or Solflare.");

  try {
    await provider.connect();
    walletStatusEl.textContent =
      "Connected: " + provider.publicKey.toBase58().slice(0, 8) + "...";

    connectWalletBtn.textContent = "Connected";
    connectWalletBtn.disabled = true;
    addTickBtn.disabled = false;

    updateBalanceInfo();
    fetchTickCount();
  } catch (e) {
    alert("Wallet connection failed.");
  }
}

// Fetch Balances
async function updateBalanceInfo() {
  if (!window.solana?.isConnected) {
    balanceInfoEl.innerHTML = `<p>Connect wallet to view balance.</p>`;
    return;
  }

  try {
    const pubkey = window.solana.publicKey;

    // SOL balance
    const sol = (await connection.getBalance(pubkey)) / 1e9;

    // Token balance
    let dira = 0;
    try {
      const ata = await splToken.getAssociatedTokenAddress(
        new solanaWeb3.PublicKey(TOKEN_MINT),
        pubkey
      );
      const acc = await splToken.getAccount(connection, ata);
      dira = Number(acc.amount) / 1e9;
    } catch {}

    balanceInfoEl.innerHTML = `
      <p><strong>SOL:</strong> ${sol.toFixed(4)}</p>
      <p><strong>$DIRA:</strong> ${dira.toFixed(2)}</p>
      <button class="button" id="refresh-balance">Refresh</button>
    `;
  } catch (e) {
    balanceInfoEl.innerHTML = `<p>Error: ${e.message}</p>`;
  }
}

// Fetch Tick Count
async function fetchTickCount() {
  try {
    const mint = new solanaWeb3.PublicKey(TOKEN_MINT);
    const receiver = new solanaWeb3.PublicKey(DONATION_RECEIVER);

    const ata = await splToken.getAssociatedTokenAddress(mint, receiver);

    let acc;
    try {
      acc = await splToken.getAccount(connection, ata);
    } catch {
      tickCountEl.textContent = "0";
      return;
    }

    const ticks = Math.floor(Number(acc.amount) / 1e9);
    tickCountEl.textContent = ticks.toLocaleString();
  } catch (e) {
    console.log("Tick fetch error:", e.message);
  }
}

// Add Tick (Send DIRA to Treasury)
addTickBtn.onclick = async () => {
  if (!window.solana?.isConnected)
    return alert("Connect your wallet first!");

  const amount = parseFloat(donateAmountInput.value);
  if (!amount || amount <= 0) return alert("Enter a valid amount");

  try {
    const mint = new solanaWeb3.PublicKey(TOKEN_MINT);
    const from = window.solana.publicKey;
    const to = new solanaWeb3.PublicKey(DONATION_RECEIVER);

    const fromATA = await splToken.getAssociatedTokenAddress(mint, from);
    const toATA = await splToken.getAssociatedTokenAddress(mint, to);

    const tx = new solanaWeb3.Transaction();

    tx.add(
      solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 })
    );

    tx.add(
      splToken.createTransferInstruction(
        fromATA,
        toATA,
        from,
        BigInt(Math.floor(amount * 1e9))
      )
    );

    tx.feePayer = from;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    let sig;

    try {
      const result = await window.solana.signAndSendTransaction(tx);
      sig = result.signature;
    } catch {
      const signed = await window.solana.signTransaction(tx);
      sig = await connection.sendRawTransaction(signed.serialize());
    }

    await connection.confirmTransaction(sig);

    alert(`Donated ${amount} DIRA! Tx: ${sig.slice(0, 8)}...`);

    fetchTickCount();
    updateBalanceInfo();
    launchConfetti();
  } catch (e) {
    alert("Donation failed: " + e.message);
  }
};

// Confetti
function launchConfetti() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  canvas.width = innerWidth;
  canvas.height = innerHeight;

  const colors = ["#26a69a", "#f4a261", "#e9c46a", "#e76f51"];
  const pieces = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 6 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 10,
    vy: (Math.random() - 0.5) * 10,
    life: 60
  }));

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.life--;
      ctx.globalAlpha = p.life / 60;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    if (pieces[0].life > 0) requestAnimationFrame(animate);
    else document.body.removeChild(canvas);
  }

  animate();
}

// Event delegation for dynamic buttons
document.body.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;

  if (b.id === "refresh-token") updateTokenInfo();
  if (b.id === "refresh-balance") updateBalanceInfo();
  if (b.id === "connect-wallet-btn") connectWallet();
});

// Initialize
window.addEventListener("load", () => {
  updateTokenInfo();
  fetchTickCount();
  setInterval(fetchTickCount, 30000);
});