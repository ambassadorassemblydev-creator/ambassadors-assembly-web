import { supabaseService } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { automationService } from '../services/automationService.js';
import { emailService } from '../services/emailService.js';

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
          // High IQ: Trigger automation instead of hardcoded HTML
          await emailService.triggerAutomation('attendance.missed', {
            email,
            eventName,
            date
          });
          results.push({ email, success: true });
        } catch (e) {
          logger.error(`Failed to trigger automation for ${email}: ${e.message}`);
          results.push({ email, success: false, error: e.message });
        }
      }

      res.status(200).json({ status: 'success', sent: results.filter(r => r.success).length, total: results.length });
    } catch (err) {
      logger.error(`Notify Absentees Error: ${err.message}`);
      res.status(500).json({ error: 'Failed to send notifications' });
    }
  },

  /**
   * GET /api/admin/sync-missed-attendance
   * Manually triggers the automation engine to find absentees
   */
  manualSyncMissedAttendance: async (req, res, next) => {
    try {
      const days = parseInt(req.query.days) || 14;
      logger.info(`Manual sync requested for missed attendance (past ${days} days)`);
      
      const result = await automationService.processMissedAttendance(days);
      res.json({ status: 'success', ...result });
    } catch (err) {
      logger.error(`Manual Sync Error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/admin/milestones/sync
   * Manually triggers birthday and anniversary checks
   */
  manualSyncMilestones: async (req, res, next) => {
    try {
      logger.info('Manual sync requested for daily milestones');
      const result = await automationService.processDailyMilestones();
      res.json({ status: 'success', ...result });
    } catch (err) {
      logger.error(`Manual Milestone Sync Error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }
};
