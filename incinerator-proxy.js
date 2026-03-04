// netlify/functions/incinerator-proxy.js
// Proxy for Sol-Incinerator API - hides the API key server-side

const BASE_URL = 'https://v1.api.sol-incinerator.com/';

exports.handler = async function (event, context) {
  // Only allow POST requests (matches your current preview/transaction calls)
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed - Use POST' }),
    };
  }

  try {
    // Parse the incoming request body (your frontend sends JSON like { userPublicKey: '...' })
    const body = JSON.parse(event.body || '{}');

    // Get the endpoint path from query param or body (e.g. 'close_accounts/preview' or 'close_accounts/transaction')
    // For simplicity, we expect frontend to send ?path=close_accounts/preview
    const path = event.queryStringParameters?.path;
    if (!path) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing ?path= parameter (e.g. close_accounts/preview)' }),
      };
    }

    const apiUrl = `${BASE_URL}${path}`;

    // Forward the request with your secret key
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SOL_INCINERATOR_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Return the exact response from Sol-Incinerator
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        // Allow CORS so your frontend can read it
        'Access-Control-Allow-Origin': '*',  // Or restrict to 'https://cryptodira.netlify.app' later
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Proxy failed', details: error.message }),
    };
  }
};
