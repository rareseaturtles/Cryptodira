const { Keypair, PublicKey, Connection, Transaction } = solanaWeb3;
const { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } = splToken;
const { generateMnemonic, mnemonicToSeed } = bip39;
const bs58 = window.bs58;

const tokenInfoEl = document.getElementById("token-info");
const darkModeToggle = document.getElementById('darkModeToggle');
const walletSectionEl = document.getElementById('wallet-section');
const balanceInfoEl = document.getElementById('balance-info');
const claimWalletBtn = document.getElementById('claim-wallet-btn');
const connectWalletBtn = document.getElementById('connect-wallet-btn');
const donateBtn = document.getElementById('donate-btn');
const donateAmountInput = document.getElementById('donate-amount');
const walletModal = document.getElementById('wallet-modal');
const modalPublicKey = document.getElementById('modal-public-key');
const modalSeedPhrase = document.getElementById('modal-seed-phrase');
const copyPublicBtn = document.getElementById('copy-public-btn');
const copySeedBtn = document.getElementById('copy-seed-btn');
const revealPrivateBtn = document.getElementById('reveal-private-btn');
const modalPrivateKey = document.getElementById('modal-private-key');
const modalPrivateKeyText = document.getElementById('modal-private-key-text');
const copyPrivateBtn = document.getElementById('copy-private-btn');
const tryAgainBtn = document.getElementById('try-again-btn');
const modalClose = document.getElementById('modal-close');
const vanityWarningEl = document.getElementById('vanity-warning');

const BIRDEYE_API_KEY = "0d4d8f6a8444446cb233b2f2e933d6db"; // Replace if expired
const TOTAL_TOKEN_SUPPLY = 4880000;
const CDCF_WALLET = "293Py67fg8fNYMt1USR6Vb5pkG1Wxp5ehaSAPQvBYsJy";
const TOKEN_MINT = "53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8";
const RPC_ENDPOINTS = [
  "https://rpc.ankr.com/solana",
  "https://api.mainnet-beta.solana.com",
  "https://solana-mainnet.g.alchemy.com/v2/demo"
];
const connection = new Connection(RPC_ENDPOINTS[0], 'confirmed');

document.body.addEventListener('click', (e) => {
  const button = e.target.closest('.button, #darkModeToggle, #claim-wallet-btn, #connect-wallet-btn, #donate-btn, #refresh-balance, #copy-public-btn, #copy-seed-btn, #reveal-private-btn, #copy-private-btn, #try-again-btn, #modal-close');
  if (button) {
    const id = button.id || button.textContent;
    console.log(`Button clicked: ${id}`);
    if (button.id === 'refresh-token') debounceUpdateTokenInfo();
    else if (button.id === 'claim-wallet-btn') generateVanityWallet();
    else if (button.id === 'connect-wallet-btn') connectWallet();
    else if (button.id === 'donate-btn') donateDIRA();
    else if (button.id === 'refresh-balance') debounceUpdateBalanceInfo();
    else if (button.id === 'copy-public-btn') copyText(modalPublicKey.value);
    else if (button.id === 'copy-seed-btn') copyText(modalSeedPhrase.value);
    else if (button.id === 'reveal-private-btn') {
      modalPrivateKey.style.display = 'block';
      modalPrivateKeyText.style.display = 'block';
      copyPrivateBtn.style.display = 'block';
      revealPrivateBtn.style.display = 'none';
    }
    else if (button.id === 'copy-private-btn') copyText(modalPrivateKeyText.value);
    else if (button.id === 'try-again-btn') {
      claimWalletBtn.innerHTML = 'Generating DIRA wallet... <span class="loader"></span>';
      generateVanityWallet();
    }
    else if (button.id === 'modal-close') {
      console.log('Closing modal');
      walletModal.style.display = 'none';
      modalPrivateKey.style.display = 'none';
      modalPrivateKeyText.style.display = 'none';
      copyPrivateBtn.style.display = 'none';
      revealPrivateBtn.style.display = 'block';
    }
    else if (button.href) window.open(button.href, '_blank');
  }
});

