import { supabase, supabaseService } from '../config/supabase.js';
import { emailService } from './emailService.js';
import { logger } from '../config/logger.js';
import { 
    getStandardTemplate, 
    getReengagementTemplate, 
    getMilestoneTemplate, 
    getApplicationTemplate 
} from '../utils/emailTemplates.js';

/**
 * AutomationService
 * Handles complex business logic triggers that lead to automated email sequences 
 * and community lifecycle management.
 * 
 * DESIGN RATIONALE: Personalized re-engagement and proactive milestone celebration 
 * to foster a deeply connected congregation.
 */
export const automationService = {
    /**
     * Missed Attendance Processor
     * Logic: Identifies members who haven't logged an attendance record in X days.
     * Triggers a warm 'We Miss You' template to encourage re-engagement.
     * 
     * @param {number} days - Threshold of inactivity.
     */
    async processMissedAttendance(days = 14) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffStr = cutoffDate.toISOString().split('T')[0];

            // 1. Get all active profiles
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('id, email, first_name, last_name')
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
                    const firstName = profile.first_name || 'Ambassador';
                    const subject = `We've Missed You, ${firstName}!`;
                    // High IQ: Use specialized re-engagement template to show genuine concern
                    const html = getReengagementTemplate(firstName);

                    logger.info(`Sending missed attendance email to ${profile.email}`);
                    await emailService.sendEmail({
                        to: profile.email,
                        subject,
                        html,
                        recipientName: `${profile.first_name} ${profile.last_name}`,
                        recipientUserId: profile.id,
                        templateName: 'missed_attendance'
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
     * Daily Milestone Processor
     * Logic: Scans active profiles for birthdays or wedding anniversaries occurring TODAY.
     * High IQ: Filters by month-day to ensure anniversaries work across all years.
     */
    async processDailyMilestones() {
        try {
            const today = new Date();
            const monthDay = today.toISOString().slice(5, 10); // MM-DD

            logger.info(`[Automation] Processing milestones for ${monthDay}`);

            // 1. Process Birthdays
            const { data: birthdayProfiles, error: bError } = await supabaseService
                .from('profiles')
                .select('id, email, first_name, last_name, date_of_birth')
                .filter('receive_birthday_greeting', 'eq', true)
                .filter('status', 'eq', 'active');

            if (bError) throw bError;

            const todayBirthdays = birthdayProfiles.filter(p => p.date_of_birth?.slice(5, 10) === monthDay);

            for (const profile of todayBirthdays) {
                const subject = `Happy Birthday, ${profile.first_name || 'Ambassador'}! 🎂`;
                // High IQ: Use milestone template for personal touch
                const html = getMilestoneTemplate({
                    name: profile.first_name,
                    milestoneType: 'Birthday',
                    title: `Happy Birthday, ${profile.first_name}! 🎂`,
                    message: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you."
                });

                await emailService.sendEmail({
                    to: profile.email,
                    subject,
                    html,
                    recipientName: `${profile.first_name} ${profile.last_name}`,
                    recipientUserId: profile.id,
                    templateName: 'birthday_greeting'
                });
            }

            // 2. Process Wedding Anniversaries
            const { data: anniversaryProfiles, error: aError } = await supabaseService
                .from('profiles')
                .select('id, email, first_name, last_name, wedding_anniversary')
                .filter('status', 'eq', 'active');

            if (aError) throw aError;

            const todayAnniversaries = anniversaryProfiles.filter(p => p.wedding_anniversary?.slice(5, 10) === monthDay);

            for (const profile of todayAnniversaries) {
                const subject = `Happy Wedding Anniversary! 💍`;
                // High IQ: Celebrate marriage with dedicated milestone layout
                const html = getMilestoneTemplate({
                    name: profile.first_name,
                    milestoneType: 'Wedding Anniversary',
                    title: `Happy Wedding Anniversary! 💍`,
                    message: "May God continue to bless your union and fill your home with joy and harmony."
                });

                await emailService.sendEmail({
                    to: profile.email,
                    subject,
                    html,
                    recipientName: `${profile.first_name} ${profile.last_name}`,
                    recipientUserId: profile.id,
                    templateName: 'anniversary_greeting'
                });
            }

            logger.info(`[Automation] Completed milestones: ${todayBirthdays.length} birthdays, ${todayAnniversaries.length} anniversaries.`);
            return { success: true, birthdays: todayBirthdays.length, anniversaries: todayAnniversaries.length };
        } catch (error) {
            logger.error('[Automation] Failed to process milestones:', error);
            throw error;
        }
    },

    /**
     * Volunteer Application Handler
     * Triggered immediately after a member submits an application to join a ministry.
     * Provides instant confirmation and sets expectations for leadership review.
     * 
     * @param {Object} application - The submitted application record.
     */
    async handleVolunteerApplication(application) {
        try {
            const { applicant_email, applicant_name, department_id, user_id } = application;
            
            // Get department name
            const { data: dept } = await supabase
                .from('church_departments')
                .select('name')
                .eq('id', department_id)
                .single();

            const firstName = applicant_name.split(' ')[0];
            const deptName = dept?.name || 'the department';
            // High IQ: Inform applicant with specialized application status layout
            const html = getApplicationTemplate(firstName, deptName);

            await emailService.sendEmail({
                to: applicant_email,
                subject,
                html,
                recipientName: applicant_name,
                recipientUserId: user_id,
                templateName: 'volunteer_application'
            });
        } catch (error) {
            logger.error('Failed to handle volunteer application trigger:', error);
        }
    }
};

