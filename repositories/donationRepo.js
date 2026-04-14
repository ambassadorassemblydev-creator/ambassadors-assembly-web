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
    }
};
