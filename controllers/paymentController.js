import { donationRepo } from '../repositories/donationRepo.js';
import { paystackService } from '../services/paystackService.js';
import { emailService } from '../services/emailService.js';
import { verifyRecaptcha } from '../utils/recaptcha.js';
import { logger } from '../config/logger.js';

/**
 * ============================================================
 * PAYMENT CONTROLLER
 * ============================================================
 * Production-grade payment handling for Paystack integration.
 * 
 * PAYMENT FLOW:
 * 1. Frontend calls POST /api/payments/initialize
 *    → Server generates reference + idempotency key
 *    → Creates pending donation in DB
 *    → Initializes transaction with Paystack API
 *    → Returns authorization_url to frontend
 * 
 * 2. User completes payment on Paystack checkout
 *    → Paystack redirects to callback URL
 * 
 * 3. Frontend calls POST /api/payments/verify
 *    → Server verifies transaction with Paystack API
 *    → Confirms amount matches
 *    → Updates donation status to 'completed'
 *    → Sends confirmation emails
 * 
 * 4. Paystack sends webhook (backup verification)
 *    → Server validates HMAC-SHA512 signature
 *    → Idempotently processes the payment
 *    → Sends emails if not already sent
 * 
 * DOUBLE PAYMENT PROTECTION (3 layers):
 * - Layer 1: Idempotency key (DB UNIQUE) prevents duplicate intents
 * - Layer 2: Reference (DB UNIQUE) prevents duplicate completions
 * - Layer 3: Status check (only update 'pending' → 'completed')
 * ============================================================
 */


/**
 * Extract the client IP address from the request.
 * Handles proxied requests (X-Forwarded-For) and direct connections.
 * 
 * @param {import('express').Request} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs; the first is the client
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}


/**
 * Map a raw donation type string (e.g. from category names) to allowed database enum values.
 * 
 * Allowed values: 'tithe', 'offering', 'building_fund', 'special', 'welfare', 'missions', 'other'
 * 
 * @param {string} type - Raw donation type or category name
 * @returns {string} Allowed enum value
 */
function resolveDonationType(type) {
  if (!type) return 'other';
  const lowerType = type.toLowerCase().trim();
  
  if (lowerType.includes('tithe')) return 'tithe';
  if (lowerType.includes('offering')) return 'offering';
  if (lowerType.includes('worship') || lowerType.includes('building') || lowerType.includes('permanent')) {
    return 'building_fund';
  }
  if (lowerType.includes('welfare') || lowerType.includes('benevolence')) return 'welfare';
  if (lowerType.includes('mission')) return 'missions';
  if (lowerType.includes('special') || lowerType.includes('seed')) return 'special';
  
  // Direct check constraint match or fallback
  const allowed = ['tithe', 'offering', 'building_fund', 'special', 'welfare', 'missions', 'other'];
  const formatted = lowerType.replace(/[-\s]+/g, '_');
  if (allowed.includes(formatted)) return formatted;
  
  return 'other';
}


