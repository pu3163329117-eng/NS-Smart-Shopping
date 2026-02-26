const express = require('express');
const router = express.Router();
const axios = require('axios');

// ZeroClaw Agent Engine Configuration
const ZEROCLAW_URL = process.env.ZEROCLAW_URL || 'http://localhost:8080/v1/chat/completions';
const ZEROCLAW_API_KEY = process.env.ZEROCLAW_API_KEY || 'zc-local-dev-key';

// This endpoint attempts to connect to the ZeroClaw Rust daemon.
// If it fails (e.g. process not running), it will return a fallback signal.
router.post('/agent', async (req, res) => {
    console.log('Received agent request (routing to ZeroClaw)');

    const { messages, agentId, temperature = 0.7, max_tokens = 4000, stream = true } = req.body;

    try {
        if (stream) {
            const response = await axios({
                method: 'post',
                url: ZEROCLAW_URL,
                data: {
                    model: agentId || 'zeroclaw-default', // Map Vue AI stages to specific ZeroClaw models/configs
                    messages,
                    temperature,
                    max_tokens,
                    stream: true
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ZEROCLAW_API_KEY}`
                },
                responseType: 'stream',
                timeout: 5000 // Quick timeout to test if ZeroClaw is up
            });

            // ZeroClaw connected successfully, now we establish SSE with the frontend
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            response.data.on('data', chunk => {
                const chunkStr = chunk.toString('utf8');
                res.write(chunkStr);
            });

            response.data.on('end', () => res.end());
            response.data.on('error', err => {
                console.error('ZeroClaw Stream Error:', err);
                res.end();
            });
        } else {
            const response = await axios.post(ZEROCLAW_URL, {
                model: agentId || 'zeroclaw-default',
                messages,
                temperature,
                max_tokens,
                stream: false
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ZEROCLAW_API_KEY}`
                },
                timeout: 10000
            });

            return res.json({ content: response.data.choices[0].message.content });
        }
    } catch (error) {
        console.error('ZeroClaw Not Available, please ensure the Rust daemon is running:', error.message);
        if (!res.headersSent) {
            return res.status(503).json({ error: 'ZeroClaw Service Unavailable', details: error.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: 'ZeroClaw connection failed' })}\n\n`);
            res.end();
        }
    }
});

module.exports = router;
