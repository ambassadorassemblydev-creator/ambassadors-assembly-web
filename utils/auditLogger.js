import { supabase } from '../config/supabase.js';

/**
 * Audit Logger Utility
 * Logs significant user actions to the database.
 */
export const auditLogger = {
    /**
     * Log a user action
     * @param {string} userId - UUID of the user
     * @param {string} action - Action slug (e.g., 'give_success')
     * @param {string} description - Human readable description
     * @param {object} values - Additional context
     */
    async log(userId, action, description, values = {}) {
        try {
            const { error } = await supabase
                .from('audit_log')
                .insert({
                    actor_id: userId,
                    action,
                    description,
                    new_values: values,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.warn('[AuditLogger] Failed to log:', error.message);
            }
        } catch (error) {
            console.error('[AuditLogger] Critical logging error:', error.message);
        }
    }
};
