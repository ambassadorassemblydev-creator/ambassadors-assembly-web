-- ============================================================
-- MIGRATION 12: PAYSTACK PAYMENT SYSTEM OVERHAUL
-- Applied: 2026-05-27
-- Description: Remove all Stripe references, add proper Paystack
--              columns, idempotency protection, payment audit log,
--              and increment_donation_progress RPC.
-- ============================================================


-- ============================================================
-- 1. DONATIONS TABLE — Drop Stripe, Add Paystack + Idempotency
-- ============================================================

-- Drop all Stripe columns (0 rows existed, safe to drop)
ALTER TABLE public.donations DROP COLUMN IF EXISTS stripe_payment_intent_id;
ALTER TABLE public.donations DROP COLUMN IF EXISTS stripe_charge_id;
ALTER TABLE public.donations DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE public.donations DROP COLUMN IF EXISTS stripe_receipt_url;
ALTER TABLE public.donations DROP COLUMN IF EXISTS stripe_fee;
DROP INDEX IF EXISTS idx_donations_stripe_pi;

-- Rename paystack_reference → reference (canonical Paystack transaction reference)
ALTER TABLE public.donations RENAME COLUMN paystack_reference TO reference;

-- Add idempotency key for double-payment prevention at DB level
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Add Paystack fee tracking
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS paystack_fee DECIMAL(10, 2);

-- Add Paystack confirmed-paid timestamp
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS paystack_paid_at TIMESTAMPTZ;

-- Add payment gateway identifier for audit clarity
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'paystack';

-- Add payer IP address for fraud detection
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Add raw Paystack webhook data snapshot for forensic analysis
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS payment_metadata JSONB DEFAULT '{}';

-- Fix currency default from GBP to NGN
ALTER TABLE public.donations ALTER COLUMN currency SET DEFAULT 'NGN';

-- Unique constraints
ALTER TABLE public.donations ADD CONSTRAINT donations_reference_unique UNIQUE (reference);
ALTER TABLE public.donations ADD CONSTRAINT donations_idempotency_key_unique UNIQUE (idempotency_key);

-- Performance indexes for admin filtering
CREATE INDEX IF NOT EXISTS idx_donations_reference ON public.donations(reference);
CREATE INDEX IF NOT EXISTS idx_donations_paystack_txn ON public.donations(paystack_transaction_id);
CREATE INDEX IF NOT EXISTS idx_donations_donation_type ON public.donations(donation_type);
CREATE INDEX IF NOT EXISTS idx_donations_payment_channel ON public.donations(payment_channel);
CREATE INDEX IF NOT EXISTS idx_donations_payment_gateway ON public.donations(payment_gateway);
CREATE INDEX IF NOT EXISTS idx_donations_idempotency ON public.donations(idempotency_key);


-- ============================================================
-- 2. RECURRING DONATIONS — Drop Stripe, Add Paystack
-- ============================================================

ALTER TABLE public.recurring_donations DROP COLUMN IF EXISTS stripe_subscription_id;
ALTER TABLE public.recurring_donations DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE public.recurring_donations DROP COLUMN IF EXISTS stripe_price_id;
DROP INDEX IF EXISTS idx_recurring_donations_stripe;

ALTER TABLE public.recurring_donations ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT;
ALTER TABLE public.recurring_donations ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT;
ALTER TABLE public.recurring_donations ADD COLUMN IF NOT EXISTS paystack_plan_code TEXT;
ALTER TABLE public.recurring_donations ADD COLUMN IF NOT EXISTS paystack_email_token TEXT;

ALTER TABLE public.recurring_donations ADD CONSTRAINT recurring_donations_paystack_sub_unique UNIQUE (paystack_subscription_code);
CREATE INDEX IF NOT EXISTS idx_recurring_donations_paystack ON public.recurring_donations(paystack_subscription_code);
CREATE INDEX IF NOT EXISTS idx_recurring_donations_customer ON public.recurring_donations(paystack_customer_code);


-- ============================================================
-- 3. EVENT REGISTRATIONS — Stripe → Paystack
-- ============================================================

ALTER TABLE public.event_registrations RENAME COLUMN stripe_payment_id TO paystack_reference;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS paystack_transaction_id TEXT;


-- ============================================================
-- 4. GIVING STATEMENTS — Fix currency default
-- ============================================================

ALTER TABLE public.giving_statements ALTER COLUMN currency SET DEFAULT 'NGN';


-- ============================================================
-- 5. PAYMENT AUDIT LOG — Dedicated forensic audit trail
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID REFERENCES public.donations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  -- Valid: 'initiated', 'callback_received', 'verified', 'webhook_received',
  -- 'duplicate_blocked', 'idempotency_blocked', 'completed', 'failed',
  -- 'refunded', 'admin_manual_entry', 'admin_deleted', 'amount_mismatch',
  -- 'signature_invalid'

  event_source TEXT NOT NULL DEFAULT 'system',
  -- Valid: 'frontend_callback', 'webhook', 'admin_manual', 'system', 'api'

  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  paystack_reference TEXT,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'NGN',
  description TEXT,
  raw_payload JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_donation ON public.payment_audit_log(donation_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_type ON public.payment_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_audit_reference ON public.payment_audit_log(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_payment_audit_actor ON public.payment_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created ON public.payment_audit_log(created_at DESC);

ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_payment_audit" ON public.payment_audit_log FOR ALL USING (is_admin());


-- ============================================================
-- 6. RPC: increment_donation_progress
-- Atomic counter for category fundraising progress
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_donation_progress(
  cat_id UUID,
  amt DECIMAL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.donation_categories
  SET
    current_amount = COALESCE(current_amount, 0) + amt,
    donor_count = COALESCE(donor_count, 0) + 1,
    updated_at = NOW()
  WHERE id = cat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- DONE! Paystack payment system migration complete. 🎉
-- ============================================================
