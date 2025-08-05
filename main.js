// DOM elements
const connectBtn = document.getElementById("connect-btn");
const disconnectBtn = document.getElementById("disconnect-btn");
const statusEl = document.getElementById("status");
const tokenInfoEl = document.getElementById("token-info");
const darkModeToggle = document.getElementById('darkModeToggle');
const backgroundCanvas = document.getElementById('background-canvas');
const swipeCanvas = document.getElementById('swipe-canvas');

// Event delegation for buttons
document.body.addEventListener('click', (e) => {
    const button = e.target.closest('.button, #darkModeToggle');
    if (button) {
        const id = button.id || button.textContent;
        console.log(`Button clicked: ${id}`);
        if (button.id === 'connect-btn') connectWallet();
        else if (button.id === 'disconnect-btn') disconnectWallet();
        else if (button.id === 'refresh-token') debounceUpdateTokenInfo();
        else if (button.href) window.open(button.href, '_blank');
    }
});

// Dark mode toggle
darkModeToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent delegation conflict
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        darkModeToggle.textContent = '☀️ Light Mode';
        localStorage.setItem('darkMode', 'enabled');
        startAnimations();
    } else {
        darkModeToggle.textContent = '🌙 Dark Mode';
        localStorage.setItem('darkMode', 'disabled');
        stopAnimations();
    }
});

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    darkModeToggle.textContent = '☀️ Light Mode';
    startAnimations();
}

// Animation control
let backgroundItems = [];
let backgroundFrameId = null;
let touchStart = null;
let touchStartTime = null;

function startAnimations() {
    backgroundCanvas.style.display = 'block';
    swipeCanvas.style.display = window.innerWidth > 600 ? 'block' : 'none'; // Disable swipe on mobile
    initializeBackgroundItems();
    animateBackground();
}

function stopAnimations() {
    backgroundCanvas.style.display = 'none';
    swipeCanvas.style.display = 'none';
    backgroundItems = [];
    if (backgroundFrameId) cancelAnimationFrame(backgroundFrameId);
}

// Background canvas animation
const backgroundCtx = backgroundCanvas.getContext('2d');