walletModal.addEventListener('click', (e) => {
  if (e.target === walletModal) {
    console.log('Closing modal via overlay click');
    walletModal.style.display = 'none';
    modalPrivateKey.style.display = 'none';
    modalPrivateKeyText.style.display = 'none';
    copyPrivateBtn.style.display = 'none';
    revealPrivateBtn.style.display = 'block';
  }
});

darkModeToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  console.log('Button clicked: darkModeToggle');
  document.body.classList.toggle('dark-mode');
  darkModeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️ Light Mode' : '🌙 Dark Mode';
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
});

if (localStorage.getItem('darkMode') === 'enabled') {
  document.body.classList.add('dark-mode');
  darkModeToggle.textContent = '☀️ Light Mode';
}

let isFetchingTokenData = false;
function debounceUpdateTokenInfo() {
  if (isFetchingTokenData) {
    console.log('Token refresh debounced');
    return;
  }
  isFetchingTokenData = true;
  setTimeout(() => { isFetchingTokenData = false; }, 2000);
  updateTokenInfo();
}

let isFetchingBalanceData = false;
function debounceUpdateBalanceInfo() {
  if (isFetchingBalanceData) {
    console.log('Balance refresh debounced');
    return;
  }
  isFetchingBalanceData = true;
  setTimeout(() => { isFetchingBalanceData = false; }, 2000);
  updateBalanceInfo();
}

