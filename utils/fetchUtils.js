import { logger } from '../config/logger.js';

/**
 * Executes an async function with exponential backoff retries.
 * Used to stabilize connections against SocketError (UND_ERR_SOCKET).
 * 
 * @param {Function} fn - The async function to execute
 * @param {Object} options - Retry options
 * @returns {Promise<any>}
 */
export const withRetry = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 500,
    context = 'fetch',
    throwAfterAll = true
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isSocketError = err.message?.includes('socket') || 
                            err.message?.includes('fetch failed') || 
                            err.message?.includes('closed');
      
      const logLevel = isSocketError ? 'warn' : 'error';
      logger[logLevel](`[Retry] ${context} failed (Attempt ${attempt}/${maxRetries}): ${err.message}`);

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  if (throwAfterAll) {
    logger.error(`[Retry] ${context} failed after ${maxRetries} attempts.`);
    throw lastError;
  }
  return null;
};
