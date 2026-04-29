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
  },

  /**
   * Send a premium donation alert to the Admin
   */
  async sendAdminDonationAlert({ amount, reference, email, categoryId, donorName }) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
    .header { background: #176a60; padding: 30px; text-align: center; }
    .content { padding: 40px; }
    .badge { display: inline-block; padding: 4px 12px; background: #f1f5f9; color: #475569; border-radius: 100px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px; }
    .amount { font-size: 48px; font-weight: 800; color: #176a60; margin: 10px 0; letter-spacing: -0.02em; }
    .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    .details { background: #f8fafc; border-radius: 16px; padding: 20px; margin: 24px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .value { color: #0f172a; font-size: 13px; font-weight: 700; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://res.cloudinary.com/dxwhpacz7/image/upload/v1775200226/IMG-20260304-WA0059_telyum.jpg" style="width: 140px; filter: brightness(0) invert(1);" alt="Ambassadors Assembly">
    </div>
    <div class="content">
      <div class="badge">Internal Alert</div>
      <h2 class="title">New Donation Received</h2>
      <div class="amount">₦${amount.toLocaleString()}</div>
      
      <div class="details">
        <div class="detail-row">
          <span class="label">Donor</span>
          <span class="value">${donorName || email}</span>
        </div>
        <div class="detail-row">
          <span class="label">Reference</span>
          <span class="value">${reference}</span>
        </div>
        <div class="detail-row">
          <span class="label">Category</span>
          <span class="value">${categoryId || 'General Giving'}</span>
        </div>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.5;">This donation has been verified and recorded in the system. The donor has received their receipt via email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Ambassadors Assembly Admin System</p>
    </div>
  </div>
</body>
</html>
    `;
    return this.sendEmail({ 
      to: 'info@theambassadorsassembly.org', 
      subject: `🚨 New Donation Received: ₦${amount.toLocaleString()}`, 
      html 
    });
  }
};

