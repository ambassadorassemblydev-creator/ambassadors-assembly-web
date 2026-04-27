import { supabaseService } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_test_key_placeholder');

export const adminController = {
  notifyAbsentees: async (req, res, next) => {
    try {
      const { absentees, eventName, date } = req.body;
      
      if (!absentees || !Array.isArray(absentees)) {
        return res.status(400).json({ error: 'Absentees list is required' });
      }

      logger.info(`Sending absence notifications for ${absentees.length} members for ${eventName}`);

      const results = [];
      for (const email of absentees) {
        if (!email) continue;
        
        try {
          // Send silently in the background
          const data = await resend.emails.send({
            from: 'Ambassadors Assembly <hello@ambassadorsassembly.org>',
            to: email,
            subject: `We Missed You at ${eventName}!`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
                <h2 style="color: #176a60;">We Missed You!</h2>
                <p>Hello,</p>
                <p>We noticed you weren't able to join us for <strong>${eventName}</strong> on ${date}.</p>
                <p>We hope everything is going well. If you need prayer or support, please don't hesitate to reach out to us.</p>
                <p>Stay blessed,<br>Ambassadors Assembly Team</p>
              </div>
            `
          });
          results.push({ email, success: true, id: data?.id });
        } catch (e) {
          logger.error(`Failed to email ${email}: ${e.message}`);
          results.push({ email, success: false, error: e.message });
        }
      }

      res.status(200).json({ status: 'success', sent: results.filter(r => r.success).length, total: results.length });
    } catch (err) {
      logger.error(`Notify Absentees Error: ${err.message}`);
      res.status(500).json({ error: 'Failed to send notifications' });
    }
  }
};
