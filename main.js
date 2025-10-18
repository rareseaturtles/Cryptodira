// DOM elements
const tokenInfoEl = document.getElementById("token-info");
const darkModeToggle = document.getElementById('darkModeToggle');
const walletSectionEl = document.getElementById('wallet-section');
const balanceInfoEl = document.getElementById('balance-info');
const createWalletBtn = document.getElementById('create-wallet-btn');
const connectWalletBtn = document.getElementById('connect-wallet-btn');
const donateBtn = document.getElementById('donate-btn');
const donateAmountInput = document.getElementById('donate-amount');

// Constants
const BIRDEYE_API_KEY = "0d4d8f6a8444446cb233b2f2e933d6db"; // Replace if expired
const TOTAL_TOKEN_SUPPLY = 4880000;
const CDCF_WALLET = "293Py67fg8fNYMt1USR6Vb5pkG1Wxp5ehaSAPQvBYsJy";
const TOKEN_MINT = "53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8";
const RPC_ENDPOINTS = [
 "https://rpc.ankr.com/solana",
 "https://api.mainnet-beta.solana.com",
 "https://solana-mainnet.g.alchemy.com/v2/demo"
];
const connection = new solanaWeb3.Connection(RPC_ENDPOINTS[0], 'confirmed');

// Event delegation for buttons
document.body.addEventListener('click', (e) => {
 const button = e.target.closest('.button, #darkModeToggle, #create-wallet-btn, #connect-wallet-btn, #donate-btn, #refresh-balance');
 if (button) {
   const id = button.id || button.textContent;
   console.log(`Button clicked: ${id}`);
   if (button.id === 'refresh-token') debounceUpdateTokenInfo();
   else if (button.id === 'create-wallet-btn') generateWallet();
   else if (button.id === 'connect-wallet-btn') connectWallet();
   else if (button.id === 'donate-btn') donateDIRA();
   else if (button.id === 'refresh-balance') debounceUpdateBalanceInfo();
   else if (button.href) window.open(button.href, '_blank');
 }
});

// Dark mode toggle (unchanged)
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

// Debounce token refresh
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

// Debounce balance refresh
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

