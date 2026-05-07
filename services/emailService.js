import { resend } from '../config/resend.js';
import { logger } from '../config/logger.js';
import { supabaseService } from '../config/supabase.js';
import { 
  getStandardTemplate, 
  getWelcomeTemplate, 
  getDonationSuccessTemplate, 
  getDonationFailedTemplate,
  getAdminAlertTemplate,
  getMilestoneTemplate
} from '../utils/emailTemplates.js';

/**
 * Ambassadors Assembly Email Service
 * 
 * DESIGN PHILOSOPHY: Centralized, High-Trust, and Auditable.
 * All outbound communications are automatically logged to 'email_log' 
 * to ensure a transparent audit trail for administrative oversight.
 */
export const emailService = {
  /**
   * Internal helper to log emails to the database.
   * Captured metadata includes status, templates, and delivery identifiers.
   * 
   * @param {Object} logData - The data to insert into the email_log table.
   */
  async logEmail(logData) {
    try {
      const { error } = await supabaseService.from('email_log').insert([{
        ...logData,
        status: logData.status || 'sent',
        sent_at: new Date().toISOString(),
        related_type: logData.related_type,
        related_id: logData.related_id
      }]);

      if (error) {
        logger.error('Failed to write to email_log:', error);
      }
    } catch (error) {
      logger.error('Critical error in logEmail:', error);
    }
  },

  /**
   * Send a standard transactional email
   * @param {Object} options - { to, subject, html, from, text, recipientName, recipientUserId, templateName, relatedType, relatedId }
   */
  async sendEmail({ 
    to, 
    subject, 
    html, 
    from = 'Ambassadors Assembly <noreply@theambassadorsassembly.org>', 
    text,
    recipientName = null,
    recipientUserId = null,
    templateName = 'transactional_general',
    relatedType = null,
    relatedId = null
  }) {
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
        
        // Log failure to DB
        await this.logEmail({
          recipient_email: to,
          recipient_name: recipientName,
          recipient_user_id: recipientUserId,
          template_name: templateName,
          subject,
          status: 'failed',
          error_message: JSON.stringify(error),
          related_type: relatedType,
          related_id: relatedId
        });

        return { success: false, error };
      }

      logger.info(`Email sent successfully to ${to}. ID: ${data.id}`);

      // Log success to DB
      await this.logEmail({
        recipient_email: to,
        recipient_name: recipientName,
        recipient_user_id: recipientUserId,
        template_name: templateName,
        subject,
        resend_email_id: data.id,
        status: 'sent',
        body_preview: html.replace(/<[^>]*>/g, '').substring(0, 200),
        related_type: relatedType,
        related_id: relatedId
      });

      return { success: true, data };
    } catch (error) {
      logger.error(`Critical error in emailService for ${to}:`, error);
      return { success: false, error };
    }
  },

  /**
   * Trigger a Resend Automation Event
   * @deprecated Use direct send methods below for better reliability and logging.
   */
  async triggerAutomation(eventName, payload) {
    try {
      const { email, ...rest } = payload;
      
      const flattenedPayload = {
        ...rest,
        ...(rest.payload || {})
      };
      
      delete flattenedPayload.payload;
      delete flattenedPayload.event;

      const { data, error } = await resend.events.send({
        event: eventName,
        email: email,
        payload: flattenedPayload
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
   * Send a premium Welcome Email
   * High IQ: This email is deferred by 10 minutes to allow the user 
   * time to explore the dashboard before receiving their official welcome.
   * 
   * @param {string} to - Recipient email.
   * @param {string} name - Recipient name.
   * @param {string|null} userId - Optional database user ID for logging.
   */
  async sendWelcomeEmail(to, name, userId = null) {
    logger.info(`[EmailService] Scheduling Welcome Email for ${to} (10min delay)`);

    // High IQ: Fire and forget to prevent blocking the main auth flow
    setTimeout(async () => {
      try {
        const html = getWelcomeTemplate(name);
        await this.sendEmail({
          to,
          subject: `Welcome Home to the Ambassadors Assembly, ${name}! 🕊️`,
          html,
          recipientName: name,
          recipientUserId: userId,
          templateName: 'welcome_email'
        });
      } catch (error) {
        logger.error(`[EmailService] Background Welcome Email failed for ${to}:`, error);
      }
    }, 10 * 60 * 1000); 

    return { success: true, status: 'scheduled' };
  },

  /**
   * Send a Donation Success Email
   */
  async sendDonationSuccessEmail({ to, name, amount, reference, categoryName, userId = null, donationId = null }) {
    // High IQ: Use specialized receipt-style template for financial trust
    const html = getDonationSuccessTemplate({ name, amount, reference, categoryName });

    return this.sendEmail({
      to,
      subject: `Thank You for Your Generosity! 🕊️`,
      html,
      recipientName: name,
      recipientUserId: userId,
      templateName: 'donation_success',
      relatedType: 'donation',
      relatedId: donationId || reference
    });
  },

  /**
   * Send a Donation Failed Email
   */
  async sendDonationFailedEmail({ to, name, reason, reference, userId = null }) {
    // High IQ: Provide clear troubleshooting steps via specialized failure template
    const html = getDonationFailedTemplate({ name, reason, reference });

    return this.sendEmail({
      to,
      subject: `Donation Attempt Notice ⚠️`,
      html,
      recipientName: name,
      recipientUserId: userId,
      templateName: 'donation_failed',
      relatedType: 'donation',
      relatedId: reference
    });
  },

  /**
   * Send a premium donation alert to the Admin
   */
  async sendAdminDonationAlert({ amount, reference, email, categoryId, donorName }) {
    // High IQ: Clean, technical alert template for internal notifications
    const html = getAdminAlertTemplate({
      title: `New Donation: ₦${amount.toLocaleString()}`,
      details: `Donor: ${donorName || email}\nRef: ${reference}\nCat ID: ${categoryId || 'N/A'}`,
      actionUrl: 'https://admin.theambassadorsassembly.org/donations'
    });

    return this.sendEmail({ 
      to: 'info@theambassadorsassembly.org', 
      subject: `🚨 New Donation Received: ₦${amount.toLocaleString()}`, 
      html,
      templateName: 'admin_donation_alert'
    });
  }
};


