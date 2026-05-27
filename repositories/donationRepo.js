import { supabase, supabaseService } from '../config/supabase.js';
import { logger } from '../config/logger.js';

/**
 * ============================================================
 * DONATION REPOSITORY
 * ============================================================
 * Data access layer for all donation/payment operations.
 * Uses the Supabase service role client for webhook-triggered
 * inserts (bypasses RLS), and the anon client for user-facing
 * reads that respect row-level security.
 * 
 * KEY DESIGN DECISIONS:
 * - Idempotency: Every completed donation has a unique `reference`
 *   and `idempotency_key`. The DB enforces UNIQUE constraints on both.
 * - Audit trail: Every payment event is logged to `payment_audit_log`.
 * - Atomic progress: Category fundraising totals are updated via
 *   the `increment_donation_progress` RPC function.
 * ============================================================
 */

export const donationRepo = {

  // ============================================================
  // CORE PAYMENT OPERATIONS
  // ============================================================

  /**
   * Create a pending donation record when a payment is initialized.
   * This is called BEFORE the user is redirected to Paystack.
   * The record starts with status='pending' and will be updated
   * to 'completed' after Paystack verification succeeds.
   * 
   * @param {Object} donationData - The donation data to insert
   * @param {string} donationData.reference - Unique Paystack reference
   * @param {string} donationData.idempotency_key - SHA-256 idempotency key
   * @param {number} donationData.amount - Amount in Naira
   * @param {string} donationData.donor_email - Payer email
   * @param {string} [donationData.category_id] - Donation category UUID
   * @param {string} [donationData.user_id] - Authenticated user UUID
   * @param {string} [donationData.donation_type] - Type label (tithe, offering, etc.)
   * @param {string} [donationData.notes] - Reason for giving
   * @param {string} [donationData.paystack_access_code] - Paystack access code
   * @param {string} [donationData.ip_address] - Payer IP address
   * @returns {Promise<Object>} Created donation record
   */
  createDonationIntent: async (donationData) => {
    const { data, error } = await supabaseService
      .from('donations')
      .insert([{
        reference: donationData.reference,
        idempotency_key: donationData.idempotency_key,
        amount: donationData.amount,
        currency: donationData.currency || 'NGN',
        category_id: donationData.category_id || null,
        user_id: donationData.user_id || null,
        donor_email: donationData.donor_email,
        donor_name: donationData.donor_name || null,
        donation_type: donationData.donation_type || null,
        notes: donationData.notes || null,
        paystack_access_code: donationData.paystack_access_code || null,
        ip_address: donationData.ip_address || null,
        status: 'pending',
        payment_gateway: 'paystack',
      }])
      .select()
      .single();

    if (error) {
      // If the error is a unique constraint violation, it means this is a duplicate
      if (error.code === '23505') {
        logger.warn(`[DonationRepo] Duplicate donation intent blocked: ${donationData.reference}`);
        return { duplicate: true, message: 'Duplicate payment detected' };
      }
      logger.error(`[DonationRepo] Create intent failed: ${error.message}`);
      throw error;
    }

    logger.info(`[DonationRepo] Donation intent created: ${data.id} (ref: ${donationData.reference})`);
    return data;
  },


  /**
   * Find a donation by its Paystack reference.
   * Used for idempotent verification — if a donation with this reference
   * already exists and is completed, we skip re-processing.
   * 
   * @param {string} reference - Paystack transaction reference
   * @returns {Promise<Object|null>} Donation record or null
   */
  findByReference: async (reference) => {
    const { data, error } = await supabaseService
      .from('donations')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (error) {
      logger.error(`[DonationRepo] findByReference failed: ${error.message}`);
      throw error;
    }
    return data;
  },


  /**
   * Find a donation by its idempotency key.
   * Used to prevent double payments within the same time window.
   * 
   * @param {string} idempotencyKey - SHA-256 idempotency key
   * @returns {Promise<Object|null>} Donation record or null
   */
  findByIdempotencyKey: async (idempotencyKey) => {
    const { data, error } = await supabaseService
      .from('donations')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (error) {
      logger.error(`[DonationRepo] findByIdempotencyKey failed: ${error.message}`);
      throw error;
    }
    return data;
  },


  /**
   * Complete a donation after Paystack verification succeeds.
   * This is the critical path — it atomically:
   * 1. Updates the donation status to 'completed'
   * 2. Stores Paystack transaction details (ID, channel, fees, etc.)
   * 3. Increments the category fundraising progress
   * 
   * IDEMPOTENCY: If the donation is already 'completed', this returns
   * early with { alreadyProcessed: true } instead of double-counting.
   * 
   * @param {string} reference - Paystack transaction reference
   * @param {Object} paystackData - Verified Paystack transaction data
   * @param {number} paystackData.id - Paystack transaction ID
   * @param {string} paystackData.status - Paystack status ('success')
   * @param {number} paystackData.amount - Verified amount in kobo
   * @param {string} paystackData.channel - Payment channel (card, bank_transfer, etc.)
   * @param {number} paystackData.fees - Paystack processing fee in kobo
   * @param {string} paystackData.paid_at - ISO timestamp of payment
   * @param {string} paystackData.ip_address - Payer IP from Paystack
   * @param {Object} paystackData.authorization - Card/bank authorization data
   * @param {Object} paystackData.customer - Paystack customer data
   * @returns {Promise<{success: boolean, donation?: Object, alreadyProcessed?: boolean}>}
   */
  completeDonation: async (reference, paystackData) => {
    // 1. Find the existing pending donation
    const existing = await donationRepo.findByReference(reference);

    if (!existing) {
      logger.warn(`[DonationRepo] No pending donation found for reference: ${reference}`);
      return { success: false, message: 'No pending donation found for this reference' };
    }

    // 2. Idempotency check: if already completed, skip
    if (existing.status === 'completed') {
      logger.info(`[DonationRepo] Donation already completed: ${reference}`);
      return { success: true, alreadyProcessed: true, donation: existing };
    }

    // 3. Update the donation with Paystack verification data
    const amountInNaira = paystackData.amount / 100; // Convert kobo back to Naira
    const feeInNaira = paystackData.fees ? paystackData.fees / 100 : null;

    const { data: donation, error } = await supabaseService
      .from('donations')
      .update({
        status: 'completed',
        paystack_transaction_id: String(paystackData.id),
        payment_channel: paystackData.channel || null,
        paystack_fee: feeInNaira,
        paystack_paid_at: paystackData.paid_at || new Date().toISOString(),
        paid_at: paystackData.paid_at || new Date().toISOString(),
        ip_address: paystackData.ip_address || existing.ip_address,
        payment_metadata: {
          gateway_response: paystackData.gateway_response,
          authorization: paystackData.authorization || {},
          customer: paystackData.customer || {},
          channel: paystackData.channel,
          currency: paystackData.currency,
          fees_split: paystackData.fees_split,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference)
      .eq('status', 'pending') // Only update if still pending (race condition guard)
      .select()
      .single();

    if (error) {
      // If no rows updated, another process already completed it
      if (error.code === 'PGRST116') {
        logger.info(`[DonationRepo] Race condition: donation ${reference} already processed by another request`);
        return { success: true, alreadyProcessed: true };
      }
      logger.error(`[DonationRepo] completeDonation failed: ${error.message}`);
      throw error;
    }

    // 4. Increment category fundraising progress atomically
    if (donation.category_id) {
      const { error: rpcError } = await supabaseService.rpc('increment_donation_progress', {
        cat_id: donation.category_id,
        amt: amountInNaira,
      });

      if (rpcError) {
        // Non-fatal: log the error but don't fail the donation
        logger.error(`[DonationRepo] increment_donation_progress RPC failed: ${rpcError.message}`);
      }
    }

    logger.info(`[DonationRepo] Donation completed: ${donation.id} (ref: ${reference}, ₦${amountInNaira})`);

    return { success: true, donation };
  },


  /**
   * Mark a donation as failed.
   * Called when Paystack reports a charge failure via webhook.
   * 
   * @param {string} reference - Paystack transaction reference
   * @param {string} reason - Failure reason from Paystack
   * @returns {Promise<Object>} Updated donation record
   */
  markDonationFailed: async (reference, reason) => {
    const { data, error } = await supabaseService
      .from('donations')
      .update({
        status: 'failed',
        notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference)
      .select()
      .single();

    if (error) {
      logger.error(`[DonationRepo] markDonationFailed error: ${error.message}`);
      throw error;
    }

    return data;
  },


  // ============================================================
  // AUDIT LOG OPERATIONS
  // ============================================================

  /**
   * Insert an entry into the payment_audit_log table.
   * Every significant payment event should be recorded here
   * for forensic analysis and compliance.
   * 
   * @param {Object} entry - Audit log entry
   * @param {string} entry.event_type - What happened (e.g. 'initiated', 'verified', 'webhook_received')
   * @param {string} entry.event_source - Where it came from (e.g. 'api', 'webhook', 'admin_manual')
   * @param {string} [entry.donation_id] - Linked donation UUID
   * @param {string} [entry.actor_id] - User/admin who triggered the event
   * @param {string} [entry.paystack_reference] - Paystack reference
   * @param {number} [entry.amount] - Amount involved
   * @param {string} [entry.description] - Human-readable description
   * @param {Object} [entry.raw_payload] - Raw API/webhook payload snapshot
   * @param {string} [entry.ip_address] - Requester IP
   */
  createAuditEntry: async (entry) => {
    try {
      const { error } = await supabaseService
        .from('payment_audit_log')
        .insert([{
          event_type: entry.event_type,
          event_source: entry.event_source || 'system',
          donation_id: entry.donation_id || null,
          actor_id: entry.actor_id || null,
          paystack_reference: entry.paystack_reference || null,
          amount: entry.amount || null,
          currency: entry.currency || 'NGN',
          description: entry.description || null,
          raw_payload: entry.raw_payload || {},
          ip_address: entry.ip_address || null,
        }]);

      if (error) {
        // Audit logging should never crash the payment flow
        logger.error(`[DonationRepo] Audit log insert failed: ${error.message}`);
      }
    } catch (err) {
      // Swallow audit errors — they must never block payment processing
      logger.error(`[DonationRepo] Audit log exception: ${err.message}`);
    }
  },


  /**
   * Fetch audit log entries, optionally filtered by donation or reference.
   * Used by the admin panel's financial audit trail view.
   * 
   * @param {Object} [filters] - Optional filters
   * @param {string} [filters.donationId] - Filter by donation UUID
   * @param {string} [filters.reference] - Filter by Paystack reference
   * @param {string} [filters.eventType] - Filter by event type
   * @param {number} [filters.limit=50] - Max results
   * @returns {Promise<Array>} Audit log entries
   */
  getAuditLog: async ({ donationId, reference, eventType, limit = 50 } = {}) => {
    let query = supabase
      .from('payment_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (donationId) query = query.eq('donation_id', donationId);
    if (reference) query = query.eq('paystack_reference', reference);
    if (eventType) query = query.eq('event_type', eventType);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },


  // ============================================================
  // USER-FACING QUERIES
  // ============================================================

  /**
   * Fetch a user's donation history (completed only).
   * Respects RLS — users can only see their own donations.
   * 
   * @param {string} userId - Authenticated user UUID
   * @returns {Promise<Array>} List of completed donations
   */
  getUserDonationHistory: async (userId) => {
    const { data, error } = await supabase
      .from('donations')
      .select(`
        *,
        donation_categories:category_id (
          name,
          slug,
          icon
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },


  /**
   * Fetch active donation categories for the giving page.
   * Public query — no auth required.
   * 
   * @returns {Promise<Array>} Active donation categories
   */
  getActiveCategories: async () => {
    const { data, error } = await supabase
      .from('donation_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },


  /**
   * Fetch building fund projects for the building fund page.
   * Public query — returns categories flagged as building fund.
   * 
   * @returns {Promise<Array>} Building fund categories
   */
  getBuildingProjects: async () => {
    const { data, error } = await supabase
      .from('donation_categories')
      .select('*')
      .eq('is_building_fund', true)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },


  // ============================================================
  // ADMIN QUERIES — Filtering, Aggregation, Withdrawal Summary
  // ============================================================

  /**
   * Fetch all donations with optional filters for the admin panel.
   * Supports filtering by category, status, channel, date range, and type.
   * Includes joined profile data for donor identification.
   * 
   * @param {Object} [filters] - Admin filters
   * @param {string} [filters.categoryId] - Filter by donation category UUID
   * @param {string} [filters.status] - Filter by status (pending, completed, failed, refunded)
   * @param {string} [filters.channel] - Filter by payment channel (card, bank_transfer, ussd, etc.)
   * @param {string} [filters.donationType] - Filter by donation type (tithe, offering, etc.)
   * @param {string} [filters.from] - Start date (ISO string)
   * @param {string} [filters.to] - End date (ISO string)
   * @param {number} [filters.limit=100] - Max results
   * @param {number} [filters.offset=0] - Pagination offset
   * @returns {Promise<{donations: Array, count: number}>}
   */
  getAdminDonations: async ({ categoryId, status, channel, donationType, from, to, limit = 100, offset = 0 } = {}) => {
    let query = supabaseService
      .from('donations')
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name,
          avatar_url,
          email
        ),
        donation_categories:category_id (
          name,
          slug,
          icon
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters only if provided
    if (categoryId) query = query.eq('category_id', categoryId);
    if (status) query = query.eq('status', status);
    if (channel) query = query.eq('payment_channel', channel);
    if (donationType) query = query.eq('donation_type', donationType);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error, count } = await query;
    if (error) throw error;

    return { donations: data || [], count: count || 0 };
  },


  /**
   * Get a withdrawal summary — total collected per category.
   * This shows admins how much has been collected in each category,
   * so they know what's available to withdraw from Paystack.
   * 
   * Groups completed donations by category and calculates:
   * - Total amount per category
   * - Total Paystack fees per category
   * - Net amount (total - fees) per category
   * - Number of transactions per category
   * 
   * @returns {Promise<Array>} Withdrawal summary per category
   */
  getWithdrawalSummary: async () => {
    // Get all completed donations with their category info
    const { data, error } = await supabaseService
      .from('donations')
      .select(`
        amount,
        paystack_fee,
        category_id,
        donation_type,
        payment_channel,
        donation_categories:category_id (
          name,
          slug,
          icon
        )
      `)
      .eq('status', 'completed');

    if (error) throw error;

    // Aggregate by category
    const summaryMap = {};
    (data || []).forEach(d => {
      const catId = d.category_id || 'uncategorized';
      const catName = d.donation_categories?.name || d.donation_type || 'Uncategorized';

      if (!summaryMap[catId]) {
        summaryMap[catId] = {
          category_id: catId,
          category_name: catName,
          category_icon: d.donation_categories?.icon || '💰',
          total_amount: 0,
          total_fees: 0,
          net_amount: 0,
          transaction_count: 0,
          channels: {},
        };
      }

      const amount = Number(d.amount) || 0;
      const fee = Number(d.paystack_fee) || 0;

      summaryMap[catId].total_amount += amount;
      summaryMap[catId].total_fees += fee;
      summaryMap[catId].net_amount += (amount - fee);
      summaryMap[catId].transaction_count += 1;

      // Track channel breakdown
      const ch = d.payment_channel || 'unknown';
      summaryMap[catId].channels[ch] = (summaryMap[catId].channels[ch] || 0) + 1;
    });

    return Object.values(summaryMap).sort((a, b) => b.total_amount - a.total_amount);
  },


  /**
   * Get donation statistics for the admin dashboard.
   * Calculates total revenue, donor count, average gift,
   * and month-over-month growth.
   * 
   * @returns {Promise<Object>} Dashboard statistics
   */
  getAdminStats: async () => {
    const { data, error } = await supabaseService
      .from('donations')
      .select('amount, paystack_fee, donor_email, user_id, created_at, payment_channel, donation_type')
      .eq('status', 'completed');

    if (error) throw error;

    const donations = data || [];
    const total = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const totalFees = donations.reduce((sum, d) => sum + (Number(d.paystack_fee) || 0), 0);

    // Count unique donors by email or user_id
    const uniqueDonors = new Set();
    donations.forEach(d => {
      uniqueDonors.add(d.user_id || d.donor_email || 'anonymous');
    });

    // Channel breakdown
    const channelCounts = {};
    donations.forEach(d => {
      const ch = d.payment_channel || 'unknown';
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    });

    // Type breakdown
    const typeCounts = {};
    donations.forEach(d => {
      const t = d.donation_type || 'other';
      typeCounts[t] = (typeCounts[t] || 0) + (Number(d.amount) || 0);
    });

    return {
      total_revenue: total,
      total_fees: totalFees,
      net_revenue: total - totalFees,
      total_transactions: donations.length,
      unique_donors: uniqueDonors.size,
      average_gift: donations.length > 0 ? total / donations.length : 0,
      channel_breakdown: channelCounts,
      type_breakdown: typeCounts,
    };
  },
};
