// DOM elements
const tokenInfoEl = document.getElementById("token-info");
const impactTrackerEl = document.getElementById("impact-tracker");
const darkModeToggle = document.getElementById('darkModeToggle');

// Event delegation for buttons
document.body.addEventListener('click', (e) => {
    const button = e.target.closest('.button, #darkModeToggle');
    if (button) {
        const id = button.id || button.textContent;
        console.log(`Button clicked: ${id}`);
        if (button.id === 'refresh-token') debounceUpdateTokenInfo();
        else if (button.id === 'refresh-impact') debounceUpdateImpactTracker();
        else if (button.href) window.open(button.href, '_blank');
    }
});

// Dark mode toggle
darkModeToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent delegation conflict
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

// Birdeye API key and constants
const BIRDEYE_API_KEY = "0d4d8f6a8444446cb233b2f2e933d6db";
const TOTAL_TOKEN_SUPPLY = 4880000;
const CDCF_WALLET = "293Py67fg8fNYMt1USR6Vb5pkG1Wxp5ehaSAPQvBYsJy";
const TURTLES_PER_DIRA = 10000; // 10,000 $DIRA = 1 turtle protected

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

// Debounce impact tracker refresh
let isFetchingImpactData = false;
function debounceUpdateImpactTracker() {
    if (isFetchingImpactData) {
        console.log('Impact refresh debounced');
        return;
    }
    isFetchingImpactData = true;
    setTimeout(() => { isFetchingImpactData = false; }, 2000); // 2s debounce
    updateImpactTracker();
}

// Cache impact data
function displayCachedImpactData() {
    const cachedData = localStorage.getItem('impactData');
    if (cachedData) {
        const { diraBalance, turtlesProtected, timestamp } = JSON.parse(cachedData);
        const now = Date.now();
        const cacheAge = now - timestamp;
        const maxCacheAge = 5 * 60 * 1000; // 5 minutes
        if (cacheAge < maxCacheAge) {
            console.log('Displaying cached impact data:', { diraBalance, turtlesProtected });
            impactTrackerEl.innerHTML = `
                <p><strong>Conservation Fund:</strong> ${diraBalance.toLocaleString()} $DIRA</p>
                <p><strong>Turtles Protected:</strong> ${turtlesProtected}</p>
                <p><strong>Goal:</strong> 1 million $DIRA by December 2025</p>
                <p><small>Data cached ${Math.round(cacheAge / 1000 / 60)} minutes ago</small></p>
                <button class="button" id="refresh-impact">Refresh Impact</button>
            `;
            return true;
        }
    }
    impactTrackerEl.innerHTML = `
        <p>Loading impact data... <span class="loader"></span></p>
        <button class="button" id="refresh-impact">Refresh Impact</button>
    `;
    return false;
}

async function updateTokenInfo() {
    console.log('Fetching new token data...');
    const startTime = performance.now();
    tokenInfoEl.innerHTML = `<p>Loading token data... <span class="loader"></span></p><button class="button" id="refresh-token">Refresh</button>`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
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

async function updateImpactTracker() {
    console.log('Fetching new impact data...');
    const startTime = performance.now();
    impactTrackerEl.innerHTML = `<p>Loading impact data... <span class="loader"></span></p><button class="button" id="refresh-impact">Refresh Impact</button>`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
        const connection = new solanaWeb3.Connection("https://rpc.ankr.com/solana");
        const wallet = new solanaWeb3.PublicKey(CDCF_WALLET);
        const tokenAccounts = await connection.getTokenAccountsByOwner(wallet, {
            mint: new solanaWeb3.PublicKey("53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8")
        });
        let diraBalance = 0;
        if (tokenAccounts.value.length > 0) {
            const balanceResponse = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
            diraBalance = balanceResponse.value.uiAmount || 0;
        }
        const turtlesProtected = Math.floor(diraBalance / TURTLES_PER_DIRA);
        const impactData = { diraBalance, turtlesProtected, timestamp: Date.now() };
        localStorage.setItem('impactData', JSON.stringify(impactData));
        const fetchTime = performance.now() - startTime;
        console.log(`Fetched impact data in ${fetchTime.toFixed(2)}ms:`, impactData);

        impactTrackerEl.innerHTML = `
            <p><strong>Conservation Fund:</strong> ${diraBalance.toLocaleString()} $DIRA</p>
            <p><strong>Turtles Protected:</strong> ${turtlesProtected}</p>
            <p><strong>Goal:</strong> 1 million $DIRA by December 2025</p>
            <button class="button" id="refresh-impact">Refresh Impact</button>
        `;
    } catch (error) {
        console.error(`Impact data error after ${(performance.now() - startTime).toFixed(2)}ms:`, error);
        impactTrackerEl.innerHTML = `
            <p>Error fetching impact data: ${error.message}. Please try again.</p>
            <button class="button" id="refresh-impact">Refresh Impact</button>
        `;
        displayCachedImpactData();
    }
}

// Initialize
window.addEventListener('load', () => {
    updateTokenInfo(); // Fetch token data instantly
    displayCachedImpactData(); // Show cached impact data
    setTimeout(() => updateImpactTracker(), 5000); // Fetch impact data after 5s
});