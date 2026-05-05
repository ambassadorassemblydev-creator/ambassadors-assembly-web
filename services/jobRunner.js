import { automationService } from './automationService.js';
import { logger } from '../config/logger.js';

/**
 * JobRunner handles the scheduling of background tasks
 * within the Node.js process.
 */
export const jobRunner = {
    init() {
        logger.info('[JobRunner] Initializing daily automation tasks...');
        
        // Run daily tasks at server start (with a slight delay to let DB connect)
        setTimeout(() => {
            this.runDailyTasks();
        }, 5000);
        
        // Interval: 24 hours (86400000 ms)
        // Note: In a multi-instance production environment, a real cron job
        // hitting an API endpoint is preferred to avoid duplicate runs.
        setInterval(() => {
            this.runDailyTasks();
        }, 86400000);
    },
    
    async runDailyTasks() {
        try {
            const today = new Date().toISOString().split('T')[0];
            logger.info(`[JobRunner] Starting daily tasks for ${today}...`);
            
            await automationService.processDailyMilestones();
            
            logger.info('[JobRunner] Daily tasks completed successfully.');
        } catch (error) {
            logger.error('[JobRunner] Error running daily tasks:', error);
        }
    }
};
