import { supabase } from '../config/supabase.js';
import { emailService } from './emailService.js';
import { logger } from '../config/logger.js';

/**
 * AutomationService handles complex business logic triggers
 * that lead to email sequences and lifecycle management.
 */
export const automationService = {
    /**
     * Checks for members who haven't attended a service in X days.
     * This should be called by a cron job or a manual trigger.
     */
    async processMissedAttendance(days = 14) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffStr = cutoffDate.toISOString().split('T')[0];

            // 1. Get all active profiles
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('id, email, first_name')
                .eq('status', 'active');

            if (pError) throw pError;

            // 2. For each profile, check their last attendance
            for (const profile of profiles) {
                const { data: records, error: rError } = await supabase
                    .from('attendance_records')
                    .select('service_date')
                    .eq('user_id', profile.id)
                    .gte('service_date', cutoffStr)
                    .order('service_date', { ascending: false })
                    .limit(1);

                if (rError) {
                    logger.error(`Error fetching attendance for ${profile.id}:`, rError);
                    continue;
                }

                // If no records found within the cutoff period
                if (!records || records.length === 0) {
                    // Check if we've already sent a "we missed you" email recently to avoid spam
                    // (Implementation detail: could check email_log table)
                    
                    logger.info(`Triggering 'attendance.missed' for ${profile.email}`);
                    await emailService.triggerAutomation('attendance.missed', {
                        email: profile.email,
                        firstName: profile.first_name || 'Ambassador',
                        missedSince: cutoffStr
                    });
                }
            }

            return { success: true, processed: profiles.length };
        } catch (error) {
            logger.error('Failed to process missed attendance:', error);
            throw error;
        }
    },

    /**
     * Triggered when a new volunteer application is submitted
     */
    async handleVolunteerApplication(application) {
        try {
            const { applicant_email, applicant_name, department_id } = application;
            
            // Get department name
            const { data: dept } = await supabase
                .from('church_departments')
                .select('name')
                .eq('id', department_id)
                .single();

            await emailService.triggerAutomation('volunteer.applied', {
                email: applicant_email,
                firstName: applicant_name.split(' ')[0],
                department: dept?.name || 'the department',
                applicationId: application.id
            });
        } catch (error) {
            logger.error('Failed to handle volunteer application trigger:', error);
        }
    }
};