class BackgroundItem {
    constructor(type) {
        this.type = type;
        this.width = (type === 'Whaleshark') ? 200 : 100;
        this.height = (type === 'Whaleshark') ? 200 : 100;
        this.x = Math.random() * (backgroundCanvas.width - this.width);
        this.y = Math.random() * (backgroundCanvas.height - this.height);
        this.speedX = (Math.random() - 0.5) * 2;
        this.speedY = (Math.random() - 0.5) * 2;
        this.velocityX = 0;
        this.velocityY = 0;
        this.friction = 0.995;
        this.isLoaded = false;
    }
    loadImage() {
        return new Promise((resolve, reject) => {
            this.image = new Image();
            this.image.src = `/assets/${this.type}.png`;
            this.image.onload = () => {
                console.log(`Loaded image: /assets/${this.type}.png`);
                this.isLoaded = true;
                resolve();
            };
            this.image.onerror = () => {
                console.error(`Failed to load image: /assets/${this.type}.png`);
                this.isLoaded = false;
                this.draw = () => {
                    backgroundCtx.fillStyle = '#26a69a';
                    backgroundCtx.fillRect(this.x, this.y, this.width, this.height);
                    backgroundCtx.fillStyle = '#fff';
                    backgroundCtx.font = '20px Roboto';
                    backgroundCtx.textAlign = 'center';
                    backgroundCtx.fillText(this.type, this.x + this.width / 2, this.y + this.height / 2);
                };
                resolve(); // Resolve even on error to continue animation
            };
        });
    }
    update() {
        this.x += this.speedX + this.velocityX;
        this.y += this.speedY + this.velocityY;
        this.velocityX = Math.max(-3, Math.min(3, this.velocityX * this.friction));
        this.velocityY = Math.max(-3, Math.min(3, this.velocityY * this.friction));
        if (this.x < -this.width) this.x = backgroundCanvas.width;
        if (this.x > backgroundCanvas.width) this.x = -this.width;
        if (this.y < -this.height) this.y = backgroundCanvas.height;
        if (this.y > backgroundCanvas.height) this.y = -this.height;
        backgroundItems.forEach(other => {
            if (other !== this && this.isLoaded && other.isLoaded) {
                const dx = (this.x + this.width / 2) - (other.x + other.width / 2);
                const dy = (this.y + this.height / 2) - (other.y + other.height / 2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = (this.width + other.width) / 2;
                if (distance < minDistance) {
                    console.log(`Collision between ${this.type} and ${other.type}: distance=${distance.toFixed(2)}, overlap=${(minDistance - distance).toFixed(2)}, velocityX=${this.velocityX.toFixed(2)}->${(this.velocityX - dx * 0.005).toFixed(2)}`);
                    const angle = Math.atan2(dy, dx);
                    const overlap = minDistance - distance;
                    const moveX = overlap * Math.cos(angle) * 0.05;
                    const moveY = overlap * Math.sin(angle) * 0.05;
                    this.x -= moveX;
                    this.y -= moveY;
                    other.x += moveX;
                    other.y += moveY;
                    const bounceFactor = 0.005;
                    this.velocityX -= dx * bounceFactor;
                    this.velocityY -= dy * bounceFactor;
                    other.velocityX += dx * bounceFactor;
                    other.velocityY += dy * bounceFactor;
                }
            }
        });
    }
    draw() {
        if (this.isLoaded) {
            backgroundCtx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            backgroundCtx.fillStyle = '#26a69a';
            backgroundCtx.fillRect(this.x, this.y, this.width, this.height);
            backgroundCtx.fillStyle = '#fff';
            backgroundCtx.font = '20px Roboto';
            backgroundCtx.textAlign = 'center';
            backgroundCtx.fillText(this.type, this.x + this.width / 2, this.y + this.height / 2);
        }
    }
}

async function initializeBackgroundItems() {
    console.log('Initializing background items...');
    backgroundItems = [];
    const types = ['Seahorse', 'Octopus', 'Fish', 'Whaleshark', 'Seaturtle'];
    const itemCount = window.innerWidth <= 600 ? 1 : 2;
    for (let i = 0; i < itemCount; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const item = new BackgroundItem(type);
        backgroundItems.push(item);
        await item.loadImage(); // Load images sequentially
    }
}

let lastBackgroundFrame = 0;
function animateBackground(timestamp) {
    if (timestamp - lastBackgroundFrame < 33.33) { // Throttle to ~30fps
        backgroundFrameId = requestAnimationFrame(animateBackground);
        return;
    }
    lastBackgroundFrame = timestamp;
    if (!document.body.classList.contains('dark-mode') || backgroundCanvas.style.display !== 'block') {
        backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
        return;
    }
    backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    backgroundItems.forEach(item => {
        item.update();
        item.draw();
    });
    backgroundFrameId = requestAnimationFrame(animateBackground);
}

// Swipe handling (desktop only)
swipeCanvas.addEventListener('touchstart', (e) => {
    if (window.innerWidth <= 600) return;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchStartTime = Date.now();
    let closestItem = null;
    let minDistance = Infinity;
    backgroundItems.forEach(item => {
        const itemCenterX = item.x + item.width / 2;
        const itemCenterY = item.y + item.height / 2;
        const distance = Math.sqrt((touchStart.x - itemCenterX) ** 2 + (touchStart.y - itemCenterY) ** 2);
        if (distance < minDistance && distance < (item.width / 1.5)) {
            minDistance = distance;
            closestItem = item;
        }
    });
    if (closestItem) {
        e.preventDefault();
        console.log(`Touched ${closestItem.type} at (${touchStart.x}, ${touchStart.y})`);
    }
}, { passive: false });

swipeCanvas.addEventListener('touchmove', (e) => {
    if (!touchStart || window.innerWidth <= 600) return;
    const touchMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const dx = touchMove.x - touchStart.x;
    const dy = touchMove.y - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) > 20) {
        e.preventDefault();
        let closestItem = null;
        let minDistance = Infinity;
        backgroundItems.forEach(item => {
            const itemCenterX = item.x + item.width / 2;
            const itemCenterY = item.y + item.height / 2;
            const distance = Math.sqrt((touchStart.x - itemCenterX) ** 2 + (touchStart.y - itemCenterY) ** 2);
            if (distance < minDistance && distance < (item.width / 1.5)) {
                minDistance = distance;
                closestItem = item;
            }
        });
        if (closestItem) {
            const velocityFactor = 0.008;
            closestItem.velocityX = Math.max(-3, Math.min(3, dx * velocityFactor));
            console.log(`Swiped ${closestItem.type} with velocityX: ${closestItem.velocityX}`);
        }
    }
}, { passive: false });

