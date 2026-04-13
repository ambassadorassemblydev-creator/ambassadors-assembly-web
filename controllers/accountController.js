import { accountRepo } from '../repositories/accountRepo.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().optional(),
});

export const accountController = {
  /**
   * GET /my-account
   * Renders the main member dashboard
   */
  renderDashboard: async (req, res, next) => {
    try {
      // req.user is provided by authMiddleware.protect
      const userId = req.user.id;

      logger.info(`Loading dashboard for user: ${userId}`);

      // High IQ: Fetch both datasets in parallel to minimize load time
      const [profile, donations] = await Promise.all([
        accountRepo.getUserDashboardData(userId),
        accountRepo.getRecentDonations(userId)
      ]);

      if (!profile) {
        return next(new AppError('Account profile not found.', 404));
      }

      res.render('pages/my-account', {
        pageTitle: 'My Dashboard | Ambassadors Assembly',
        currentPath: req.path,
        user: profile,
        donations: donations || [],
        // Dynamic flags for the UI
        isStaff: !!profile.church_workers && profile.church_workers.length > 0,
        hasFamily: !!profile.family_members && profile.family_members.length > 0
      });

    } catch (err) {
      logger.error(`Dashboard Error: ${err.message}`);
      next(new AppError('We encountered an error loading your dashboard.', 500));
    }
  },
  updateProfile: async (req, res, next) => {
    try {
      logger.info(`Update profile request received for user: ${req.user.id}`);

      // 1. Validate the payload
      const validatedData = updateProfileSchema.parse(req.body);

      // 2. Persist to Supabase via Repository
      const updatedUser = await accountRepo.updateProfile(req.user.id, validatedData);

      // 3. Send standardized success response
      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: { user: updatedUser }
      });

    } catch (err) {
      if (err.name === 'ZodError') {
        return next(new AppError(err.errors[0].message, 400));
      }
      logger.error(`Profile Update Error: ${err.message}`);
      next(err);
    }
  }
};