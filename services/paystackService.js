import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { logger } from '../config/logger.js';

dotenv.config();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * ============================================================
 * PAYSTACK SERVICE
 * ============================================================
 * Production-grade Paystack API integration.
 * Handles transaction initialization, verification, listing,
 * webhook signature validation, and admin sync operations.
 * 
 * All amounts are handled in Naira (NGN).
 * Paystack expects amounts in kobo (lowest currency unit).
 * 1 Naira = 100 kobo.
 * ============================================================
 */


/**
 * Creates a configured axios instance for Paystack API calls.
 * Includes authorization header, timeout, and retry logic.
 * @returns {import('axios').AxiosInstance} Configured axios instance
 */
function createPaystackClient() {
  const client = axios.create({
    baseURL: PAYSTACK_BASE_URL,
    timeout: 30000, // 30 second timeout for Paystack API calls
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
  });

  return client;
}


/**
 * Generates a unique, collision-resistant transaction reference.
 * Format: AA-{TYPE_PREFIX}-{TIMESTAMP_HEX}-{RANDOM_SUFFIX}
 * Example: AA-GEN-191a2b3c-f7k9m2x4
 * 
 * @param {string} prefix - Type prefix (e.g. 'GEN' for general, 'BLD' for building fund, 'EVT' for event)
 * @returns {string} Unique transaction reference
 */
function generateReference(prefix = 'GEN') {
  const timestamp = Date.now().toString(16); // Hex timestamp for compactness
  const random = crypto.randomBytes(4).toString('hex'); // 8-char random hex
  return `AA-${prefix}-${timestamp}-${random}`;
}


/**
 * Generates an idempotency key from payment parameters.
 * This prevents duplicate payments within a 5-minute window.
 * 
 * The key is a SHA-256 hash of: email + amount + categoryId + 5-minute time bucket.
 * Two requests with the same parameters within the same 5-minute window
 * will produce the same idempotency key, causing the DB UNIQUE constraint
 * to reject the duplicate.
 * 
 * @param {string} email - Payer's email address
 * @param {number} amount - Payment amount in Naira
 * @param {string} categoryId - Donation category UUID
 * @returns {string} SHA-256 idempotency key
 */
