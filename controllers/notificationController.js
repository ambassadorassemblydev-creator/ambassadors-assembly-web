import webpush from 'web-push';
import { supabase, supabaseService } from '../config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

// Configure Web Push
webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

export const subscribe = async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { error } = await supabaseService
            .from('push_subscriptions')
            .upsert({ 
                user_id: userId, 
                subscription,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('[NotificationController] Subscribe Error Detailed:', {
            userId: req.user?.id || req.session?.user?.id,
            error: err,
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ error: 'Failed to subscribe to notifications', details: err.message });
    }
};

export const broadcast = async (req, res) => {
    try {
        const { title, body, url } = req.body;

        // 1. Check for Admin Role via profiles.role_claim
        const userId = req.user?.id;
        const { data: profileData } = await supabase
            .from('profiles')
            .select('role_claim')
            .eq('id', userId)
            .single();

        const allowedRoles = ['admin', 'super_admin', 'pastor'];
        if (!allowedRoles.includes(profileData?.role_claim)) {
            return res.status(403).json({ error: 'You do not have permission to broadcast messages.' });
        }

        // 2. Fetch all subscriptions
        const { data: subs, error } = await supabaseService
            .from('push_subscriptions')
            .select('subscription');

        if (error) throw error;

        const payload = JSON.stringify({
            title: title || 'Ambassadors Assembly',
            body: body || 'A new update from the sanctuary.',
            url: url || '/'
        });

        // 3. Send in parallel
        const results = await Promise.allSettled(
            subs.map(sub => webpush.sendNotification(sub.subscription, payload))
        );

        // 4. Cleanup expired subscriptions
        const expired = results
            .map((res, i) => res.status === 'rejected' && (res.reason.statusCode === 410 || res.reason.statusCode === 404) ? subs[i].subscription.endpoint : null)
            .filter(Boolean);

        if (expired.length > 0) {
            await Promise.all(
                expired.map(endpoint => 
                    supabaseService.from('push_subscriptions').delete().filter('subscription->>endpoint', 'eq', endpoint)
                )
            );
        }

        res.status(200).json({ 
            success: true, 
            sent: results.filter(r => r.status === 'fulfilled').length,
            failed: results.filter(r => r.status === 'rejected').length
        });

    } catch (err) {
        console.error('[NotificationController] Broadcast Error:', err);
        res.status(500).json({ error: err.message });
    }
};
