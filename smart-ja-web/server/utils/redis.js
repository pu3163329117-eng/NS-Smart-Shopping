const { createClient } = require('redis');

// Connect to local redis docker via 6379, or environment variable for production
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
    url: REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

let isConnected = false;

const connectRedis = async () => {
    if (!isConnected) {
        try {
            await redisClient.connect();
            isConnected = true;
            console.log(`[Redis] Connected to ${REDIS_URL}`);
        } catch (err) {
            console.error('[Redis] Connection failed, falling back to un-cached mode:', err.message);
        }
    }
};

connectRedis();

module.exports = {
    redisClient,
    isConnected: () => isConnected,
    
    // Helper to get or set cache with TTL (in seconds)
    getOrSetCache: async (key, ttl, fetchFunction) => {
        if (!isConnected) {
            return await fetchFunction();
        }
        
        try {
            const cachedData = await redisClient.get(key);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
            
            const freshData = await fetchFunction();
            // Fire & forget cache update
            redisClient.setEx(key, ttl, JSON.stringify(freshData)).catch(console.error);
            
            return freshData;
        } catch (err) {
            console.error(`[Redis] Error processing key ${key}:`, err.message);
            // Fallback to fetch
            return await fetchFunction();
        }
    },
    
    // Helper to invalidate exact keys or patterns using loops if needed
    invalidateCache: async (keyPattern) => {
        if (!isConnected) return;
        try {
            const keys = await redisClient.keys(keyPattern);
            if (keys && keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (err) {
            console.error('[Redis] Invalidate error:', err.message);
        }
    }
};