swipeCanvas.addEventListener('touchend', (e) => {
    if (!touchStart || window.innerWidth <= 600) return;
    if (Date.now() - touchStartTime < 200) {
        let closestItem = null;
        let minDistance = Infinity;
        backgroundItems.forEach(item => {
            const itemCenterX = item.x + item.width / 2;
            const itemCenterY = item.y + item.height / 2;
            const distance = Math.sqrt((touchStart.x - itemCenterX) ** 2 + (touchStart.y - itemCenterY) ** 2);
            if (distance < minDistance && distance < (item.width / 1.5)) {
                minDistance = distance;
                closestItem = item;
            }
        });
        if (closestItem) {
            closestItem.velocityX = 0;
            closestItem.velocityY = 0;
            console.log(`Stopped ${closestItem.type}`);
        }
    }
    touchStart = null;
    touchStartTime = null;
});

// Solana config
const TOKEN_MINT_ADDRESS = new solanaWeb3.PublicKey("53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8");
const RPC_ENDPOINT = "https://rpc.ankr.com/solana"; // Faster endpoint
const FALLBACK_RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";
const MIN_TOKEN_BALANCE = BigInt(5000000);
let publicKey = null;
let isTokenHolder = false;
let walletProvider = null;
let walletName = "Unknown";

// Birdeye API key
const BIRDEYE_API_KEY = "0d4d8f6a8444446cb233b2f2e933d6db";
const TOTAL_TOKEN_SUPPLY = 4880000;

// Debounce token refresh
let isFetchingTokenData = false;
function debounceUpdateTokenInfo() {
    if (isFetchingTokenData) {
        console.log('Token refresh debounced');
        return;
    }
    isFetchingTokenData = true;
    setTimeout(() => { isFetchingTokenData = false; }, 2000); // 2s debounce
    updateTokenInfo();
}

// Token data caching
function displayCachedTokenData() {
    const cachedData = localStorage.getItem('tokenData');
    if (cachedData) {
        const { price, liquidity, marketCap, holders, timestamp } = JSON.parse(cachedData);
        const now = Date.now();
        const cacheAge = now - timestamp;
        const maxCacheAge = 48 * 60 * 60 * 1000; // 48 hours
        if (cacheAge < maxCacheAge) {
            console.log('Displaying cached token data:', { price, liquidity, marketCap, holders });
            tokenInfoEl.innerHTML = `
                <p><strong>Price:</strong> ${price !== "N/A" ? "$" + price : price}</p>
                <p><strong>Liquidity:</strong> ${liquidity !== "N/A" ? "$" + liquidity : liquidity}</p>
                <p><strong>Market Cap:</strong> ${marketCap !== "N/A" ? "$" + marketCap : marketCap}</p>
                <p><strong>Holders:</strong> ${holders}</p>
                <p><strong>Mission:</strong> Fund conservation through community participation.</p>
                <p><strong>Track:</strong> <a href="https://birdeye.so/token/53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8?chain=solana" target="_blank">Birdeye</a></p>
                <p><small>Data cached ${Math.round(cacheAge / 1000 / 60)} minutes ago</small></p>
                <button class="button" id="refresh-token">Refresh</button>
            `;
            return true;
        }
    }
    tokenInfoEl.innerHTML = `
        <p>Loading token data... <span class="loader"></span></p>
        <button class="button" id="refresh-token">Refresh</button>
    `;
    return false;
}

async function updateTokenInfo(fetchHolders = false) {
    console.log('Fetching new token data...');
    tokenInfoEl.innerHTML = `<p>Loading token data... <span class="loader"></span></p><button class="button" id="refresh-token">Refresh</button>`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // Reduced timeout
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

        let holderCount = 180;
        if (fetchHolders) {
            const connection = new solanaWeb3.Connection(RPC_ENDPOINT, "confirmed");
            const mintAddress = new solanaWeb3.PublicKey("53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8");
            const tokenProgramId = new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
            try {
                const accounts = await connection.getProgramAccounts(tokenProgramId, {
                    filters: [
                        { dataSize: 165 },
                        { memcmp: { offset: 0, bytes: mintAddress.toBase58() } }
                    ],
                    commitment: "confirmed"
                });
                const uniqueHolders = new Set(accounts.map(acc => {
                    const accountInfo = solanaWeb3.BorshAccount.from(acc.account.data);
                    return accountInfo.owner.toString();
                })).size;
                holderCount = uniqueHolders > 0 ? uniqueHolders : 180;
            } catch (rpcError) {
                console.warn("RPC call failed, defaulting to 180 holders:", rpcError.message);
            }
        }

        const tokenData = { price, liquidity, marketCap, holders: holderCount, timestamp: Date.now() };
        localStorage.setItem('tokenData', JSON.stringify(tokenData));
        console.log('Updated token data cache:', tokenData);

        tokenInfoEl.innerHTML = `
            <p><strong>Price:</strong> ${price !== "N/A" ? "$" + price : price}</p>
            <p><strong>Liquidity:</strong> ${liquidity !== "N/A" ? "$" + liquidity : liquidity}</p>
            <p><strong>Market Cap:</strong> ${marketCap !== "N/A" ? "$" + marketCap : marketCap}</p>
            <p><strong>Holders:</strong> ${holderCount}</p>
            <p><strong>Mission:</strong> Fund conservation through community participation.</p>
            <p><strong>Track:</strong> <a href="https://birdeye.so/token/53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8?chain=solana" target="_blank">Birdeye</a></p>
            <button class="button" id="refresh-token">Refresh</button>
        `;
    } catch (error) {
        console.error('Token data error:', error);
        tokenInfoEl.innerHTML = `
            <p>Error fetching token data: ${error.message}.</p>
            <p>Displaying cached data...</p>
            <button class="button" id="refresh-token">Refresh</button>
        `;
        displayCachedTokenData();
    }
}