async function updateTokenInfo() {
  console.log('Fetching token data...');
  const startTime = performance.now();
  tokenInfoEl.innerHTML = `<p>Loading token data... <span class="loader"></span></p><button class="button" id="refresh-token">Refresh</button>`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    let response = await fetch(`https://public-api.birdeye.so/defi/price?address=${TOKEN_MINT}&check_liquidity=100&include_liquidity=true`, {
      headers: { "X-API-KEY": BIRDEYE_API_KEY, "x-chain": "solana", "accept": "application/json" },
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
    const marketCap = price !== "N/A" ? (birdeyeData.data.value * TOTAL_TOKEN_SUPPLY).toFixed(2) : "N/A";
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
      <p>Error fetching token data: ${error.message}. Please try again.</p>
      <button class="button" id="refresh-token">Refresh</button>
    `;
  }
}

async function generateVanityWallet() {
  claimWalletBtn.disabled = true;
  claimWalletBtn.innerHTML = 'Generating DIRA wallet... <span class="loader"></span>';
  vanityWarningEl.style.display = 'none';
  modalPrivateKey.style.display = 'none';
  modalPrivateKeyText.style.display = 'none';
  copyPrivateBtn.style.display = 'none';
  revealPrivateBtn.style.display = 'block';
  const startTime = performance.now();
  const timeout = 4000;
  let mnemonic = generateMnemonic();
  let seed = await mnemonicToSeed(mnemonic);
  let keypair = Keypair.fromSeed(seed.slice(0, 32));
  let publicKeyStr = keypair.publicKey.toString();
  let privateKeyBs58 = bs58.encode(keypair.secretKey);
  let foundVanity = false;
  while (performance.now() - startTime < timeout) {
    if (publicKeyStr.startsWith('DIRA')) {
      foundVanity = true;
      break;
    }
    mnemonic = generateMnemonic();
    seed = await mnemonicToSeed(mnemonic);
    keypair = Keypair.fromSeed(seed.slice(0, 32));
    publicKeyStr = keypair.publicKey.toString();
    privateKeyBs58 = bs58.encode(keypair.secretKey);
  }
  if (!foundVanity) {
    console.warn('Vanity timeout, using random wallet');
    vanityWarningEl.style.display = 'block';
  }
  modalPublicKey.value = publicKeyStr;
  modalSeedPhrase.value = mnemonic;
  modalPrivateKeyText.value = privateKeyBs58;
  walletModal.style.display = 'flex';
  claimWalletBtn.innerHTML = 'Claim New Wallet';
  claimWalletBtn.disabled = false;
  const duration = (performance.now() - startTime) / 1000;
  console.log(`Wallet generated in ${duration.toFixed(2)}s:`, { publicKey: publicKeyStr, mnemonic, isVanity: foundVanity });
  alert('New wallet created! Copy seed phrase from the pop-up, import to Phantom/Solflare, fund with ~0.01 SOL and $DIRA on Jupiter to donate. WARNING: Save OFFLINE on paper. Do NOT share. We can’t recover lost wallets.');
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied to clipboard!');
  }).catch(err => {
    console.error('Copy failed:', err);
    alert('Copy failed. Manually copy the text.');
  });
}

async function connectWallet() {
  if ('solana' in window) {
    const provider = window.solana;
    try {
      await provider.connect();
      connectWalletBtn.textContent = 'Wallet Connected';
      connectWalletBtn.disabled = true;
      updateBalanceInfo();
    } catch (error) {
      console.error('Wallet connection error:', error);
      alert('Wallet connection failed: ' + error.message);
    }
  } else {
    alert('Please install Phantom or Solflare wallet extension.');
  }
}

async function updateBalanceInfo() {
  console.log('Fetching balance data...');
  const startTime = performance.now();
  balanceInfoEl.innerHTML = `<p>Loading balance data... <span class="loader"></span></p><button class="button" id="refresh-balance">Refresh Balances</button>`;
  if ('solana' in window && window.solana.isConnected) {
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
        const tokenInfo = await splToken.getAccount(connection, tokenAccount, 'confirmed', { signal: controller.signal });
        diraFormatted = (Number(tokenInfo.amount) / 1e9).toFixed(2);
      } catch (e) {
        console.warn('No $DIRA token account:', e.message);
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
  const amount = parseFloat(donateAmountInput.value);
  if (!amount || amount <= 0) {
    alert('Please enter a valid $DIRA amount (e.g., 100).');
    return;
  }
  if ('solana' in window && window.solana.isConnected) {
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
      await connection.confirmTransaction(signature, 'confirmed');
      clearTimeout(timeoutId);
      alert(`Successfully donated ${amount} $DIRA to CDCF! Transaction ID: ${signature}`);
      console.log('Donation successful:', { signature, amount });
      updateBalanceInfo();
    } catch (error) {
      console.error('Donation error:', error);
      alert(`Donation failed: ${error.message}`);
    }
  } else {
    alert('Please connect your wallet first (e.g., Phantom or Solflare).');
  }
}

window.addEventListener('load', () => {
  updateTokenInfo();
});      revealPrivateBtn.style.display = 'block';
    }
    else if (button.href) window.open(button.href, '_blank');
  }
});

// Close modal on overlay click
walletModal.addEventListener('click', (e) => {
  if (e.target === walletModal) {
    console.log('Closing modal via overlay click');
    walletModal.style.display = 'none';
    modalPrivateKey.style.display = 'none';
    copyPrivateBtn.style.display = 'none';
    revealPrivateBtn.style.display = 'block';
  }
});

// Dark mode toggle
darkModeToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  console.log('Button clicked: darkModeToggle');
  document.body.classList.toggle('dark-mode');
  if (document.body.classList.contains('dark-mode')) {
    darkModeToggle.textContent = '☀️ Light Mode';
    localStorage.setItem('darkMode', 'enabled');
  } else {
    darkModeToggle.textContent = '🌙 Dark Mode';
    localStorage.setItem('darkMode', 'disabled');
  }
});

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'enabled') {
  document.body.classList.add('dark-mode');
  darkModeToggle.textContent = '☀️ Light Mode';
}

// Debounce functions
let isFetchingTokenData = false;
function debounceUpdateTokenInfo() {
  if (isFetchingTokenData) {
    console.log('Token refresh debounced');
    return;
  }
  isFetchingTokenData = true;
  setTimeout(() => { isFetchingTokenData = false; }, 2000);
  updateTokenInfo();
}

let isFetchingBalanceData = false;
function debounceUpdateBalanceInfo() {
  if (isFetchingBalanceData) {
    console.log('Balance refresh debounced');
    return;
  }
  isFetchingBalanceData = true;
  setTimeout(() => { isFetchingBalanceData = false; }, 2000);
  updateBalanceInfo();
}

// Token info fetch
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
    const marketCap = price !== "N/A" ? (birdeyeData.data.value * TOTAL_TOKEN_SUPPLY).toFixed(2) : "N/A";
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
      <p>Error fetching token data: ${error.message}. Please try again.</p>
      <button class="button" id="refresh-token">Refresh</button>
    `;
  }
}

// Vanity wallet generation with mnemonic
async function generateVanityWallet() {
  claimWalletBtn.disabled = true;
  claimWalletBtn.innerHTML = 'Generating DIRA wallet... <span class="loader"></span>';
  vanityWarningEl.style.display = 'none';
  modalPrivateKey.style.display = 'none';
  copyPrivateBtn.style.display = 'none';
  revealPrivateBtn.style.display = 'block';

  const startTime = performance.now();
  const timeout = 3000; // 3 seconds
  let mnemonic = generateMnemonic();
  let keypair;
  let publicKeyStr;
  let privateKeyBs58;
  let foundVanity = false;

  // Try for DIRA prefix (case-sensitive)
  while (performance.now() - startTime < timeout) {
    mnemonic = generateMnemonic();
    const seed = await mnemonicToSeed(mnemonic);
    keypair = Keypair.fromSeed(seed.slice(0, 32));
    publicKeyStr = keypair.publicKey.toString();
    if (publicKeyStr.startsWith('DIRA')) {
      foundVanity = true;
      break;
    }
  }

  if (!foundVanity) {
    console.warn('Vanity timeout, using random wallet');
    vanityWarningEl.style.display = 'block';
  }

  privateKeyBs58 = bs58.encode(keypair.secretKey);
  modalPublicKey.innerText = publicKeyStr;
  modalSeedPhrase.innerText = mnemonic;
  modalPrivateKeyText.innerText = privateKeyBs58;
  walletModal.style.display = 'flex';
  claimWalletBtn.innerHTML = 'Claim New Wallet';
  claimWalletBtn.disabled = false;

  const duration = (performance.now() - startTime) / 1000;
  console.log(`Wallet generated in ${duration.toFixed(2)}s:`, { publicKey: publicKeyStr, mnemonic, isVanity: foundVanity });
  alert('New wallet created! Copy seed phrase from the pop-up, import to Phantom/Solflare, fund with ~0.01 SOL and $DIRA on Jupiter to donate. WARNING: Save OFFLINE on paper. Do NOT share. We can’t recover lost wallets.');
}

// Copy text
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied to clipboard!');
  }).catch(err => {
    console.error('Copy failed:', err);
    alert('Copy failed. Manually copy the text.');
  });
}

