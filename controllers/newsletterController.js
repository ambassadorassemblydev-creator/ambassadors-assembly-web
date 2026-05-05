import { supabase, supabaseService } from '../config/supabase.js';
import { Resend } from 'resend';
import { getStandardTemplate } from '../utils/emailTemplates.js';

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

            // 2. Trigger Welcome Automation in Resend
            try {
                await emailService.triggerAutomation('auth.welcome', {
                    email,
                    firstName: first_name || 'Ambassador',
                    lastName: last_name || '',
                    source: 'newsletter'
                });
            } catch (emailError) {
                console.error('[Newsletter] Failed to trigger welcome automation:', emailError.message);
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
            const { to, subject, message, html, title } = req.body;
            if (!to || !subject) return res.status(400).json({ error: 'Recipient and subject are required' });

            const emailHtml = html || getStandardTemplate(title || subject, message);

            const { data, error } = await resend.emails.send({
                from: 'Ambassadors Assembly <office@theambassadorsassembly.org>',
                to,
                subject,
                text: message,
                html: emailHtml
            });

            if (error) throw error;

            // Log the email in the background
            try {
                // Find user_id if possible
                const { data: profile } = await supabaseService
                    .from('profiles')
                    .select('id, first_name, last_name')
                    .eq('email', to)
                    .single();

                await supabaseService.from('email_log').insert([{
                    recipient_email: to,
                    recipient_name: profile ? `${profile.first_name} ${profile.last_name}` : null,
                    recipient_user_id: profile?.id || null,
                    template_name: 'custom_admin',
                    subject,
                    body_preview: message.substring(0, 200),
                    resend_email_id: data.id,
                    status: 'sent',
                    sent_at: new Date().toISOString()
                }]);
            } catch (logErr) {
                console.error('[AdminEmail] Logging failed:', logErr.message);
            }

            return res.status(200).json({ success: true, message: 'Email sent successfully!', id: data.id });
        } catch (error) {
            console.error('[AdminEmail] Error sending email:', error.message);
            return res.status(500).json({ error: error.message || 'Failed to send email' });
        }
    }
};
