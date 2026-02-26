
const axios = require('axios');

const API_KEY = 'sk-0d03dd51f6a34b0da87e20b344817241';
const API_URL = 'https://api.deepseek.com/chat/completions';

async function testDeepSeek() {
  console.log('Testing DeepSeek API...');
  try {
    const response = await axios.post(API_URL, {
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: 'Hello, are you working?' }
      ],
      temperature: 0.7
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      timeout: 10000
    });

    console.log('Success!');
    console.log('Response:', response.data.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDeepSeek();
