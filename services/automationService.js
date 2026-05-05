import { supabase, supabaseService } from '../config/supabase.js';
import { emailService } from './emailService.js';
import { logger } from '../config/logger.js';
import { getStandardTemplate } from '../utils/emailTemplates.js';

/**
 * AutomationService handles complex business logic triggers
 * that lead to email sequences and lifecycle management.
 */
export const automationService = {
    /**
     * Checks for members who haven't attended a service in X days.
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
     * Daily check for birthdays and anniversaries
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
                const title = "Happy Birthday!";
                const message = `Dear ${profile.first_name || 'Ambassador'},\n\nOn behalf of the entire Ambassadors Assembly family, we want to wish you a very happy birthday! May this new year of your life be filled with God's grace, favor, and abundant blessings.\n\n"The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace." - Numbers 6:24-26\n\nHave a wonderful celebration!`;

                const html = getStandardTemplate(title, message, 'Celebrate Your Day', 'https://www.theambassadorsassembly.org/my-account');

                const result = await emailService.sendEmail({
                    to: profile.email,
                    subject,
                    html
                });

                if (result.success) {
                    await supabaseService.from('email_log').insert([{
                        recipient_email: profile.email,
                        recipient_name: `${profile.first_name} ${profile.last_name}`,
                        recipient_user_id: profile.id,
                        template_name: 'birthday_greeting',
                        subject,
                        body_preview: message.substring(0, 200),
                        resend_email_id: result.data.id,
                        status: 'sent',
                        sent_at: new Date().toISOString()
                    }]);
                }
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
                const title = "Happy Anniversary!";
                const message = `Dear ${profile.first_name || 'Ambassador'},\n\nWishing you a very happy wedding anniversary! We celebrate the love and commitment you share. May God continue to bless your union and fill your home with joy and harmony.\n\n"And over all these virtues put on love, which binds them all together in perfect unity." - Colossians 3:14`;

                const html = getStandardTemplate(title, message, 'View Dashboard', 'https://www.theambassadorsassembly.org/my-account');

                const result = await emailService.sendEmail({
                    to: profile.email,
                    subject,
                    html
                });

                if (result.success) {
                    await supabaseService.from('email_log').insert([{
                        recipient_email: profile.email,
                        recipient_name: `${profile.first_name} ${profile.last_name}`,
                        recipient_user_id: profile.id,
                        template_name: 'anniversary_greeting',
                        subject,
                        body_preview: message.substring(0, 200),
                        resend_email_id: result.data.id,
                        status: 'sent',
                        sent_at: new Date().toISOString()
                    }]);
                }
            }

            logger.info(`[Automation] Completed milestones: ${todayBirthdays.length} birthdays, ${todayAnniversaries.length} anniversaries.`);
            return { success: true, birthdays: todayBirthdays.length, anniversaries: todayAnniversaries.length };
        } catch (error) {
            logger.error('[Automation] Failed to process milestones:', error);
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
