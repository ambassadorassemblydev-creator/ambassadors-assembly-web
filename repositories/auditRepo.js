import { supabase, supabaseService } from '../config/supabase.js';

/**
 * Repository for handling systematic audit logging.
 * Consistent with Church scaling requirements.
 */
export const auditRepo = {
    /**
     * Logs a significant action to the database.
     * @param {Object} req - Express request object for capturing metadata
     * @param {string} action - Brief slug of the action (e.g., 'login_success')
     * @param {string} description - Human readable details
     * @param {string|null} entityType - The table being affected (e.g., 'profiles')
     * @param {string|null} entityId - The ID of the primary affected row
     * @param {Object|null} newValues - Data submitted (for future troubleshooting)
     */
    logAction: async (req, action, description, entityType = null, entityId = null, newValues = null) => {
        try {
            const actor_id = req.user?.id || null;
            const actor_email = req.user?.email || null;
            const ip_address = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
            const user_agent = req.headers['user-agent'] || 'Unknown';

            // High IQ: Use service client to bypass RLS for critical system logs
            const { error } = await supabaseService
                .from('audit_log')
                .insert([{
                    actor_id,
                    actor_email,
                    action,
                    entity_type: entityType,
                    entity_id: entityId,
                    new_values: newValues,
                    ip_address,
                    user_agent,
                    description,
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.error('[AuditRepo] Failed to log action:', error.message);
            }
        } catch (err) {
            console.error('[AuditRepo] Critical logging error:', err.message);
        }
    }
};
