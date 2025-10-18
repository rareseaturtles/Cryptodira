const { Keypair, PublicKey, Connection, Transaction } = solanaWeb3;
const { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } = splToken;

const tokenInfoEl = document.getElementById("token-info");
const darkModeToggle = document.getElementById("darkModeToggle");
const walletSectionEl = document.getElementById("wallet-section");
const balanceInfoEl = document.getElementById("balance-info");
const claimWalletBtn = document.getElementById("claim-wallet-btn");
const connectWalletBtn = document.getElementById("connect-wallet-btn");
const donateBtn = document.getElementById("donate-btn");
const donateAmountInput = document.getElementById("donate-amount");
const walletModal = document.getElementById("wallet-modal");
const modalPublicKey = document.getElementById("modal-public-key");
const modalSecretKey = document.getElementById("modal-secret-key");
const copyPublicBtn = document.getElementById("copy-public-btn");
const copySecretBtn = document.getElementById("copy-secret-btn");
const tryAgainBtn = document.getElementById("try-again-btn");
const modalClose = document.getElementById("modal-close");
const vanityWarningEl = document.getElementById("vanity-warning");

const BIRDEYE_API_KEY = "0d4d8f6a8444446cb233b2f2e933d6db";
const TOTAL_TOKEN_SUPPLY = 4880000;
const CDCF_WALLET = "293Py67fg8fNYMt1USR6Vb5pkG1Wxp5ehaSAPQvBYsJy";
const TOKEN_MINT = "53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8";
const RPC_ENDPOINTS = [
  "https://rpc.ankr.com/solana",
  "https://api.mainnet-beta.solana.com",
  "https://solana-mainnet.g.alchemy.com/v2/demo"
];
const connection = new Connection(RPC_ENDPOINTS[0], "confirmed");

document.body.addEventListener("click", (e) => {
  const button = e.target.closest(".button, #darkModeToggle, #claim-wallet-btn, #connect-wallet-btn, #donate-btn, #refresh-balance, #copy-public-btn, #copy-secret-btn, #try-again-btn, #modal-close");
  if (button) {
    const id = button.id || button.textContent;
    console.log(`Button clicked: ${id}`);
    if (button.id === "refresh-token") debounceUpdateTokenInfo();
    else if (button.id === "claim-wallet-btn") generateVanityWallet();
    else if (button.id === "connect-wallet-btn") connectWallet();
    else if (button.id === "donate-btn") donateDIRA();
    else if (button.id === "refresh-balance") debounceUpdateBalanceInfo();
    else if (button.id === "copy-public-btn") copyText(modalPublicKey.value);
    else if (button.id === "copy-secret-btn") copyText(modalSecretKey.value);
    else if (button.id === "try-again-btn") {
      claimWalletBtn.innerHTML = 'Generating DIRA wallet... <span class="loader"></span>';
      generateVanityWallet();
    }
    else if (button.id === "modal-close") {
      console.log("Closing modal");
      walletModal.style.display = "none";
    }
    else if (button.href) window.open(button.href, "_blank");
  }
});

walletModal.addEventListener("click", (e) => {
  if (e.target === walletModal) {
    console.log("Closing modal via overlay click");
    walletModal.style.display = "none";
  }
});

darkModeToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  console.log("Button clicked: darkModeToggle");
  document.body.classList.toggle("dark-mode");
  darkModeToggle.textContent = document.body.classList.contains("dark-mode") ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode") ? "enabled" : "disabled");
});

if (localStorage.getItem("darkMode") === "enabled") {
  document.body.classList.add("dark-mode");
  darkModeToggle.textContent = "☀️ Light Mode";
}

let isFetchingTokenData = false;
function debounceUpdateTokenInfo() {
  if (isFetchingTokenData) {
    console.log("Token refresh debounced");
    return;
  }
  isFetchingTokenData = true;
  setTimeout(() => { isFetchingTokenData = false; }, 2000);
  updateTokenInfo();
}

let isFetchingBalanceData = false;
function debounceUpdateBalanceInfo() {
  if (isFetchingBalanceData) {
    console.log("Balance refresh debounced");
    return;
  }
  isFetchingBalanceData = true;
  setTimeout(() => { isFetchingBalanceData = false; }, 2000);
  updateBalanceInfo();
}

