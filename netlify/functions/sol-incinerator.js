exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      }
    };
  }

  console.log('API key present?', !!process.env.SOL_INCINERATOR_API_KEY);

  const body = JSON.parse(event.body || '{}');
  const userPublicKey = body.userPublicKey || body.wallet; // fallback

  if (!userPublicKey) return { statusCode: 400, body: JSON.stringify({ error: 'No public key' }) };

  const apiKey = process.env.SOL_INCINERATOR_API_KEY;
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: 'No key set' }) };

  // Use path to decide preview or full
  const isPreview = event.path.includes('/preview');
  const endpoint = isPreview ? '/batch/close-all/preview' : '/batch/close-all';
  const url = `https://v1.api.sol-incinerator.com${endpoint}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Authorization': apiKey,  // fallback
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userPublicKey: userPublicKey,
        asLegacyTransaction: false
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('API error:', res.status, data);
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error('Proxy fail:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};