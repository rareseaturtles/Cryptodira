// DOM elements
const tokenInfoEl = document.getElementById("token-info");
const darkModeToggle = document.getElementById('darkModeToggle');

// Event delegation for buttons
document.body.addEventListener('click', (e) => {
    const button = e.target.closest('.button, #darkModeToggle');
    if (button) {
        const id = button.id || button.textContent;
        console.log(`Button clicked: ${id}`);
        if (button.id === 'refresh-token') debounceUpdateTokenInfo();
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
    updateTokenInfo(true);
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

        let holderCount = 180;
        if (fetchHolders) {
            const response = await fetch('https://rpc.ankr.com/solana', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "getProgramAccounts",
                    params: [
                        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        {
                            encoding: "base64",
                            filters: [
                                { dataSize: 165 },
                                { memcmp: { offset: 0, bytes: "53hZ5wdfphd8wUoh6rqrv5STvB58yBRaXuZFAWwitKm8" } }
                            ]
                        }
                    ]
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            const uniqueHolders = new Set(data.result.map(acc => {
                const accountData = new Uint8Array(atob(acc.account.data[0]).split('').map(c => c.charCodeAt(0)));
                return accountData.slice(32, 64).toString();
            })).size;
            holderCount = uniqueHolders > 0 ? uniqueHolders : 180;
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

// Initialize
window.addEventListener('load', () => {
    displayCachedTokenData();
    setTimeout(() => updateTokenInfo(false), 180000); // Initial fetch without holders
});