export const paymentController = {

  /**
   * ============================================================
   * POST /api/payments/initialize
   * ============================================================
   * Server-side transaction initialization.
   * This is the RECOMMENDED flow — the server controls the reference,
   * amount, and idempotency key. The frontend receives the Paystack
   * authorization_url to redirect the user.
   * 
   * REQUEST BODY:
   * {
   *   email: string (required),
   *   amount: number (required, in Naira, minimum 100),
   *   categoryId: string (optional, donation category UUID),
   *   donationType: string (optional, e.g. 'tithe', 'offering'),
   *   notes: string (optional, reason for giving),
   *   g-recaptcha-response: string (optional, reCAPTCHA token)
   * }
   * 
   * RESPONSE:
   * {
   *   success: true,
   *   authorization_url: string,
   *   access_code: string,
   *   reference: string
   * }
   */
  initializePayment: async (req, res) => {
    try {
      const { email, amount, categoryId, donationType, notes } = req.body;
      const userId = req.user?.id || null;

      // ── Validation ──────────────────────────────────────────
      if (!email || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Email and amount are required.',
        });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 100) {
        return res.status(400).json({
          success: false,
          message: 'Minimum donation amount is ₦100.',
        });
      }

      // ── reCAPTCHA verification (if available) ───────────────
      if (req.body['g-recaptcha-response']) {
        const isHuman = await verifyRecaptcha(req.body['g-recaptcha-response']);
        if (!isHuman) {
          return res.status(400).json({
            success: false,
            message: 'Security verification failed. Please try again.',
          });
        }
      }

      // ── Normalize and validate donationType ─────────────────
      const normalizedDonationType = resolveDonationType(donationType);

      // ── Generate server-side reference and idempotency key ──
      const reference = paystackService.generateReference(
        normalizedDonationType === 'building_fund' ? 'BLD' : 'GEN'
      );
      const idempotencyKey = paystackService.generateIdempotencyKey(
        email, parsedAmount, categoryId
      );

      const clientIp = getClientIp(req);

      // ── Check for duplicate payment (idempotency) ───────────
      const existingDonation = await donationRepo.findByIdempotencyKey(idempotencyKey);
      if (existingDonation) {
        // Log the duplicate attempt for audit
        await donationRepo.createAuditEntry({
          event_type: 'idempotency_blocked',
          event_source: 'api',
          donation_id: existingDonation.id,
          actor_id: userId,
          paystack_reference: existingDonation.reference,
          amount: parsedAmount,
          description: `Duplicate payment attempt blocked. Original ref: ${existingDonation.reference}`,
          ip_address: clientIp,
        });

        logger.warn(`[PaymentController] Duplicate payment blocked for ${email} (₦${parsedAmount})`);

        // If the existing donation is still pending, return its authorization URL
        if (existingDonation.status === 'pending' && existingDonation.paystack_access_code) {
          return res.json({
            success: true,
            message: 'Payment already initiated. Redirecting to checkout.',
            authorization_url: `https://checkout.paystack.com/${existingDonation.paystack_access_code}`,
            access_code: existingDonation.paystack_access_code,
            reference: existingDonation.reference,
          });
        }

        // If already completed, tell the user
        if (existingDonation.status === 'completed') {
          return res.status(409).json({
            success: false,
            message: 'This payment has already been processed. Please wait 5 minutes before trying again.',
          });
        }
      }

      const donorName = req.user?.user_metadata?.full_name || null;

      // ── Initialize transaction with Paystack API ────────────
      const paystackResult = await paystackService.initializeTransaction({
        email,
        amount: parsedAmount,
        reference,
        metadata: {
          userId: userId || undefined,
          categoryId: categoryId || undefined,
          donationType: normalizedDonationType || undefined,
          notes: notes || undefined,
          idempotencyKey,
          donorName: donorName || undefined,
          custom_fields: [
            { display_name: 'Fund Type', variable_name: 'fund_type', value: normalizedDonationType || 'General' },
            { display_name: 'Reason', variable_name: 'reason', value: notes || 'General Giving' },
            { display_name: 'Donor Name', variable_name: 'donor_name', value: donorName || 'Guest Partner' },
            { display_name: 'Donor Email', variable_name: 'donor_email', value: email },
          ],
        },
      });

      // ── Create pending donation in database ─────────────────
      const donation = await donationRepo.createDonationIntent({
        reference,
        idempotency_key: idempotencyKey,
        amount: parsedAmount,
        donor_email: email,
        donor_name: donorName,
        user_id: userId,
        category_id: categoryId || null,
        donation_type: normalizedDonationType || null,
        notes: notes || null,
        paystack_access_code: paystackResult.access_code,
        ip_address: clientIp,
      });

      // ── Audit log: payment initiated ────────────────────────
      await donationRepo.createAuditEntry({
        event_type: 'initiated',
        event_source: 'api',
        donation_id: donation.duplicate ? null : donation.id,
        actor_id: userId,
        paystack_reference: reference,
        amount: parsedAmount,
        description: `Payment initialized for ${email}. Category: ${normalizedDonationType || 'General'}. Amount: ₦${parsedAmount}`,
        ip_address: clientIp,
      });

      // ── Return authorization URL to frontend ────────────────
      return res.json({
        success: true,
        authorization_url: paystackResult.authorization_url,
        access_code: paystackResult.access_code,
        reference: paystackResult.reference,
      });

    } catch (error) {
      logger.error(`[PaymentController] Initialize error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Could not initialize payment. Please try again.',
      });
    }
  },


  /**
   * ============================================================
   * POST /api/payments/verify
   * ============================================================
   * Server-side payment verification.
   * Called by the frontend after the user completes payment on Paystack.
   * 
   * This endpoint:
   * 1. Verifies the transaction with Paystack API
   * 2. Confirms the amount matches what was initialized
   * 3. Updates the donation status to 'completed'
   * 4. Sends confirmation emails
   * 5. Logs the event to the audit trail
   * 
   * REQUEST BODY:
   * {
   *   reference: string (required, Paystack transaction reference)
   * }
   */
  verifyPayment: async (req, res) => {
    try {
      const { reference } = req.body;
      const userId = req.user?.id || null;
      const clientIp = getClientIp(req);

      if (!reference) {
        return res.status(400).json({
          success: false,
          message: 'Transaction reference is required.',
        });
      }



      // ── Audit: callback received ────────────────────────────
      await donationRepo.createAuditEntry({
        event_type: 'callback_received',
        event_source: 'frontend_callback',
        actor_id: userId,
        paystack_reference: reference,
        description: `Payment verification callback received for reference: ${reference}`,
        ip_address: clientIp,
      });

      // ── Check if already processed (idempotency) ────────────
      const existingDonation = await donationRepo.findByReference(reference);
      if (existingDonation && existingDonation.status === 'completed') {
        logger.info(`[PaymentController] Reference ${reference} already verified and completed.`);
        return res.json({
          success: true,
          message: 'Already processed',
          donation: existingDonation,
        });
      }

      // ── Verify with Paystack API ────────────────────────────
      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) {
        logger.error('[PaymentController] PAYSTACK_SECRET_KEY is not set!');
        return res.status(500).json({
          success: false,
          message: 'Payment configuration error. Please contact support.',
        });
      }

      const paystackData = await paystackService.verifyTransaction(reference);

      // ── Verify transaction status ───────────────────────────
      if (paystackData.status !== 'success') {
        await donationRepo.createAuditEntry({
          event_type: 'failed',
          event_source: 'frontend_callback',
          paystack_reference: reference,
          amount: paystackData.amount ? paystackData.amount / 100 : null,
          description: `Payment verification failed. Paystack status: ${paystackData.status}. Gateway: ${paystackData.gateway_response}`,
          raw_payload: paystackData,
          ip_address: clientIp,
        });

        return res.status(400).json({
          success: false,
          message: `Payment was not successful. Status: ${paystackData.gateway_response || paystackData.status}`,
        });
      }

      // ── Verify amount matches (prevent amount tampering) ────
      if (existingDonation) {
        const expectedAmountKobo = Math.round(existingDonation.amount * 100);
        if (paystackData.amount !== expectedAmountKobo) {
          await donationRepo.createAuditEntry({
            event_type: 'amount_mismatch',
            event_source: 'frontend_callback',
            donation_id: existingDonation.id,
            paystack_reference: reference,
            amount: existingDonation.amount,
            description: `AMOUNT MISMATCH! Expected: ${expectedAmountKobo} kobo, Got: ${paystackData.amount} kobo`,
            raw_payload: paystackData,
            ip_address: clientIp,
          });

          logger.error(`[PaymentController] Amount mismatch for ${reference}! Expected: ${expectedAmountKobo}, Got: ${paystackData.amount}`);

          return res.status(400).json({
            success: false,
            message: 'Payment amount verification failed. Please contact support with your reference.',
          });
        }
      }

      // ── Complete the donation ───────────────────────────────
      const result = await donationRepo.completeDonation(reference, paystackData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message || 'Could not complete donation.',
        });
      }

      // ── Audit: payment verified and completed ───────────────
      await donationRepo.createAuditEntry({
        event_type: result.alreadyProcessed ? 'duplicate_blocked' : 'verified',
        event_source: 'frontend_callback',
        donation_id: result.donation?.id,
        actor_id: userId,
        paystack_reference: reference,
        amount: paystackData.amount / 100,
        description: result.alreadyProcessed
          ? `Duplicate verification blocked for reference: ${reference}`
          : `Payment verified successfully. Channel: ${paystackData.channel}. Fee: ₦${(paystackData.fees || 0) / 100}`,
        raw_payload: {
          channel: paystackData.channel,
          fees: paystackData.fees,
          gateway_response: paystackData.gateway_response,
          paid_at: paystackData.paid_at,
        },
        ip_address: clientIp,
      });

      // ── Send emails (only if not already processed) ─────────
      if (!result.alreadyProcessed && result.donation) {
        const donorEmail = result.donation.donor_email || paystackData.customer?.email;
        const donorName = result.donation.donor_name || paystackData.customer?.first_name || 'Ambassador';
        const amountNaira = paystackData.amount / 100;

        // Send Donation Success Email to donor
        try {
          await emailService.sendDonationSuccessEmail({
            to: donorEmail,
            name: donorName,
            amount: amountNaira,
            reference,
            categoryName: result.donation.donation_type || 'General Giving',
            userId,
            donationId: result.donation.id,
          });
        } catch (emailErr) {
          // Email failure should never crash the payment flow
          logger.error(`[PaymentController] Donor email failed: ${emailErr.message}`);
        }

        // Send Admin Alert
        try {
          await emailService.sendAdminDonationAlert({
            amount: amountNaira,
            reference,
            email: donorEmail,
            categoryId: result.donation.category_id,
            donorName: donorName,
          });
        } catch (emailErr) {
          logger.error(`[PaymentController] Admin alert email failed: ${emailErr.message}`);
        }
      }

      return res.json({
        success: true,
        donation: result.donation,
        message: result.alreadyProcessed ? 'Already processed' : 'Payment completed successfully!',
      });

    } catch (error) {
      logger.error(`[PaymentController] Verify error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error verifying payment. Please contact support with your reference.',
      });
    }
  },


  /**
   * ============================================================
   * POST /api/payments/webhook
   * ============================================================
   * Paystack webhook handler.
   * This is the BACKUP verification path — Paystack sends webhooks
   * for all transaction events (success, failure, etc.).
   * 
   * SECURITY: Validates the x-paystack-signature header using
   * HMAC-SHA512 with timing-safe comparison.
   * 
   * IDEMPOTENCY: If the donation is already completed, the webhook
   * is acknowledged with 200 OK but no further action is taken.
   * 
   * IMPORTANT: Always return 200 to Paystack, even on errors.
   * Returning non-200 causes Paystack to retry the webhook.
   */
  handleWebhook: async (req, res) => {
    try {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      const signature = req.headers['x-paystack-signature'];

      // ── Validate webhook signature ──────────────────────────
      if (!secret || !signature) {
        logger.warn('[PaymentController] Webhook received without secret or signature.');
        return res.sendStatus(401);
      }

      const isValid = paystackService.verifyWebhookSignature(signature, req.body, secret);
      if (!isValid) {
        // Audit: invalid signature attempt
        await donationRepo.createAuditEntry({
          event_type: 'signature_invalid',
          event_source: 'webhook',
          description: 'Webhook received with invalid HMAC signature. Possible spoofing attempt.',
          raw_payload: { headers: { 'x-paystack-signature': signature } },
          ip_address: getClientIp(req),
        });

        logger.error('[PaymentController] Invalid webhook signature!');
        return res.sendStatus(401);
      }

      const event = req.body;
      logger.info(`[PaymentController] Webhook event: ${event.event}`);

      // ── Handle charge.success ───────────────────────────────
      if (event.event === 'charge.success') {
        const paystackData = event.data;
        const { reference, amount, metadata, customer } = paystackData;

        // Audit: webhook received
        await donationRepo.createAuditEntry({
          event_type: 'webhook_received',
          event_source: 'webhook',
          paystack_reference: reference,
          amount: amount / 100,
          description: `Webhook charge.success for ${customer?.email}. Channel: ${paystackData.channel}. Gateway: ${paystackData.gateway_response}`,
          raw_payload: paystackData,
          ip_address: getClientIp(req),
        });

        // Check if donation exists
        const existing = await donationRepo.findByReference(reference);

        if (!existing) {
          // Donation was not created by our server (e.g. direct Paystack dashboard charge)
          // Create the donation record retroactively
          logger.info(`[PaymentController] Webhook: No pending donation for ${reference}. Creating retroactively.`);

          const webhookDonationType = resolveDonationType(metadata?.donationType);

          const donation = await donationRepo.createDonationIntent({
            reference,
            idempotency_key: `webhook-${reference}`, // Unique key for webhook-created donations
            amount: amount / 100,
            donor_email: customer?.email,
            donor_name: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || null,
            user_id: metadata?.userId || null,
            category_id: metadata?.categoryId || null,
            donation_type: webhookDonationType || null,
            notes: metadata?.notes || null,
            ip_address: paystackData.ip_address,
          });

          if (!donation.duplicate) {
            await donationRepo.completeDonation(reference, paystackData);
          }
        } else if (existing.status === 'completed') {
          // Already processed — skip
          logger.info(`[PaymentController] Webhook: ${reference} already completed. Skipping.`);

          await donationRepo.createAuditEntry({
            event_type: 'duplicate_blocked',
            event_source: 'webhook',
            donation_id: existing.id,
            paystack_reference: reference,
            amount: amount / 100,
            description: `Webhook duplicate blocked. Donation already completed.`,
          });
        } else {
          // Pending donation exists — complete it
          const result = await donationRepo.completeDonation(reference, paystackData);

          if (result.success && !result.alreadyProcessed && result.donation) {
            // Send emails
            const donorEmail = result.donation.donor_email || customer?.email;
            const donorName = result.donation.donor_name || customer?.first_name || 'Ambassador';

            try {
              await emailService.sendDonationSuccessEmail({
                to: donorEmail,
                name: donorName,
                amount: amount / 100,
                reference,
                categoryName: result.donation.donation_type || 'General Giving',
                userId: result.donation.user_id,
                donationId: result.donation.id,
              });
            } catch (emailErr) {
              logger.error(`[PaymentController] Webhook donor email failed: ${emailErr.message}`);
            }

            try {
              await emailService.sendAdminDonationAlert({
                amount: amount / 100,
                reference,
                email: donorEmail,
                categoryId: result.donation.category_id,
                donorName,
              });
            } catch (emailErr) {
              logger.error(`[PaymentController] Webhook admin email failed: ${emailErr.message}`);
            }
          }
        }
      }

      // ── Handle charge.failed ────────────────────────────────
      else if (event.event === 'charge.failed') {
        const { reference, message, customer } = event.data;

        logger.warn(`[PaymentController] Webhook charge.failed for ${customer?.email}: ${message} (Ref: ${reference})`);

        // Audit: payment failed
        await donationRepo.createAuditEntry({
          event_type: 'failed',
          event_source: 'webhook',
          paystack_reference: reference,
          description: `Charge failed for ${customer?.email}. Reason: ${message}`,
          raw_payload: event.data,
          ip_address: getClientIp(req),
        });

        // Mark the donation as failed if it exists
        try {
          await donationRepo.markDonationFailed(reference, message);
        } catch {
          // Donation might not exist yet — that's fine
        }

        // Notify the user about the failure
        try {
          if (customer?.email) {
            await emailService.sendDonationFailedEmail({
              to: customer.email,
              name: customer.first_name || 'Ambassador',
              reason: message,
              reference,
            });
          }
        } catch (emailErr) {
          logger.error(`[PaymentController] Failed email notification error: ${emailErr.message}`);
        }
      }

      // ── Always return 200 to Paystack ───────────────────────
      // Non-200 responses cause Paystack to retry the webhook
      return res.sendStatus(200);

    } catch (error) {
      logger.error(`[PaymentController] Webhook error: ${error.message}`);
      // Still return 200 to prevent Paystack retries
      return res.sendStatus(200);
    }
  },


  /**
   * ============================================================
   * GET /api/payments/categories
   * ============================================================
   * Fetch active donation categories for the giving page.
   * Public endpoint — no authentication required.
   */
  getCategories: async (req, res) => {
    try {
      const categories = await donationRepo.getActiveCategories();
      return res.json({ success: true, categories });
    } catch (error) {
      logger.error(`[PaymentController] Get categories error: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Could not load categories.' });
    }
  },


  /**
   * ============================================================
   * GET /api/payments/history
   * ============================================================
   * Fetch the authenticated user's donation history.
   * Requires authentication.
   */
  getPaymentHistory: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const donations = await donationRepo.getUserDonationHistory(userId);
      return res.json({ success: true, donations });
    } catch (error) {
      logger.error(`[PaymentController] Payment history error: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Could not load payment history.' });
    }
  },


  /**
   * ============================================================
   * GET /api/payments/admin/summary
   * ============================================================
   * Fetch admin financial summary — stats + withdrawal breakdown.
   * Requires admin role.
   */
  getAdminSummary: async (req, res) => {
    try {
      const [stats, withdrawalSummary] = await Promise.all([
        donationRepo.getAdminStats(),
        donationRepo.getWithdrawalSummary(),
      ]);

      return res.json({
        success: true,
        stats,
        withdrawalSummary,
      });
    } catch (error) {
      logger.error(`[PaymentController] Admin summary error: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Could not load financial summary.' });
    }
  },


  /**
   * ============================================================
   * GET /api/payments/admin/transactions
   * ============================================================
   * Fetch filtered donations for admin panel.
   * Supports category, status, channel, type, and date filters.
   * Requires admin role.
   * 
   * QUERY PARAMS:
   * - categoryId: UUID
   * - status: pending|completed|failed|refunded
   * - channel: card|bank_transfer|ussd|qr|mobile_money
   * - donationType: tithe|offering|seed|building_fund
   * - from: ISO date string
   * - to: ISO date string
   * - limit: number (default 100)
   * - offset: number (default 0)
   */
  getAdminTransactions: async (req, res) => {
    try {
      const { categoryId, status, channel, donationType, from, to, limit, offset } = req.query;

      const result = await donationRepo.getAdminDonations({
        categoryId,
        status,
        channel,
        donationType,
        from,
        to,
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0,
      });

      return res.json({
        success: true,
        donations: result.donations,
        total: result.count,
      });
    } catch (error) {
      logger.error(`[PaymentController] Admin transactions error: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Could not load transactions.' });
    }
  },


  /**
   * ============================================================
   * GET /api/payments/admin/audit-log
   * ============================================================
   * Fetch payment audit log entries.
   * Requires super_admin role.
   */
  getAdminAuditLog: async (req, res) => {
    try {
      const { donationId, reference, eventType, limit } = req.query;

      const entries = await donationRepo.getAuditLog({
        donationId,
        reference,
        eventType,
        limit: parseInt(limit) || 50,
      });

      return res.json({ success: true, entries });
    } catch (error) {
      logger.error(`[PaymentController] Audit log error: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Could not load audit log.' });
    }
  },


  /**
   * ============================================================
   * POST /api/payments/admin/sync-paystack
   * ============================================================
   * Sync recent Paystack transactions to the local database.
   * Fetches transactions from Paystack API and reconciles
   * with local donation records.
   * Requires admin role.
   */
  syncPaystack: async (req, res) => {
    try {
      const { from, to, page = 1 } = req.body;

      const { transactions, meta } = await paystackService.listTransactions({
        from,
        to,
        page: parseInt(page),
        perPage: 50,
        status: 'success',
      });

      let synced = 0;
      let skipped = 0;

      for (const txn of transactions) {
        const existing = await donationRepo.findByReference(txn.reference);

        if (existing) {
          skipped++;
          continue;
        }

        const syncDonationType = resolveDonationType(txn.metadata?.donationType);

        // Create and complete the donation record
        const donation = await donationRepo.createDonationIntent({
          reference: txn.reference,
          idempotency_key: `sync-${txn.reference}`,
          amount: txn.amount / 100,
          donor_email: txn.customer?.email,
          donor_name: `${txn.customer?.first_name || ''} ${txn.customer?.last_name || ''}`.trim() || null,
          user_id: txn.metadata?.userId || null,
          category_id: txn.metadata?.categoryId || null,
          donation_type: syncDonationType || null,
          ip_address: txn.ip_address,
        });

        if (!donation.duplicate) {
          await donationRepo.completeDonation(txn.reference, txn);
          synced++;
        } else {
          skipped++;
        }
      }

      // Audit: sync completed
      await donationRepo.createAuditEntry({
        event_type: 'admin_sync',
        event_source: 'admin_manual',
        actor_id: req.user?.id,
        description: `Paystack sync completed. Synced: ${synced}, Skipped: ${skipped}, Total from API: ${transactions.length}`,
        ip_address: getClientIp(req),
      });

      return res.json({
        success: true,
        synced,
        skipped,
        total: transactions.length,
        meta,
      });
    } catch (error) {
      logger.error(`[PaymentController] Sync error: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Paystack sync failed.' });
    }
  },
};
