-- ============================================================
-- 13_FIX_DONATION_TRIGGER_STATUS
-- ============================================================
-- Fixes the database trigger function `update_donation_category_stats`
-- which was comparing `status` against `'success'`.
--
-- Since `status` is of type `donation_status` enum, and the enum
-- only allows 'pending', 'completed', 'failed', 'refunded', 'cancelled'
-- (not 'success'), any insert or update on the donations table crashed
-- with a check constraint / enum type validation error.
--
-- This migration updates all references of `'success'` to `'completed'`.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_donation_category_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.status = 'completed' THEN
            UPDATE donation_categories 
            SET current_amount = current_amount + NEW.amount,
                donor_count = (SELECT count(DISTINCT user_id) FROM donations WHERE category_id = NEW.category_id AND status = 'completed')
            WHERE id = NEW.category_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.status = 'completed' THEN
            UPDATE donation_categories 
            SET current_amount = current_amount - OLD.amount,
                donor_count = (SELECT count(DISTINCT user_id) FROM donations WHERE category_id = OLD.category_id AND status = 'completed')
            WHERE id = OLD.category_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Handle status changes (e.g. pending -> completed)
        IF OLD.status <> 'completed' AND NEW.status = 'completed' THEN
             UPDATE donation_categories 
             SET current_amount = current_amount + NEW.amount,
                 donor_count = (SELECT count(DISTINCT user_id) FROM donations WHERE category_id = NEW.category_id AND status = 'completed')
             WHERE id = NEW.category_id;
        ELSIF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
             UPDATE donation_categories 
             SET current_amount = current_amount - OLD.amount,
                 donor_count = (SELECT count(DISTINCT user_id) FROM donations WHERE category_id = OLD.category_id AND status = 'completed')
             WHERE id = OLD.category_id;
        ELSIF OLD.status = 'completed' AND NEW.status = 'completed' AND OLD.amount <> NEW.amount THEN
             UPDATE donation_categories SET current_amount = current_amount - OLD.amount + NEW.amount WHERE id = NEW.category_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
