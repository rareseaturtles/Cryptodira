// Enhanced 'incinerator-proxy.js' with improved error handling, validation, and security practices.

const axios = require('axios');

const validateInput = (input) => {
    // Add validation logic for input
    return input && typeof input === 'string'; // Example validation
};

const handler = async (event) => {
    try {
        const { input } = event; // assuming input is provided in the event
        if (!validateInput(input)) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Invalid input' }) };
        }

        // Making network requests with axios
        const response = await axios.get(`https://api.example.com/data?input=${encodeURIComponent(input)}`);
        return { statusCode: 200, body: JSON.stringify(response.data) };
    } catch (error) {
        console.error('Error occurred:', error);

        // Handle specific error types and return user-friendly messages
        if (error.response) {
            return { statusCode: error.response.status, body: JSON.stringify(error.response.data) };
        }
        return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error' }) };
    }
};

exports.handler = handler;
