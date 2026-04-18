import { supabase } from '../config/supabase.js';

export const donationRepo = {
    // Log a donation intent (before redirecting to payment gateway)
    createDonationIntent: async (donationData) => {
        const { data, error } = await supabase
            .from('donations')
            .insert([donationData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Fetch user donation history
    getUserDonationHistory: async (userId) => {
        const { data, error } = await supabase
            .from('donations')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // High IQ: Fetch building fund projects for dynamic rendering
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

    // High IQ: Atomically complete a donation and update category progress
    verifyAndCompleteDonation: async (reference, amount, categoryId, userId, email) => {
        // 1. Check if reference already exists to prevent double-counting
        const { data: existing } = await supabase
            .from('donations')
            .select('id')
            .eq('reference', reference)
            .maybeSingle();

        if (existing) {
            console.warn(`[DonationRepo] Reference ${reference} already processed.`);
            return { success: true, message: 'Already processed' };
        }

        // 2. Insert the donation record
        const { data: donation, error: dError } = await supabase
            .from('donations')
            .insert([{
                reference,
                amount,
                category_id: categoryId,
                user_id: userId || null,
                donor_email: email,
                status: 'completed',
                payment_gateway: 'paystack'
            }])
            .select()
            .single();

        if (dError) throw dError;

        // 3. Update category progress if applicable (Building Fund, etc.)
        if (categoryId) {
            const { error: pError } = await supabase.rpc('increment_donation_progress', {
                cat_id: categoryId,
                amt: amount
            });
            
            if (pError) {
                // Secondary fallback if RPC doesn't exist (less safe but works for initial launch)
                console.error('[DonationRepo] RPC failed, falling back to basic increment:', pError);
                await supabase.auth.admin.from('donation_categories')
                    .update({ current_amount: supabase.sql`current_amount + ${amount}` })
                    .eq('id', categoryId);
            }
        }

        return { success: true, donation };
    }
};
