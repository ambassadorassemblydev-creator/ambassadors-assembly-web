import { resend } from '../config/resend.js';
import { logger } from '../config/logger.js';

/**
 * Ambassadors Assembly Email Service
 * High IQ: Centralized handler for all transactional and marketing emails via Resend.
 */
export const emailService = {
  /**
   * Send a standard transactional email
   * @param {Object} options - { to, subject, html, from, text }
   */
  async sendEmail({ to, subject, html, from = 'Ambassadors Assembly <noreply@theambassadorsassembly.com>', text }) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
        text: text || undefined
      });

      if (error) {
        logger.error(`Email delivery failed to ${to}:`, error);
        return { success: false, error };
      }

      logger.info(`Email sent successfully to ${to}. ID: ${data.id}`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Critical error in emailService for ${to}:`, error);
      return { success: false, error };
    }
  },

  /**
   * Welcome email for new members
   */
  async sendWelcomeEmail(to, name) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #176a60;">Welcome to Ambassadors Assembly, ${name}!</h2>
        <p>We are thrilled to have you join our community.</p>
        <p>Our mission is to raise men for the ever-increasing Kingdom work, and we're excited to walk this journey with you.</p>
        <div style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 5px;">
          <h3 style="margin-top: 0;">Next Steps</h3>
          <ul>
            <li>Complete your profile in the <a href="https://www.theambassadorsassembly.com/my-account">My Account</a> section.</li>
            <li>Explore our <a href="https://www.theambassadorsassembly.com/ministries">Ministries</a> to get involved.</li>
            <li>Join us this Sunday at 8:15 AM!</li>
          </ul>
        </div>
        <p style="margin-top: 30px; font-size: 0.8em; color: #777;">&copy; ${new Date().getFullYear()} The Ambassadors Assembly</p>
      </div>
    `;
    return this.sendEmail({ to, subject: 'Welcome to Ambassadors Assembly', html });
  }
};