async function updateTokenInfo() {
  console.log("Fetching token data...");
  const startTime = performance.now();
  tokenInfoEl.innerHTML = `<p>Loading token data... <span class="loader"></span></p><button class="button" id="refresh-token">Refresh</button>`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    let response = await fetch(`https://public-api.birdeye.so/public/price?address=${TOKEN_MINT}`, {
      headers: { "X-API-KEY": BIRDEYE_API_KEY, "x-chain": "solana" },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.warn("Birdeye API failed, trying Jupiter...");
      response = await fetch(`https://price.jup.ag/v6/price?ids=${TOKEN_MINT}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const jupData = await response.json();
      const price = jupData.data[TOKEN_MINT]?.price?.toFixed(6) || "N/A";
      const marketCap = price !== "N/A" ? (price * TOTAL_TOKEN_SUPPLY).toFixed(2) : "N/A";
      const fetchTime = performance.now() - startTime;
      console.log(`Fetched Jupiter data in ${fetchTime.toFixed(2)}ms:`, { price, marketCap });
      tokenInfoEl.innerHTML = `
        <p><strong>Price:</strong> ${price !== "N/A" ? "$" + price : price}</p>
        <p><strong>Market Cap:</strong> ${marketCap !== "N/A" ? "$" + marketCap : marketCap}</p>
        <p><strong>Mission:</strong> Fund conservation through community participation.</p>
        <p><strong>Track:</strong> <a href="https://birdeye.so/token/${TOKEN_MINT}?chain=solana" target="_blank">Birdeye</a></p>
        <button class="button" id="refresh-token">Refresh</button>
      `;
      return;
    }
    const birdeyeData = await response.json();
    const price = birdeyeData.data?.value?.toFixed(6) || "N/A";
    const liquidity = birdeyeData.data?.liquidity?.toFixed(2) || "N/A";
    const marketCap = price !== "N/A" ? (price * TOTAL_TOKEN_SUPPLY).toFixed(2) : "N/A";
    const fetchTime = performance.now() - startTime;
    console.log(`Fetched Birdeye data in ${fetchTime.toFixed(2)}ms:`, { price, liquidity, marketCap });
    tokenInfoEl.innerHTML = `
      <p><strong>Price:</strong> ${price !== "N/A" ? "$" + price : price}</p>
      <p><strong>Liquidity:</strong> ${liquidity !== "N/A" ? "$" + liquidity : liquidity}</p>
      <p><strong>Market Cap:</strong> ${marketCap !== "N/A" ? "$" + marketCap : marketCap}</p>
      <p><strong>Mission:</strong> Fund conservation through community participation.</p>
      <p><strong>Track:</strong> <a href="https://birdeye.so/token/${TOKEN_MINT}?chain=solana" target="_blank">Birdeye</a></p>
      <button class="button" id="refresh-token">Refresh</button>
    `;
  } catch (error) {
    console.error(`Token data error after ${(performance.now() - startTime).toFixed(2)}ms:`, error);
    tokenInfoEl.innerHTML = `
      <p>Error fetching token data: ${error.message}. Please try again or check API key at birdeye.so/api-key.</p>
      <button class="button" id="refresh-token">Refresh</button>
    `;
  }
}

async function generateVanityWallet() {
  if (!window.solanaWeb3) {
    console.error("solanaWeb3 not loaded");
    alert("Error: Wallet generation library failed to load. Please refresh the page.");
    claimWalletBtn.innerHTML = "Claim New Wallet";
    claimWalletBtn.disabled = false;
    return;
  }
  claimWalletBtn.disabled = true;
  claimWalletBtn.innerHTML = 'Generating DIRA wallet... <span class="loader"></span>';
  vanityWarningEl.style.display = "none";
  try {
    const startTime = performance.now();
    const timeout = 4000;
    let keypair = solanaWeb3.Keypair.generate();
    let publicKeyStr = keypair.publicKey.toString();
    while (!publicKeyStr.toLowerCase().startsWith("dira")) {
      if (performance.now() - startTime > timeout) {
        console.warn("Vanity timeout, using random wallet");
        vanityWarningEl.style.display = "block";
        break;
      }
      keypair = solanaWeb3.Keypair.generate();
      publicKeyStr = keypair.publicKey.toString();
    }
    modalPublicKey.value = publicKeyStr;
    modalSecretKey.value = Array.from(keypair.secretKey).join(",");
    walletModal.style.display = "flex";
    claimWalletBtn.innerHTML = "Claim New Wallet";
    claimWalletBtn.disabled = false;
    const duration = (performance.now() - startTime) / 1000;
    console.log(`Wallet generated in ${duration.toFixed(2)}s:`, { publicKey: publicKeyStr, isVanity: publicKeyStr.toLowerCase().startsWith("dira") });
    alert("New wallet created! Copy keys from the pop-up, import to Phantom/Solflare, fund with ~0.01 SOL and $DIRA on Jupiter to donate. WARNING: Save OFFLINE on paper. Do NOT share. We can’t recover lost keys.");
  } catch (error) {
    console.error("Wallet generation error:", error);
    alert("Failed to generate wallet: " + error.message);
    claimWalletBtn.innerHTML = "Claim New Wallet";
    claimWalletBtn.disabled = false;
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert("Copied to clipboard!");
  }).catch((err) => {
    console.error("Copy failed:", err);
    alert("Copy failed. Manually copy the text.");
  });
}

async function connectWallet() {
  if (!window.solanaWeb3) {
    console.error("solanaWeb3 not loaded");
    alert("Error: Wallet connection library failed to load. Please refresh the page.");
    return;
  }
  if ("solana" in window) {
    const provider = window.solana;
    try {
      await provider.connect();
      connectWalletBtn.textContent = "Wallet Connected";
      connectWalletBtn.disabled = true;
      updateBalanceInfo();
    } catch (error) {
      console.error("Wallet connection error:", error);
      alert("Wallet connection failed: " + error.message);
    }
  } else {
    alert("Please install Phantom or Solflare wallet extension.");
  }
}

async function updateBalanceInfo() {
  if (!window.splToken) {
    console.error("splToken not loaded");
    alert("Error: Balance library failed to load. Please refresh the page.");
    return;
  }
  console.log("Fetching balance data...");
  const startTime = performance.now();
  balanceInfoEl.innerHTML = `<p>Loading balance data... <span class="loader"></span></p><button class="button" id="refresh-balance">Refresh Balances</button>`;
  if ("solana" in window && window.solana.isConnected) {
    const provider = window.solana;
    const publicKey = new PublicKey(provider.publicKey.toString());
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const solBalance = await connection.getBalance(publicKey, { signal: controller.signal });
      const solFormatted = (solBalance / 1e9).toFixed(4);
      let diraFormatted = 0;
      try {
        const tokenAccount = await getAssociatedTokenAddress(new PublicKey(TOKEN_MINT), publicKey);
        const tokenInfo = await splToken.getAccount(connection, tokenAccount, "confirmed", { signal: controller.signal });
        diraFormatted = (Number(tokenInfo.amount) / 1e9).toFixed(2);
      } catch (e) {
        console.warn("No $DIRA token account:", e.message);
      }
      clearTimeout(timeoutId);
      const fetchTime = performance.now() - startTime;
      console.log(`Fetched balance data in ${fetchTime.toFixed(2)}ms:`, { solFormatted, diraFormatted });
      balanceInfoEl.innerHTML = `
        <p><strong>SOL Balance:</strong> ${solFormatted} SOL</p>
        <p><strong>$DIRA Balance:</strong> ${diraFormatted} DIRA</p>
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

async function donateDIRA() {
  if (!window.splToken) {
    console.error("splToken not loaded");
    alert("Error: Donation library failed to load. Please refresh the page.");
    return;
  }
  const amount = parseFloat(donateAmountInput.value);
  if (!amount || amount <= 0) {
    alert("Please enter a valid $DIRA amount (e.g., 100).");
    return;
  }
  if ("solana" in window && window.solana.isConnected) {
    const provider = window.solana;
    const publicKey = new PublicKey(provider.publicKey.toString());
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const sourceAccount = await getAssociatedTokenAddress(new PublicKey(TOKEN_MINT), publicKey);
      const recipientAccount = await getAssociatedTokenAddress(new PublicKey(CDCF_WALLET), new PublicKey(CDCF_WALLET));
      const transaction = new Transaction().add(
        createTransferInstruction(sourceAccount, recipientAccount, publicKey, Math.floor(amount * 1e9), [], TOKEN_PROGRAM_ID)
      );
      const { blockhash } = await connection.getLatestBlockhash({ signal: controller.signal });
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      const signed = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), { signal: controller.signal });
      await connection.confirmTransaction(signature, "confirmed");
      clearTimeout(timeoutId);
      alert(`Successfully donated ${amount} $DIRA to CDCF! Transaction ID: ${signature}`);
      console.log("Donation successful:", { signature, amount });
      updateBalanceInfo();
    } catch (error) {
      console.error("Donation error:", error);
      alert(`Donation failed: ${error.message}`);
    }
  } else {
    alert("Please connect your wallet first (e.g., Phantom or Solflare).");
  }
}

window.addEventListener("load", () => {
  if (!window.solanaWeb3 || !window.splToken) {
    console.error("Required libraries not loaded on page load");
    tokenInfoEl.innerHTML = `<p>Error: Required libraries failed to load. Please refresh the page.</p><button class="button" id="refresh-token">Refresh</button>`;
    return;
  }
  updateTokenInfo();
});@keyframes waveMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(-50%, 50%); }
}
header h1 {
  font-size: 3rem;
  color: #0d4536;
  margin: 1rem 0;
  text-shadow: 2px 2px 6px rgba(13, 69, 54, 0.4);
  font-family: 'Roboto', sans-serif;
  position: relative;
  z-index: 10;
  pointer-events: none;
}
header p {
  font-size: 1.375rem;
  color: #0d4536;
  margin: 0;
  position: relative;
  z-index: 10;
  pointer-events: none;
}
.logo {
  width: 10rem;
  height: auto;
  border-radius: 1rem;
  border: 4px solid #0d4536;
  margin: 1.25rem auto;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  z-index: 10;
  animation: float 2s infinite ease-in-out;
}
.logo:hover {
  transform: scale(1.1) rotate(3deg);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.content {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  padding: 2rem;
  margin: 6rem 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  max-width: 60rem;
  width: 90%;
  border: 2px solid rgba(38, 166, 154, 0.5);
  text-align: center;
  animation: fadeIn 0.5s ease-out;
  z-index: 5;
}
@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
.content h2, .content h3 {
  color: #0d4536;
  margin-bottom: 1.5rem;
  font-family: 'Roboto', sans-serif;
  position: relative;
  padding-bottom: 0.5rem;
  z-index: 10;
  pointer-events: none;
}
.content h2::after, .content h3::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 3rem;
  height: 2px;
  background: #26a69a;
  transition: width 0.3s ease;
}
.content h2:hover::after, .content h3:hover::after { width: 6rem; }
.content p {
  font-size: 1.125rem;
  color: #37474f;
  margin-bottom: 1.5rem;
  z-index: 10;
  pointer-events: none;
}
.buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  margin: 2rem 0;
  z-index: 10;
  position: relative;
  pointer-events: none;
}
.button {
  padding: 0.75rem 1.5rem;
  font-size: 1.125rem;
  color: #fff;
  background: linear-gradient(135deg, #26a69a, #00695c);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  text-decoration: none;
  min-width: 12.5rem;
  position: relative;
  overflow: hidden;
  z-index: 10;
  pointer-events: auto;
}
.button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.6s ease, height 0.6s ease;
}
.button:hover::before { width: 20rem; height: 20rem; }
.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
  background: linear-gradient(135deg, #00695c, #003d33);
}
#token-info, #balance-info, #impact-tracker {
  font-size: 1.125rem;
  color: #0d4536;
  z-index: 10;
  position: relative;
  pointer-events: auto;
}
#donate-section {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}
#donate-amount {
  padding: 0.75rem;
  font-size: 1.125rem;
  color: #37474f;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #26a69a;
  border-radius: 0.5rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}
