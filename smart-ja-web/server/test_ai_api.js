const axios = require('axios');

const API_URL = 'http://localhost:3000/api/ai/chat';

async function testAI() {
  try {
    console.log('Testing AI Chat Endpoint...');
    const response = await axios.post(API_URL, {
      messages: [{ role: 'user', content: 'Hello, are you working?' }]
    });
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Full Error:', error);
    if (error.response) {
        console.error('Response Data:', error.response.data);
        console.error('Response Status:', error.response.status);
    } else if (error.request) {
        console.error('No Response Received');
    } else {
        console.error('Error Message:', error.message);
    }
  }
}

testAI();
