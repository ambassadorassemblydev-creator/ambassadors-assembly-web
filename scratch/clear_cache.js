import { redis } from '../config/redis.js';
import dotenv from 'dotenv';
dotenv.config();

async function clearCache() {
    try {
        if (redis) {
            await redis.del('home_page_data');
            console.log('Cache home_page_data cleared successfully');
        } else {
            console.log('Redis not initialized');
        }
    } catch (error) {
        console.error('Error clearing cache:', error);
    } finally {
        process.exit();
    }
}

clearCache();
