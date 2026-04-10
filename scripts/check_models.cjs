const axios = require('axios');
require('dotenv').config({ path: './.env' });

const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function listModels() {
  try {
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    console.log('Available Models:');
    response.data.models.forEach(m => console.log(`- ${m.name}`));
  } catch (error) {
    console.error('Error listing models:', error.response?.data || error.message);
  }
}

listModels();
