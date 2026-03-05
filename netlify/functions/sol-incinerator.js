const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { path, httpMethod, body } = event;
  const apiKey = process.env.SOL_INCINERATOR_KEY; // your env var name

  if (!apiKey) return { statusCode: 500, body: 'No API key' };

  const url = `https://v1.api.sol-incinerator.com${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  };

  try {
    const res = await fetch(url, {
      method: httpMethod,
      headers,
      body: body ? body : undefined,
    });
    const data = await res.json();
    return { statusCode: res.status, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};