// Token info fetch (updated Birdeye endpoint, added Jupiter fallback)
async function updateTokenInfo() {
 console.log('Fetching token data...');
 const startTime = performance.now();
 tokenInfoEl.innerHTML = `<p>Loading token data... <span class="loader"></span></p><button class="button" id="refresh-token">Refresh</button>`;
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 3000);
   let response = await fetch(`https://public-api.birdeye.so/public/price?address=${TOKEN_MINT}`, {
     headers: {
       "X-API-KEY": BIRDEYE_API_KEY,
       "x-chain": "solana",
       "accept": "application/json"
     },
     signal: controller.signal
   });
   clearTimeout(timeoutId);

   if (!response.ok) {
     console.warn('Birdeye failed, trying Jupiter...');
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

// Wallet creation
function generateWallet() {
 const keypair = solanaWeb3.Keypair.generate();
 const publicKey = keypair.publicKey.toString();
 const secretKey = Array.from(keypair.secretKey).join(',');
 alert(
   `New Wallet Created!\nPublic Key: ${publicKey}\nSecret Key: ${secretKey}\nWARNING: Save this OFFLINE on paper. Do NOT share. Import to Phantom/Solflare to use.\nFund with SOL to buy $DIRA for sea turtle conservation.`
 );
 console.log('New wallet generated:', { publicKey });
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
     <p>Connect wallet to view balances or create a new one.</p>
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
// Load dark mode preference
if (localStorage.getItem('darkMode') === 'enabled') {
 document.body.classList.add('dark-mode');
 darkModeToggle.textContent = '☀️ Light Mode';
}

// Birdeye API key and constants
const BIRDEYE_API_KEY = "0d4d8f6a8444446cb233b2f2e933d6db";
const TOTAL_TOKEN_SUPPLY = 4880000;
const CDCF_WALLET = "293Py67fg8fNYMt1USR6Vb5pkG1Wxp5ehaSAPQvBYsJy";
const TURTLES_PER_DIRA = 10000;
const TOKEN_MINT = '53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8';
const RPC_ENDPOINTS = [
 "https://rpc.ankr.com/solana",
 "https://api.mainnet-beta.solana.com",
 "https://solana-mainnet.g.alchemy.com/v2/demo"
];

// Debounce token refresh
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

// Debounce balance refresh
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

// Wallet creation
function generateWallet() {
 const keypair = Keypair.generate();
 const publicKey = keypair.publicKey.toString();
 const secretKey = Array.from(keypair.secretKey);
 alert(
   `New Wallet Created!\n` +
   `Public Key: ${publicKey}\n` +
   `Secret Key: ${secretKey.join(',')}\n` +
   `WARNING: Save this OFFLINE (paper, not digital). ` +
   `Import into Phantom/Solflare to use. Do NOT share!\n` +
   `Fund with SOL to buy $DIRA for sea turtle conservation.`
 );
 console.log('New wallet generated:', { publicKey });
}

// Balance fetching
async function updateBalanceInfo() {
 console.log('Fetching balance data...');
 const startTime = performance.now();
 balanceInfoEl.innerHTML = `<p>Loading balance data... <span class="loader"></span></p><button class="button" id="refresh-balance">Refresh</button>`;

 try {
   const wallet = window.solana;
   if (!wallet || !wallet.isConnected) {
     balanceInfoEl.innerHTML = `
       <p>Connect wallet to view balances or create a new one.</p>
       <button class="button" id="refresh-balance">Refresh</button>
     `;
     return;
   }

   const publicKey = new PublicKey(wallet.publicKey.toString());
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 3000);

   // SOL balance
   const solBalance = await connection.getBalance(publicKey, { signal: controller.signal });
   const solBalanceFormatted = (solBalance / 1e9).toFixed(4);

   // $DIRA balance
   let diraBalance = 0;
   try {
     const tokenAccount = await getAssociatedTokenAddress(new PublicKey(TOKEN_MINT), publicKey);
     const tokenAccountInfo = await getAccount(connection, tokenAccount, { signal: controller.signal });
     diraBalance = (tokenAccountInfo.amount / BigInt(1e9)).toFixed(2); // 9 decimals
   } catch (e) {
     console.warn('No $DIRA token account found:', e.message);
   }

   clearTimeout(timeoutId);
   const fetchTime = performance.now() - startTime;
   console.log(`Fetched balance data in ${fetchTime.toFixed(2)}ms:`, { solBalance: solBalanceFormatted, diraBalance });

   balanceInfoEl.innerHTML = `
     <p><strong>SOL Balance:</strong> ${solBalanceFormatted} SOL</p>
     <p><strong>$DIRA Balance:</strong> ${diraBalance} DIRA</p>
     <p>Hold $DIRA to support sea turtle conservation!</p>
     <button class="button" id="refresh-balance">Refresh</button>
   `;
 } catch (error) {
   console.error(`Balance data error after ${(performance.now() - startTime).toFixed(2)}ms:`, error);
   balanceInfoEl.innerHTML = `
     <p>Error fetching balance data: ${error.message}. Please try again.</p>
     <button class="button" id="refresh-balance">Refresh</button>
   `;
 }
}

// Donate $DIRA
async function donateDIRA() {
 const amount = parseFloat(donateAmountInput.value);
 if (!amount || amount <= 0) {
   alert('Please enter a valid $DIRA amount to donate.');
   return;
 }

 try {
   const wallet = window.solana;
   if (!wallet || !wallet.isConnected) {
     alert('Please connect your wallet first.');
     return;
   }

   const publicKey = new PublicKey(wallet.publicKey.toString());
   const recipient = new PublicKey(CDCF_WALLET);
   const tokenMint = new PublicKey(TOKEN_MINT);
   const source = await getAssociatedTokenAddress(tokenMint, publicKey);
   const destination = await getAssociatedTokenAddress(tokenMint, recipient);

   const transaction = new Transaction().add(
     createTransferInstruction(
       source,
       destination,
       publicKey,
       BigInt(Math.floor(amount * 1e9)), // 9 decimals
       [],
       splToken.TOKEN_PROGRAM_ID
     )
   );

   const { blockhash } = await connection.getLatestBlockhash();
   transaction.recentBlockhash = blockhash;
   transaction.feePayer = publicKey;

   const signature = await wallet.signAndSendTransaction(transaction);
   await connection.confirmTransaction(signature);

   alert(`Donated ${amount} $DIRA to CDCF wallet! Tx: ${signature}`);
   console.log('Donation successful:', { signature, amount });
   updateBalanceInfo(); // Refresh balances
 } catch (error) {
   console.error('Donation error:', error);
   alert(`Donation failed: ${error.message}`);
 }
}

// Initialize
window.addEventListener('load', () => {
 updateTokenInfo();
 updateBalanceInfo();
});

// Handle balance refresh
document.body.addEventListener('click', (e) => {
 if (e.target.id === 'refresh-balance') {
   debounceUpdateBalanceInfo();
 }
});

// Existing token info functions (unchanged)
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

async function updateTokenInfo() {
 console.log('Fetching new token data...');
 const startTime = performance.now();
 tokenInfoEl.innerHTML = `<p>Loading token data... <span class="loader"></span></p><button class="button" id="refresh-token">Refresh</button>`;
 try {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 3000);
   const birdeyeResponse = await fetch("https://public-api.birdeye.so/defi/price?address=53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8&check_liquidity=100&include_liquidity=true", {
     headers: {
       "X-API-KEY": BIRDEYE_API_KEY,
       "x-chain": "solana",
       "accept": "application/json"
     },
     signal: controller.signal
   });
   clearTimeout(timeoutId);
   if (!birdeyeResponse.ok) throw new Error(`Birdeye HTTP ${birdeyeResponse.status}`);
   const birdeyeData = await birdeyeResponse.json();
   const price = birdeyeData.data?.value?.toFixed(6) || "N/A";
   const liquidity = birdeyeData.data?.liquidity?.toFixed(2) || "N/A";
   const marketCap = price !== "N/A" ? (birdeyeData.data.value * TOTAL_TOKEN_SUPPLY).toFixed(2) : "N/A";

   const fetchTime = performance.now() - startTime;
   console.log(`Fetched token data in ${fetchTime.toFixed(2)}ms:`, { price, liquidity, marketCap });

   tokenInfoEl.innerHTML = `
     <p><strong>Price:</strong> ${price !== "N/A" ? "$" + price : price}</p>
     <p><strong>Liquidity:</strong> ${liquidity !== "N/A" ? "$" + liquidity : liquidity}</p>
     <p><strong>Market Cap:</strong> ${marketCap !== "N/A" ? "$" + marketCap : marketCap}</p>
     <p><strong>Mission:</strong> Fund conservation through community participation.</p>
     <p><strong>Track:</strong> <a href="https://birdeye.so/token/53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8?chain=solana" target="_blank">Birdeye</a></p>
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
async function updateTokenInfo() {
 console.log('Fetching new token data...');
 const startTime = performance.now();
 tokenInfoEl.innerHTML = `<p>Loading token data... <span class="loader"></span></p><button class="button" id="refresh-token">Refresh</button>`;
 try {
 const controller = new AbortController();
 const timeoutId = setTimeout(() => controller.abort(), 3000);
 const birdeyeResponse = await fetch("https://public-api.birdeye.so/defi/price?address=53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8&check_liquidity=100&include_liquidity=true", {
 headers: {
 "X-API-KEY": BIRDEYE_API_KEY,
 "x-chain": "solana",
 "accept": "application/json"
 },
 signal: controller.signal
 });
 clearTimeout(timeoutId);
 if (!birdeyeResponse.ok) throw new Error(`Birdeye HTTP ${birdeyeResponse.status}`);
 const birdeyeData = await birdeyeResponse.json();
 const price = birdeyeData.data?.value?.toFixed(6) || "N/A";
 const liquidity = birdeyeData.data?.liquidity?.toFixed(2) || "N/A";
 const marketCap = price !== "N/A" ? (birdeyeData.data.value * TOTAL_TOKEN_SUPPLY).toFixed(2) : "N/A";

 const fetchTime = performance.now() - startTime;
 console.log(`Fetched token data in ${fetchTime.toFixed(2)}ms:`, { price, liquidity, marketCap });

 tokenInfoEl.innerHTML = `
 <p><strong>Price:</strong> ${price !== "N/A" ? "$" + price : price}</p>
 <p><strong>Liquidity:</strong> ${liquidity !== "N/A" ? "$" + liquidity : liquidity}</p>
 <p><strong>Market Cap:</strong> ${marketCap !== "N/A" ? "$" + marketCap : marketCap}</p>
 <p><strong>Mission:</strong> Fund conservation through community participation.</p>
 <p><strong>Track:</strong> <a href="https://birdeye.so/token/53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8?chain=solana" target="_blank">Birdeye</a></p>
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