// Connect wallet
async function connectWallet() {
  if ('solana' in window) {
    const provider = window.solana;
    try {
      await provider.connect();
      connectWalletBtn.textContent = 'Wallet Connected';
      connectWalletBtn.disabled = true;
      updateBalanceInfo();
    } catch (error) {
      console.error('Wallet connection error:', error);
      alert('Wallet connection failed: ' + error.message);
    }
  } else {
    alert('Please install Phantom or Solflare wallet extension.');
  }
}

// Balance fetching
async function updateBalanceInfo() {
  console.log('Fetching balance data...');
  const startTime = performance.now();
  balanceInfoEl.innerHTML = `<p>Loading balance data... <span class="loader"></span></p><button class="button" id="refresh-balance">Refresh Balances</button>`;

  if ('solana' in window && window.solana.isConnected) {
    const provider = window.solana;
    const publicKey = new PublicKey(provider.publicKey.toString());
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // SOL balance
      const solBalance = await connection.getBalance(publicKey, { signal: controller.signal });
      const solFormatted = (solBalance / 1e9).toFixed(4);

      // $DIRA balance
      let diraFormatted = 0;
      try {
        const tokenAccount = await getAssociatedTokenAddress(
          new PublicKey(TOKEN_MINT),
          publicKey
        );
        const tokenInfo = await splToken.getAccount(connection, tokenAccount, 'confirmed', { signal: controller.signal });
        diraFormatted = (Number(tokenInfo.amount) / 1e9).toFixed(2); // 9 decimals
      } catch (e) {
        console.warn('No $DIRA token account:', e.message);
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

// Donate $DIRA
async function donateDIRA() {
  const amount = parseFloat(donateAmountInput.value);
  if (!amount || amount <= 0) {
    alert('Please enter a valid $DIRA amount (e.g., 100).');
    return;
  }

  if ('solana' in window && window.solana.isConnected) {
    const provider = window.solana;
    const publicKey = new PublicKey(provider.publicKey.toString());
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const sourceAccount = await getAssociatedTokenAddress(
        new PublicKey(TOKEN_MINT),
        publicKey
      );
      const recipientAccount = await getAssociatedTokenAddress(
        new PublicKey(CDCF_WALLET),
        new PublicKey(CDCF_WALLET)
      );

      const transaction = new Transaction().add(
        createTransferInstruction(
          sourceAccount,
          recipientAccount,
          publicKey,
          Math.floor(amount * 1e9), // 9 decimals
          [],
          TOKEN_PROGRAM_ID
        )
      );

      const { blockhash } = await connection.getLatestBlockhash({ signal: controller.signal });
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signed = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), { signal: controller.signal });
      await connection.confirmTransaction(signature, 'confirmed');

      clearTimeout(timeoutId);
      alert(`Successfully donated ${amount} $DIRA to CDCF! Transaction ID: ${signature}`);
      console.log('Donation successful:', { signature, amount });
      updateBalanceInfo();
    } catch (error) {
      console.error('Donation error:', error);
      alert(`Donation failed: ${error.message}`);
    }
  } else {
    alert('Please connect your wallet first (e.g., Phantom or Solflare).');
  }
}

