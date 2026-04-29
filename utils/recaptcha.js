import axios from 'axios';
import { logger } from '../config/logger.js';

/**
 * High IQ: Verify Google reCAPTCHA v3 Token
 * @param {string} token - The token from the frontend
 * @returns {Promise<boolean>} - Whether the verification succeeded
 */
export const verifyRecaptcha = async (token) => {
    try {
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;
        
        if (!secretKey || secretKey.includes('PLACEHOLDER')) {
            logger.warn('[reCAPTCHA] Secret key missing or placeholder. Skipping verification.');
            return true; // Don't block if not configured
        }

        if (!token) {
            logger.error('[reCAPTCHA] No token provided.');
            return false;
        }

        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`
        );

        const { success, score, action } = response.data;

        if (success) {
            // High IQ: v3 returns a score (0.0 to 1.0). 0.5 is a standard threshold.
            if (score < 0.5) {
                logger.warn(`[reCAPTCHA] Suspicious activity detected. Score: ${score}, Action: ${action}`);
                return false;
            }
            return true;
        }

        logger.error('[reCAPTCHA] Verification failed:', response.data['error-codes']);
        return false;
    } catch (error) {
        logger.error('[reCAPTCHA] Error during verification:', error.message);
        return false;
    }
};
/**
 * Get the actual reCAPTCHA score for database logging
 * @param {string} token 
 * @returns {Promise<number>} - Score (0.0 to 1.0)
 */
export const getRecaptchaScore = async (token) => {
    try {
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;
        if (!secretKey || secretKey.includes('PLACEHOLDER') || !token) return 1.0;

        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`
        );
        return response.data.score || 1.0;
    } catch (error) {
        return 1.0;
    }
};
