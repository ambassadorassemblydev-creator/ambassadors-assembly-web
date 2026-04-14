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

const onboardingSchema = z.object({
  gender: z.string().optional(),
  dob: z.string().min(1, "Date of birth is required"),
  marital_status: z.string().min(1, "Marital status is required"),
  wedding_anniversary: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  addressLine1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  is_baptized: z.boolean().default(false),
  baptism_date: z.string().optional()
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
      let [profile, donations] = await Promise.all([
        accountRepo.getUserDashboardData(userId),
        accountRepo.getRecentDonations(userId)
      ]);

      // ─── SELF-HEALING RECOVERY BLOCK ───
      if (!profile) {
        logger.warn(`⚠️ Profile missing for authenticated user ${userId}. Attempting self-healing...`);
        
        try {
          const authData = req.user; // Data from the JWT
          profile = await accountRepo.provisionProfile(
            userId, 
            authData.email,
            authData.first_name || authData.user_metadata?.first_name,
            authData.last_name || authData.user_metadata?.last_name
          );
          logger.info(`✅ Self-healing successful for user ${userId}`);
        } catch (recoverErr) {
          logger.error(`❌ Self-healing failed for ${userId}: ${recoverErr.message}`);
          return next(new AppError('Your account profile is missing and could not be automatically recovered. Please contact support.', 404));
        }
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
  },
  
  /**
   * GET /onboarding
   */
  renderOnboarding: async (req, res, next) => {
    try {
      res.render('pages/onboarding', {
        pageTitle: 'Profile Setup | Ambassadors Assembly',
        currentPath: req.path
      });
    } catch (err) {
      logger.error(`Onboarding Render Error: ${err.message}`);
      next(new AppError('We encountered an error loading the setup page.', 500));
    }
  },

  /**
   * POST /onboarding
   */
  submitOnboarding: async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // Transform checkbox string to boolean
      if (req.body.is_baptized === "true" || req.body.is_baptized === "on") req.body.is_baptized = true;
      else req.body.is_baptized = false;

      const validatedData = onboardingSchema.parse(req.body);
      
      // Update profile
      await accountRepo.updateProfile(userId, {
        gender: validatedData.gender || null,
        date_of_birth: validatedData.dob || null,
        marital_status: validatedData.marital_status || null,
        wedding_anniversary: validatedData.wedding_anniversary || null,
        phone: validatedData.phone || null,
        address: validatedData.addressLine1 || null,
        city: validatedData.city || null,
        is_baptized: validatedData.is_baptized,
        baptism_date: validatedData.baptism_date || null
      });

      res.redirect('/my-account?success=Welcome home! Your profile has been set up.');
    } catch (err) {
      if (err.name === 'ZodError') {
        // High IQ: If validation fails, re-render the page with an error. 
        // In a real app we'd pass flash messages or errors to the view.
        return res.status(400).render('pages/onboarding', {
          pageTitle: 'Profile Setup | Ambassadors Assembly',
          currentPath: req.path,
          error: err.errors[0].message
        });
      }
      logger.error(`Onboarding Error: ${err.message}`);
      res.status(500).render('pages/onboarding', {
        pageTitle: 'Profile Setup | Ambassadors Assembly',
        currentPath: req.path,
        error: 'An unexpected error occurred. Please try again.'
      });
    }
  }
};