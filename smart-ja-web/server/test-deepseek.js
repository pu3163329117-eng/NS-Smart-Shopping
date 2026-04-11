
const axios = require('axios');

const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const API_URL = 'https://api.deepseek.com/chat/completions';

async function testDeepSeek() {
  console.log('Testing DeepSeek API...');
  if (!API_KEY) {
    console.error('Missing DEEPSEEK_API_KEY environment variable.');
    process.exit(1);
  }
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
