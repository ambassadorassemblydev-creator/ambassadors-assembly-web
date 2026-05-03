import { supabase, supabaseService } from '../config/supabase.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const newsletterController = {
    handleSubscribe: async (req, res) => {
        try {
            const { email, first_name, last_name } = req.body;
            if (!email) return res.status(400).json({ error: 'Email is required' });

            // 1. Save to database
            const { data, error } = await supabaseService
                .from('newsletter_subscribers')
                .upsert([{ 
                    email, 
                    first_name, 
                    last_name, 
                    is_active: true 
                }], { onConflict: 'email' })
                .select()
                .single();

            if (error) throw error;

            // 2. Send welcome email via Resend
            try {
                await resend.emails.send({
                    from: 'Ambassadors Assembly <news@theambassadorsassembly.org>',
                    to: email,
                    subject: 'Welcome to the Ambassadors Assembly Newsletter!',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 10px;">
                            <h1 style="color: #176a60;">Welcome to the Family, ${first_name || 'Ambassador'}!</h1>
                            <p>Thank you for subscribing to our newsletter. We're excited to have you with us.</p>
                            <p>Stay tuned for the latest news, resources, and updates from Ambassadors Assembly.</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="font-size: 12px; color: #666;">If you didn't sign up for this, you can safely ignore this email.</p>
                        </div>
                    `
                });
            } catch (emailError) {
                console.error('[Newsletter] Failed to send welcome email:', emailError.message);
                // We don't fail the whole request if email fails, as long as DB is updated
            }

            return res.status(200).json({ success: true, message: 'Successfully subscribed!' });
        } catch (error) {
            console.error('[Newsletter] Subscription error:', error.message);
            return res.status(500).json({ error: 'Something went wrong. Please try again later.' });
        }
    }
};

export const adminEmailController = {
    sendCustomEmail: async (req, res) => {
        try {
            const { to, subject, message, html } = req.body;
            if (!to || !subject) return res.status(400).json({ error: 'Recipient and subject are required' });

            const { data, error } = await resend.emails.send({
                from: 'Ambassadors Assembly <office@theambassadorsassembly.org>',
                to,
                subject,
                text: message,
                html: html || `<div style="font-family: sans-serif; white-space: pre-wrap;">${message}</div>`
            });

            if (error) throw error;

            return res.status(200).json({ success: true, message: 'Email sent successfully!', id: data.id });
        } catch (error) {
            console.error('[AdminEmail] Error sending email:', error.message);
            return res.status(500).json({ error: error.message || 'Failed to send email' });
        }
    }
};
