exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  console.log('API key present?', !!process.env.SOL_INCINERATOR_API_KEY);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON' }) };
  }

  const apiKey = process.env.SOL_INCINERATOR_API_KEY;
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: 'No API key' }) };

  const endpoint = event.path.endsWith('/preview') ? '/batch/close-all/preview' : '/batch/close-all';
  const url = `https://v1.api.sol-incinerator.com${endpoint}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userPublicKey: body.wallet })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API fail');

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error('Error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};