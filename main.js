// Update main.js to use the Netlify proxy function
const API_BASE = '/.netlify/functions/incinerator-proxy';

// Existing wallet functionality and donation logic remain intact:

async function getWalletData(walletId) {
    try {
        const response = await fetch(`${API_BASE}/wallet/${walletId}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching wallet data:', error);
    }
}

async function donate(walletId, amount) {
    try {
        const response = await fetch(`${API_BASE}/donate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ walletId, amount })
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const result = await response.json();
        if(result.success) {
            console.log('Donation successful!');
        } else {
            console.error('Donation failed:', result.message);
        }
    } catch (error) {
        console.error('Error during donation:', error);
    }
}
