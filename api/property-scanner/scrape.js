// API route to proxy property scrape requests
const axios = require('axios');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }

  try {
    // Forward the request to the property service API
    const response = await axios.post(
      'https://orbrex-365.vercel.app/scrape', 
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // The property scan might take a while
        timeout: 60000 // 60 second timeout
      }
    );

    // Return the API response
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Property scan proxy error:', error);
    
    // Return error with proper status code
    const status = error.response?.status || 500;
    const message = error.response?.data || { 
      error: 'An error occurred while fetching property listings',
      message: error.message
    };
    
    return res.status(status).json(message);
  }
};
