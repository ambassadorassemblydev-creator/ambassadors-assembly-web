import { resend } from '../config/resend.js';
import { logger } from '../config/logger.js';

/**
 * Ambassadors Assembly Email Service
 * High IQ: Centralized handler for all transactional and marketing emails via Resend.
 * Supports both direct email sending and event-based automations.
 */
export const emailService = {
  /**
   * Send a standard transactional email
   * @param {Object} options - { to, subject, html, from, text }
   */
  async sendEmail({ to, subject, html, from = 'Ambassadors Assembly <noreply@theambassadorsassembly.org>', text }) {
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
   * Trigger a Resend Automation Event
   * @param {string} eventName - Name of the event defined in Resend Dashboard
   * @param {Object} payload - Data to pass to the automation
   */
  async triggerAutomation(eventName, payload) {
    try {
      const { data, error } = await resend.events.send({
        name: eventName,
        data: payload
      });

      if (error) {
        logger.error(`Automation trigger failed for event ${eventName}:`, error);
        return { success: false, error };
      }

      logger.info(`Automation event ${eventName} triggered successfully.`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Critical error triggering automation ${eventName}:`, error);
      return { success: false, error };
    }
  },

  /**
   * Legacy Welcome Email (Now uses premium style)
   */
  async sendWelcomeEmail(to, name) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(145deg, #121212, #0a0a0a); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; overflow: hidden; margin-top: 40px; }
    .header { background: #176a60; padding: 40px; text-align: center; }
    .logo { width: 180px; filter: brightness(0) invert(1); }
    .content { padding: 40px; text-align: center; line-height: 1.6; }
    .title { font-size: 28px; font-weight: 700; margin-bottom: 20px; color: #ffffff; }
    .text { color: rgba(255,255,255,0.7); font-size: 16px; margin-bottom: 30px; }
    .button { display: inline-block; padding: 16px 32px; background: #25D366; color: #000000 !important; text-decoration: none; border-radius: 12px; font-weight: 600; box-shadow: 0 4px 14px 0 rgba(37, 211, 102, 0.39); }
    .footer { padding: 30px; text-align: center; font-size: 12px; color: rgba(255,255,255,0.4); border-top: 1px solid rgba(255,255,255,0.05); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://res.cloudinary.com/dxwhpacz7/image/upload/v1775200226/IMG-20260304-WA0059_telyum.jpg" class="logo" alt="Ambassadors Assembly">
    </div>
    <div class="content">
      <h1 class="title">Welcome Home, ${name}!</h1>
      <p class="text">We are thrilled to have you join the Ambassadors' Assembly. You are now part of a global community dedicated to Raising Men, Transforming Lives, and Advancing God's Kingdom.</p>
      <p class="text">Explore your dashboard to see your giving history, event registrations, and sermon notes.</p>
      <a href="https://www.theambassadorsassembly.org/my-account" class="button">Go to Dashboard</a>
    </div>
    <div class="footer">
      <p>Living Faith Foundation - The Ambassadors' Assembly</p>
      <p>Lagos, Nigeria</p>
      <p>&copy; ${new Date().getFullYear()} Ambassadors Assembly. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
    return this.sendEmail({ to, subject: 'Welcome to the Assembly', html });
  }
};

