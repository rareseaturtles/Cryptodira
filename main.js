/* ────────────────────────────────────────────────────────────────────────
   main.js – Cryptodira Turtle Ticks (FIXED token fetch + no generator)
   ──────────────────────────────────────────────────────────────────────── */

const tokenInfoEl       = document.getElementById("token-info");
const darkModeToggle    = document.getElementById('darkModeToggle');
const connectWalletBtn  = document.getElementById('connect-wallet-btn');
const addTickBtn        = document.getElementById('addTick');
const donateAmountInput = document.getElementById('donate-amount');
const balanceInfoEl     = document.getElementById('balance-info');
const walletStatusEl    = document.getElementById('walletStatus');
const tickCountEl       = document.getElementById('tickCount');

const BIRDEYE_API_KEY = "0d4d8f6a8444446cb233b2f2e933d6db";
const TOTAL_TOKEN_SUPPLY = 4880000;  // Your original supply
const TOKEN_MINT = "53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8";
const DONATION_RECEIVER = "293Py67fg8fNYMt1USR6Vb5pkG1Wxp5ehaSAPQvBYsJy";
const connection = new solanaWeb3.Connection("https://rpc.ankr.com/solana", 'confirmed');

let totalTicks = 0;
let isFetchingTicks = false;

/* ────────────────────── Dark Mode (unchanged) ────────────────────── */
darkModeToggle.addEventListener('click', e => {
  e.stopPropagation();
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  darkModeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
});
if (localStorage.getItem('darkMode') === 'enabled') {
  document.body.classList.add('dark-mode');
  darkModeToggle.textContent = 'Light Mode';
}