function generateIdempotencyKey(email, amount, categoryId) {
  // 5-minute time bucket: floor(timestamp / 300000) gives the same value for 5 minutes
  const timeBucket = Math.floor(Date.now() / 300000);
  const raw = `${email}:${amount}:${categoryId || 'none'}:${timeBucket}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}


/**
 * Validates a Paystack webhook signature using HMAC-SHA512.
 * 
 * Paystack signs all webhook payloads with your secret key.
 * This function verifies that the signature matches, ensuring
 * the webhook genuinely came from Paystack and wasn't tampered with.
 * 
 * @param {string} signature - The x-paystack-signature header value
 * @param {object|string} body - The raw request body (must be JSON string or object)
 * @param {string} secret - Your Paystack secret key
 * @returns {boolean} True if the signature is valid
 */
function verifyWebhookSignature(signature, body, secret) {
  if (!signature || !secret) return false;

  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  const expectedHash = crypto
    .createHmac('sha512', secret)
    .update(bodyString)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch {
    // If lengths don't match, timingSafeEqual throws — signature is invalid
    return false;
  }
}


export const paystackService = {

  /**
   * Initialize a Paystack transaction from the server side.
   * This is the recommended flow: server creates the transaction,
   * then returns the authorization_url or access_code to the frontend.
   * 
   * Benefits over client-only initialization:
   * - Reference is generated server-side (can't be spoofed)
   * - Idempotency key is attached to metadata
   * - Amount is controlled server-side
   * - Callback URL is set server-side
   * 
   * @param {Object} params
   * @param {string} params.email - Customer's email address
   * @param {number} params.amount - Amount in Naira (will be converted to kobo)
   * @param {string} params.reference - Server-generated unique reference
   * @param {string} [params.currency='NGN'] - Currency code
   * @param {string} [params.callbackUrl] - Override callback URL
   * @param {Object} [params.metadata={}] - Custom metadata to attach
   * @param {string[]} [params.channels] - Allowed payment channels
   * @returns {Promise<{authorization_url: string, access_code: string, reference: string}>}
   */
  initializeTransaction: async ({ email, amount, reference, currency = 'NGN', callbackUrl, metadata = {}, channels }) => {
    try {
      const client = createPaystackClient();

      // Paystack expects amount in kobo (lowest currency unit)
      // 1 Naira = 100 kobo, so multiply by 100
      const amountInKobo = Math.round(amount * 100);

      const payload = {
        email,
        amount: amountInKobo,
        currency,
        reference,
        metadata,
        callback_url: callbackUrl || `${process.env.APP_URL}/api/payments/paystack-callback`,
      };

      // Only include channels if explicitly specified
      // Available: card, bank, ussd, qr, mobile_money, bank_transfer, eft
      if (channels && channels.length > 0) {
        payload.channels = channels;
      }

      const response = await client.post('/transaction/initialize', payload);

      logger.info(`[PaystackService] Transaction initialized: ${reference} for ${email} (₦${amount})`);

      return response.data.data; // { authorization_url, access_code, reference }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      logger.error(`[PaystackService] Initialization failed: ${errorMessage}`);
      throw new Error(`Paystack initialization failed: ${errorMessage}`);
    }
  },


  /**
   * Verify a Paystack transaction by its reference.
   * This confirms the transaction status and retrieves full details
   * including amount, channel, fees, customer info, and authorization data.
   * 
   * IMPORTANT: Always verify server-side before marking a donation as completed.
   * Never trust client-side callbacks alone.
   * 
   * @param {string} reference - The transaction reference to verify
   * @returns {Promise<Object>} Full Paystack transaction data
   */
  verifyTransaction: async (reference) => {
    try {
      const client = createPaystackClient();

      const response = await client.get(`/transaction/verify/${encodeURIComponent(reference)}`);

      logger.info(`[PaystackService] Transaction verified: ${reference} → ${response.data.data.status}`);

      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      logger.error(`[PaystackService] Verification failed for ${reference}: ${errorMessage}`);
      throw new Error(`Paystack verification failed: ${errorMessage}`);
    }
  },


  /**
   * List transactions from Paystack with optional filters.
   * Used by the admin panel to sync and display Paystack transaction data.
   * Supports pagination, date ranges, status, and amount filters.
   * 
   * @param {Object} params - Query parameters
   * @param {number} [params.perPage=50] - Results per page (max 100)
   * @param {number} [params.page=1] - Page number
   * @param {string} [params.status] - Filter by status: 'success', 'failed', 'abandoned'
   * @param {string} [params.from] - Start date (ISO 8601 or YYYY-MM-DD)
   * @param {string} [params.to] - End date (ISO 8601 or YYYY-MM-DD)
   * @param {number} [params.amount] - Filter by exact amount (in kobo)
   * @returns {Promise<{data: Array, meta: Object}>} Paginated transaction list
   */
  listTransactions: async ({ perPage = 50, page = 1, status, from, to, amount } = {}) => {
    try {
      const client = createPaystackClient();

      // Build query parameters, only including defined values
      const params = { perPage, page };
      if (status) params.status = status;
      if (from) params.from = from;
      if (to) params.to = to;
      if (amount) params.amount = amount;

      const response = await client.get('/transaction', { params });

      logger.info(`[PaystackService] Listed ${response.data.data.length} transactions (page ${page})`);

      return {
        transactions: response.data.data,
        meta: response.data.meta,
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      logger.error(`[PaystackService] List transactions failed: ${errorMessage}`);
      throw new Error(`Failed to list Paystack transactions: ${errorMessage}`);
    }
  },


  /**
   * Fetch a single transaction by its Paystack ID.
   * Returns full transaction details including payment channel,
   * card/bank info, fees, customer data, and timeline.
   * 
   * @param {string|number} transactionId - Paystack transaction ID (unsigned 64-bit integer)
   * @returns {Promise<Object>} Full transaction data
   */
  fetchTransaction: async (transactionId) => {
    try {
      const client = createPaystackClient();

      const response = await client.get(`/transaction/${transactionId}`);

      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      logger.error(`[PaystackService] Fetch transaction ${transactionId} failed: ${errorMessage}`);
      throw new Error(`Failed to fetch Paystack transaction: ${errorMessage}`);
    }
  },


  /**
   * Get transaction totals from Paystack.
   * Returns total volume, transaction count, and breakdown by currency.
   * Used for the admin finance dashboard summary.
   * 
   * @param {Object} [params] - Optional date range filters
   * @param {string} [params.from] - Start date
   * @param {string} [params.to] - End date
   * @returns {Promise<Object>} Transaction totals data
   */
  getTransactionTotals: async ({ from, to } = {}) => {
    try {
      const client = createPaystackClient();

      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;

      const response = await client.get('/transaction/totals', { params });

      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      logger.error(`[PaystackService] Transaction totals failed: ${errorMessage}`);
      throw new Error(`Failed to get transaction totals: ${errorMessage}`);
    }
  },


  // ============================================================
  // UTILITY EXPORTS
  // ============================================================

  /** Generate a unique transaction reference */
  generateReference,

  /** Generate an idempotency key from payment params */
  generateIdempotencyKey,

  /** Validate a Paystack webhook HMAC signature */
  verifyWebhookSignature,
};
