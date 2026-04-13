import { redis } from './config/redis.js';
import { logger } from './config/logger.js';

async function verify() {
  if (!redis) {
    console.error('Redis is not configured.');
    process.exit(1);
  }

  try {
    await redis.set('test_connection', 'Ambassadors Assembly is Live!');
    const val = await redis.get('test_connection');
    console.log('Redis Test Value:', val);
    
    if (val === 'Ambassadors Assembly is Live!') {
      console.log('✅ Redis connection verified successfully!');
    } else {
      console.log('❌ Redis data mismatch.');
    }
    
    await redis.del('test_connection');
    process.exit(0);
  } catch (err) {
    console.error('❌ Redis verification failed:', err);
    process.exit(1);
  }
}

verify();
