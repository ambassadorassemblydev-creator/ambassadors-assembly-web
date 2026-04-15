import axios from 'axios';
import dotenv from 'dotenv';
import { logger } from '../config/logger.js';

dotenv.config();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export const paystackService = {
  /**
   * Initialize a transaction
   * @param {Object} data { email, amount, metadata, reference }
   */
  initializeTransaction: async (data) => {
    try {
      // Paystack expects amount in kobo/lowest currency unit
      const amountInKobo = Math.round(data.amount * 100);

      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: data.email,
          amount: amountInKobo,
          currency: 'NGN',
          reference: data.reference,
          metadata: data.metadata,
          callback_url: `${process.env.APP_URL}/api/donations/paystack-callback`,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Paystack Initialization Error: ${error.response?.data?.message || error.message}`);
      throw new Error('Could not initialize Paystack transaction');
    }
  },

  /**
   * Verify a transaction
   * @param {String} reference 
   */
  verifyTransaction: async (reference) => {
    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Paystack Verification Error: ${error.response?.data?.message || error.message}`);
      throw new Error('Could not verify Paystack transaction');
    }
  }
};