// Initialize
window.addEventListener('load', () => {
  updateTokenInfo();
});  } else {
    darkModeToggle.textContent = '🌙 Dark Mode';
    localStorage.setItem('darkMode', 'disabled');
  }
});

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'enabled') {
  document.body.classList.add('dark-mode');
  darkModeToggle.textContent = '☀️ Light Mode';
}

// Debounce functions
let isFetchingTokenData = false;
function debounceUpdateTokenInfo() {
  if (isFetchingTokenData) {
    console.log('Token refresh debounced');
    return;
  }
  isFetchingTokenData = true;
  setTimeout(() => { isFetchingTokenData = false; }, 2000);
  updateTokenInfo();
}

let isFetchingBalanceData = false;
function debounceUpdateBalanceInfo() {
  if (isFetchingBalanceData) {
    console.log('Balance refresh debounced');
    return;
  }
  isFetchingBalanceData = true;
  setTimeout(() => { isFetchingBalanceData = false; }, 2000);
  updateBalanceInfo();
}

// Token info fetch
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
    const marketCap = price !== "N/A" ? (birdeyeData.data.value * TOTAL_TOKEN_SUPPLY).toFixed(2) : "N/A";
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
      <p>Error fetching token data: ${error.message}. Please try again.</p>
      <button class="button" id="refresh-token">Refresh</button>
    `;
  }
}

// Vanity wallet generation
async function generateVanityWallet() {
  claimWalletBtn.disabled = true;
  claimWalletBtn.innerHTML = 'Generating DIRA wallet... <span class="loader"></span>';
  vanityWarningEl.style.display = 'none';

  const startTime = performance.now();
  const timeout = 3000; // 3 seconds
  let keypair = solanaWeb3.Keypair.generate();
  let publicKeyStr = keypair.publicKey.toString();
  let foundVanity = false;

  // Try for DIRA prefix (case-sensitive)
  while (performance.now() - startTime < timeout) {
    if (publicKeyStr.startsWith('DIRA')) {
      foundVanity = true;
      break;
    }
    keypair = solanaWeb3.Keypair.generate();
    publicKeyStr = keypair.publicKey.toString();
  }

  if (!foundVanity) {
    console.warn('Vanity timeout, using random wallet');
    vanityWarningEl.style.display = 'block';
  }

  modalPublicKey.innerText = publicKeyStr;
  modalSecretKey.innerText = Array.from(keypair.secretKey).join(',');
  walletModal.style.display = 'flex';
  claimWalletBtn.innerHTML = 'Claim New Wallet';
  claimWalletBtn.disabled = false;

  const duration = (performance.now() - startTime) / 1000;
  console.log(`Wallet generated in ${duration.toFixed(2)}s:`, { publicKey: publicKeyStr, isVanity: foundVanity });
  alert('New wallet created! Copy keys from the pop-up, import to Phantom/Solflare, fund with ~0.01 SOL and $DIRA on Jupiter to donate. WARNING: Save OFFLINE on paper. Do NOT share. We can’t recover lost keys.');
}

// Copy text
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied to clipboard!');
  }).catch(err => {
    console.error('Copy failed:', err);
    alert('Copy failed. Manually copy the text.');
  });
}

// Connect wallet
async function connectWallet() {
  if ('solana' in window) {
    const provider = window.solana;
    try {
      await provider.connect();
      connectWalletBtn.textContent = 'Wallet Connected';
      connectWalletBtn.disabled = true;
      updateBalanceInfo();
    } catch (error) {
      console.error('Wallet connection error:', error);
      alert('Wallet connection failed: ' + error.message);
    }
  } else {
    alert('Please install Phantom or Solflare wallet extension.');
  }
}

// Balance fetching
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
        const tokenInfo = await splToken.getAccount(connection, tokenAccount, 'confirmed', { signal: controller.signal });
        diraFormatted = (Number(tokenInfo.amount) / 1e9).toFixed(2); // 9 decimals
      } catch (e) {
        console.warn('No $DIRA token account:', e.message);
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

// Donate $DIRA
async function donateDIRA() {
  const amount = parseFloat(donateAmountInput.value);
  if (!amount || amount <= 0) {
    alert('Please enter a valid $DIRA amount (e.g., 100).');
    return;
  }

  if ('solana' in window && window.solana.isConnected) {
    const provider = window.solana;
    const publicKey = new solanaWeb3.PublicKey(provider.publicKey.toString());
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const sourceAccount = await splToken.getAssociatedTokenAddress(
        new solanaWeb3.PublicKey(TOKEN_MINT),
        publicKey
      );
      const recipientAccount = await splToken.getAssociatedTokenAddress(
        new solanaWeb3.PublicKey(CDCF_WALLET),
        new solanaWeb3.PublicKey(CDCF_WALLET)
      );

      const transaction = new solanaWeb3.Transaction().add(
        splToken.createTransferInstruction(
          sourceAccount,
          recipientAccount,
          publicKey,
          Math.floor(amount * 1e9), // 9 decimals
          [],
          splToken.TOKEN_PROGRAM_ID
        )
      );

      const { blockhash } = await connection.getLatestBlockhash({ signal: controller.signal });
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signed = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), { signal: controller.signal });
      await connection.confirmTransaction(signature, 'confirmed');

      clearTimeout(timeoutId);
      alert(`Successfully donated ${amount} $DIRA to CDCF! Transaction ID: ${signature}`);
      console.log('Donation successful:', { signature, amount });
      updateBalanceInfo();
    } catch (error) {
      console.error('Donation error:', error);
      alert(`Donation failed: ${error.message}`);
    }
  } else {
    alert('Please connect your wallet first (e.g., Phantom or Solflare).');
  }
}

// Initialize
window.addEventListener('load', () => {
  updateTokenInfo();
});
