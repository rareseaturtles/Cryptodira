const axios = require('axios');

exports.handler = async (event) => {
  console.log('🔑 SOL_INCINERATOR_API_KEY present?', !!process.env.SOL_INCINERATOR_API_KEY); // debug line

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { wallet } = JSON.parse(event.body || '{}');

  const API_KEY = process.env.SOL_INCINERATOR_API_KEY;
  if (!API_KEY) {
    console.error('❌ No API key found in environment');
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not set in Netlify' }) };
  }

  try {
    const apiResponse = await axios.post('https://v1.api.sol-incinerator.com/batch/close-all', {
      userPublicKey: wallet,
      asLegacyTransaction: false
    }, {
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        accountsClosed: apiResponse.data.accountsClosed || 0,
        solReclaimed: apiResponse.data.totalSolanaReclaimed || 0
      })
    };
  } catch (error) {
    console.error('Incinerator API error:', error.response?.data || error.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to generate cleanup transactions' }) };
  }
};