/* ────────────────────── Token Info (YOUR ORIGINAL LOGIC + FALLBACK) ────────────────────── */
async function updateTokenInfo() {
  console.log('Fetching token data...');
  const startTime = performance.now();
  tokenInfoEl.innerHTML = `<p>Loading token data... <span class="loader"></span></p><button class="button" id="refresh-token">Refresh</button>`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    let response = await fetch("https://public-api.birdeye.so/defi/price?address=53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8&check_liquidity=100&include_liquidity=true", {
      headers: {
        "X-API-KEY": BIRDEYE_API_KEY,
        "x-chain": "solana",
        "accept": "application/json"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Birdeye API failed, trying Jupiter...');
      response = await fetch(`https://price.jup.ag/v6/price?ids=${TOKEN_MINT}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const jupData = await response.json();
      const price = jupData.data[TOKEN_MINT]?.price?.toFixed(6) || "N/A";
      const marketCap = price !== "N/A" ? (price * TOTAL_TOKEN_SUPPLY).toFixed(2) : "N/A";
      const fetchTime = performance.now() - startTime;
      console.log(`Fetched Jupiter data in ${fetchTime.toFixed(2)}ms:`, { price, marketCap });
      tokenInfoEl.innerHTML = `
        <p><strong>Price:</strong> \( {price !== "N/A" ? " \)" + price : price}</p>
        <p><strong>Market Cap:</strong> \( {marketCap !== "N/A" ? " \)" + marketCap : marketCap}</p>
        <p><strong>Mission:</strong> Fund conservation through community participation.</p>
        <p><strong>Track:</strong> <a href="https://birdeye.so/token/${TOKEN_MINT}?chain=solana" target="_blank">Birdeye</a></p>
        <button class="button" id="refresh-token">Refresh</button>
      `;
      return;
    }

    const birdeyeData = await response.json();
    const price = birdeyeData.data?.value?.toFixed(6) || "N/A";
    const liquidity = birdeyeData.data?.liquidity?.toFixed(2) || "N/A";
    const marketCap = price !== "N/A" ? (birdeyeData.data.value * TOTAL_TOKEN_SUPPLY).toFixed(2) : "N/A";
    const fetchTime = performance.now() - startTime;
    console.log(`Fetched Birdeye data in ${fetchTime.toFixed(2)}ms:`, { price, liquidity, marketCap });

    tokenInfoEl.innerHTML = `
      <p><strong>Price:</strong> \( {price !== "N/A" ? " \)" + price : price}</p>
      <p><strong>Liquidity:</strong> \( {liquidity !== "N/A" ? " \)" + liquidity : liquidity}</p>
      <p><strong>Market Cap:</strong> \( {marketCap !== "N/A" ? " \)" + marketCap : marketCap}</p>
      <p><strong>Mission:</strong> Fund conservation through community participation.</p>
      <p><strong>Track:</strong> <a href="https://birdeye.so/token/${TOKEN_MINT}?chain=solana" target="_blank">Birdeye</a></p>
      <button class="button" id="refresh-token">Refresh</button>
    `;
  } catch (error) {
    console.error(`Token data error after ${(performance.now() - startTime).toFixed(2)}ms:`, error);
    tokenInfoEl.innerHTML = `
      <p>Error fetching token data: ${error.message}. Please try again.</p>
      <button class="button" id="refresh-token">Refresh</button>
    `;
  }
}

/* ────────────────────── Wallet Connect ────────────────────── */
async function connectWallet() {
  if (!window.solana?.isPhantom && !window.solana?.isSolflare) {
    alert("Please install Phantom or Solflare wallet.");
    return;
  }
  try {
    await window.solana.connect();
    connectWalletBtn.textContent = "Connected";
    connectWalletBtn.disabled = true;
    walletStatusEl.textContent = `Connected: ${window.solana.publicKey.toBase58().slice(0,8)}...`;
    addTickBtn.disabled = false;
    updateBalanceInfo();
    fetchTickCount();
  } catch (err) {
    alert("Connection failed: " + err.message);
  }
}

/* ────────────────────── Balance (unchanged) ────────────────────── */
async function updateBalanceInfo() {
  console.log('Fetching balance data...');
  const startTime = performance.now();
  balanceInfoEl.innerHTML = `<p>Loading balance data... <span class="loader"></span></p><button class="button" id="refresh-balance">Refresh Balances</button>`;

  if ('solana' in window && window.solana.isConnected) {
    const provider = window.solana;
    const publicKey = new solanaWeb3.PublicKey(provider.publicKey.toString());
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // SOL balance
      const solBalance = await connection.getBalance(publicKey, { signal: controller.signal });
      const solFormatted = (solBalance / 1e9).toFixed(4);

      // $DIRA balance
      let diraFormatted = 0;
      try {
        const tokenAccount = await splToken.getAssociatedTokenAddress(
          new solanaWeb3.PublicKey(TOKEN_MINT),
          publicKey
        );
        const tokenInfo = await splToken.getAccount(connection, tokenAccount, 'confirmed');
        diraFormatted = (Number(tokenInfo.amount) / 1e9).toFixed(2); // 9 decimals
      } catch (e) {
        console.warn('No $DIRA token account:', e.message);
      }

      clearTimeout(timeoutId);
      const fetchTime = performance.now() - startTime;
      console.log(`Fetched balance data in ${fetchTime.toFixed(2)}ms:`, { solFormatted, diraFormatted });

      balanceInfoEl.innerHTML = `
        <p><strong>SOL Balance:</strong> ${solFormatted} SOL</p>
        <p><strong>\( DIRA Balance:</strong> \){diraFormatted} DIRA</p>
        <p>Hold $DIRA to support sea turtle conservation!</p>
        <button class="button" id="refresh-balance">Refresh Balances</button>
      `;
    } catch (error) {
      console.error(`Balance data error after ${(performance.now() - startTime).toFixed(2)}ms:`, error);
      balanceInfoEl.innerHTML = `
        <p>Error fetching balance data: ${error.message}. Please try again.</p>
        <button class="button" id="refresh-balance">Refresh Balances</button>
      `;
    }
  } else {
    balanceInfoEl.innerHTML = `
      <p>Connect wallet to view balances or claim a new one.</p>
      <button class="button" id="refresh-balance">Refresh Balances</button>
    `;
  }
}

/* ────────────────────── Turtle Ticks ────────────────────── */
async function fetchTickCount() {
  if (isFetchingTicks) return;
  isFetchingTicks = true;
  try {
    const receiverPubkey = new solanaWeb3.PublicKey(DONATION_RECEIVER);
    const ata = await splToken.getAssociatedTokenAddress(new solanaWeb3.PublicKey(TOKEN_MINT), receiverPubkey);
    const acc = await splToken.getAccount(connection, ata);
    totalTicks = Math.floor(Number(acc.amount) / 1e9);
    tickCountEl.textContent = totalTicks.toLocaleString();
  } catch (err) {
    console.warn("Tick fetch failed:", err);
  }
  isFetchingTicks = false;
}

/* ────────────────────── Add Tick (Donate) ────────────────────── */
addTickBtn.onclick = async () => {
  const amount = parseFloat(donateAmountInput.value);
  if (!amount || amount <= 0) return alert("Enter a valid $DIRA amount");

  if (!window.solana?.isConnected) return alert("Connect wallet first");

  try {
    const fromPubkey = window.solana.publicKey;
    const fromATA = await splToken.getAssociatedTokenAddress(new solanaWeb3.PublicKey(TOKEN_MINT), fromPubkey);
    const toATA = await splToken.getAssociatedTokenAddress(new solanaWeb3.PublicKey(TOKEN_MINT), new solanaWeb3.PublicKey(DONATION_RECEIVER));

    const tx = new solanaWeb3.Transaction().add(
      splToken.createTransferInstruction(
        fromATA,
        toATA,
        fromPubkey,
        Math.floor(amount * 1e9),
        []
      )
    );

    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = fromPubkey;

    const signed = await window.solana.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig);

    alert(`Donated ${amount} \( DIRA! Tx: \){sig.slice(0,8)}...`);
    totalTicks += Math.floor(amount);
    tickCountEl.textContent = totalTicks.toLocaleString();
    launchConfetti();
    updateBalanceInfo();
  } catch (err) {
    alert("Donation failed: " + err.message);
  }
};

/* ────────────────────── Confetti ────────────────────── */
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#26a69a', '#f4a261', '#e9c46a', '#e76f51'];
  const pieces = [];
  for (let i = 0; i < 150; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 60
    });
  }

  let frame = 0;
  const animate = () => {
    if (frame++ > 80) {
      document.body.removeChild(canvas);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.life--;
      ctx.globalAlpha = p.life / 60;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    requestAnimationFrame(animate);
  };
  animate();
}

/* ────────────────────── Events ────────────────────── */
document.body.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.id === 'refresh-token') updateTokenInfo();
  if (btn.id === 'connect-wallet-btn') connectWallet();
  if (btn.id === 'refresh-balance') updateBalanceInfo();
});

/* ────────────────────── Init ────────────────────── */
window.addEventListener('load', () => {
  updateTokenInfo();
  if (window.solana?.isConnected) connectWallet();
  fetchTickCount();
  setInterval(fetchTickCount, 30000);
});