function getConnection() {
    try {
        return new solanaWeb3.Connection(RPC_ENDPOINT, "confirmed");
    } catch (error) {
        console.warn("Primary RPC failed, switching to fallback:", error);
        return new solanaWeb3.Connection(FALLBACK_RPC_ENDPOINT, "confirmed");
    }
}

async function connectWallet() {
    walletProvider = null;
    publicKey = null;
    walletName = "Unknown";
    if (window.solana && window.solana.isPhantom) {
        walletProvider = window.solana;
        walletName = "Phantom";
    } else if (window.backpack && window.backpack.isBackpack) {
        walletProvider = window.backpack;
        walletName = "Backpack";
    } else if (window.jup) {
        walletProvider = window.jup;
        walletName = "Jupiter Mobile";
    } else if (window.solflare && window.solflare.isSolflare) {
        walletProvider = window.solflare;
        walletName = "Solflare";
    } else {
        statusEl.textContent = 'No supported wallet detected. Install <a href="https://phantom.app/" target="_blank" style="color: #0d4536; z-index: 100; pointer-events: auto;">Phantom</a>.';
        return;
    }
    try {
        const response = await walletProvider.connect();
        publicKey = walletProvider.publicKey ? walletProvider.publicKey.toString() : response.publicKey.toString();
        statusEl.textContent = `Connected: ${publicKey.slice(0, 6)}...${publicKey.slice(-4)} with ${walletName}`;
        connectBtn.style.display = "none";
        disconnectBtn.style.display = "inline-block";
        await checkTokenOwnership();
    } catch (error) {
        statusEl.textContent = `Wallet connection failed: ${error.message}`;
    }
}

function disconnectWallet() {
    if (walletProvider && walletProvider.disconnect) {
        walletProvider.disconnect();
    }
    publicKey = null;
    walletProvider = null;
    isTokenHolder = false;
    statusEl.textContent = "Wallet disconnected";
    connectBtn.style.display = "block";
    disconnectBtn.style.display = "none";
}

async function checkTokenOwnership() {
    if (!publicKey) {
        statusEl.textContent = "No wallet connected.";
        return;
    }
    const connection = getConnection();
    try {
        const tokenAccounts = await connection.getTokenAccountsByOwner(
            new solanaWeb3.PublicKey(publicKey),
            { mint: TOKEN_MINT_ADDRESS }
        );
        let totalBalance = BigInt(0);
        for (const account of tokenAccounts.value) {
            const balance = account.account.data.readBigUInt64LE(64);
            totalBalance += balance;
        }
        isTokenHolder = totalBalance > MIN_TOKEN_BALANCE;
        if (isTokenHolder) {
            statusEl.textContent = `Verified: You hold ${(Number(totalBalance) / 1e4).toFixed(4)} DIRA (500+ tokens)!`;
        } else {
            statusEl.textContent = `You hold ${(Number(totalBalance) / 1e4).toFixed(4)} DIRA. Need 500+ for benefits.`;
        }
    } catch (error) {
        statusEl.textContent = "Error checking token: " + error.message;
    }
}

// Initialize
function resizeCanvases() {
    backgroundCanvas.width = window.innerWidth;
    backgroundCanvas.height = window.innerHeight;
    swipeCanvas.width = window.innerWidth;
    swipeCanvas.height = window.innerHeight;
    if (document.body.classList.contains('dark-mode')) {
        initializeBackgroundItems();
    }
}

window.addEventListener('load', () => {
    displayCachedTokenData();
    setTimeout(() => updateTokenInfo(false), 180000); // Initial fetch without holders
});
window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// Lazy load background images with IntersectionObserver
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && document.body.classList.contains('dark-mode')) {
        startAnimations();
    }
}, { threshold: 0.1 });
observer.observe(backgroundCanvas);