#donate-amount:focus {
  outline: none;
  border-color: #00695c;
  box-shadow: 0 0 8px rgba(0, 105, 92, 0.3);
}
#darkModeToggle {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 100;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: #fff;
  color: #0d4536;
  border: 1px solid #26a69a;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  pointer-events: auto;
}
#darkModeToggle:hover {
  background: #e0f7fa;
  transform: scale(1.05);
}
.loader {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid #26a69a;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.featured-nft {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: rgba(178, 223, 219, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 1rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.5s ease-out;
  text-align: center;
}
.featured-nft img {
  max-width: 15rem;
  height: auto;
  border: 2px solid #26a69a;
  border-radius: 0.5rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
  z-index: 10;
  pointer-events: auto;
}
.featured-nft img:hover { transform: scale(1.05); }
.roadmap, .impact-tracker {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: rgba(178, 223, 219, 0.4);
  backdrop-filter: blur(5px);
  border-radius: 1rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.5s ease-out;
}
.roadmap ul {
  list-style: none;
  padding: 0;
  text-align: left;
  z-index: 10;
  pointer-events: none;
}
.roadmap li {
  margin: 1.25rem 0;
  font-size: 1.125rem;
  color: #0d4536;
  position: relative;
  padding-left: 2rem;
  opacity: 0;
  animation: slideIn 0.5s ease-out forwards;
  animation-delay: calc(var(--order) * 0.2s);
  pointer-events: none;
}
.roadmap li::before {
  content: "✔";
  color: #26a69a;
  position: absolute;
  left: 0;
  font-weight: bold;
}
.roadmap li.in-progress::before { content: "▶"; color: #ffca28; }
.roadmap li.future::before { content: "○"; color: #b0bec5; }
@keyframes slideIn {
  0% { opacity: 0; transform: translateX(-20px); }
  100% { opacity: 1; transform: translateX(0); }
}
footer {
  background: linear-gradient(135deg, #0d4536, #003d33);
  color: #fff;
  text-align: center;
  padding: 1rem 0;
  width: 100%;
  margin-top: 2rem;
  box-shadow: 0 -3px 10px rgba(0, 0, 0, 0.2);
  animation: fadeIn 0.5s ease-out 0.4s backwards;
  z-index: 5;
}
.warning {
  color: #ff0000;
  font-weight: bold;
  margin-top: 1rem;
}
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  justify-content: center;
  align-items: center;
  animation: fadeIn 0.3s ease-out;
}
.modal-content {
  background: linear-gradient(135deg, #e0f7fa, #b2dfdb);
  padding: 2rem;
  border-radius: 1rem;
  border: 2px solid #26a69a;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  max-width: 90%;
  width: 30rem;
  text-align: center;
  position: relative;
  z-index: 1001;
  animation: scaleIn 0.3s ease-out;
}
@keyframes scaleIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.modal-content h3 {
  color: #0d4536;
  font-family: 'Roboto', sans-serif;
  margin-bottom: 1rem;
}
.modal-content p {
  font-size: 1rem;
  color: #37474f;
  margin: 0.5rem 0;
}
.modal-content textarea {
  width: 100%;
  min-height: 3rem;
  resize: none;
  padding: 0.5rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #37474f;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #26a69a;
  border-radius: 0.5rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  margin-bottom: 0.5rem;
}
.modal-content textarea:focus {
  outline: none;
  border-color: #00695c;
  box-shadow: 0 0 8px rgba(0, 105, 92, 0.3);
}
.modal-content .button {
  margin: 0.5rem 0;
  width: 100%;
}
.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 1.5rem;
  color: #0d4536;
  cursor: pointer;
  transition: color 0.3s ease;
  z-index: 1002;
  pointer-events: auto;
}
.modal-close:hover { color: #26a69a; }
@media (max-width: 600px) {
  header h1 { font-size: 2rem; }
  .content { padding: 1rem; margin: 4rem 0.75rem; width: 95%; }
  .button { padding: 0.5rem 1rem; font-size: 1rem; min-width: 8.75rem; }
  .buttons { gap: 0.75rem; }
  .logo { width: 7.5rem; }
  .featured-nft img { max-width: 9.375rem; }
  #darkModeToggle { top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.75rem; font-size: 0.875rem; }
  #donate-amount { width: 8.75rem; }
  .modal-content { padding: 1.5rem; width: 95%; }
}
