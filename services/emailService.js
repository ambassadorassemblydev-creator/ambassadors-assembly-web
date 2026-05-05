import { resend } from '../config/resend.js';
import { logger } from '../config/logger.js';
import { getStandardTemplate } from '../utils/emailTemplates.js';

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
      // High IQ: The Resend API expects the target 'email' at the top level 
      // of the event object, with other variables inside 'data'.
      const { email, ...dataFields } = payload;
      
      const { data, error } = await resend.events.send({
        name: eventName,
        email: email, // Top-level requirement
        data: dataFields
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
   * Trigger Welcome Automation (Managed in Resend Dashboard)
   */
  async sendWelcomeEmail(to, name) {
    return this.triggerAutomation('auth.welcome', {
      email: to,
      firstName: name,
      title: `Welcome Home, ${name}!`,
      source: 'registration'
    });
  },

  /**
   * Send a premium donation alert to the Admin
   */
  async sendAdminDonationAlert({ amount, reference, email, categoryId, donorName }) {
    const title = "New Donation Received";
    const message = `A new donation of ₦${amount.toLocaleString()} has been received from ${donorName || email}.\n\nReference: ${reference}\nCategory: ${categoryId || 'General Giving'}`;
    
    const html = getStandardTemplate(title, message, 'View in Admin', 'https://admin.theambassadorsassembly.org/donations');

    return this.sendEmail({ 
      to: 'info@theambassadorsassembly.org', 
      subject: `🚨 New Donation Received: ₦${amount.toLocaleString()}`, 
      html 
    });
  }
};

