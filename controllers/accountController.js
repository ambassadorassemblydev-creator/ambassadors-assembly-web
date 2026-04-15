import { accountRepo } from '../repositories/accountRepo.js';
import { eventRepo } from '../repositories/eventRepo.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import { supabaseService } from '../config/supabase.js';
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().optional(),
  gender: z.string().optional(),
  marital_status: z.string().optional(),
  wedding_anniversary: z.string().optional(),
  occupation: z.string().optional(),
  previous_church: z.string().optional(),
  interests: z.array(z.string()).optional(),
  department_interest: z.string().optional(),
});

// Combined Onboarding Schema
const onboardingSchema = z.object({
  gender: z.string().optional(),
  dob: z.string().min(1, "Date of birth is required"),
  marital_status: z.string().min(1, "Marital status is required"),
  wedding_anniversary: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  addressLine1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  is_baptized: z.any().transform(val => val === "true" || val === "on"),
  baptism_date: z.string().optional(),
  salvation_date: z.string().optional(),
  previous_church: z.string().optional(),
  department_interest: z.string().optional(),
  position_interest: z.string().optional(),
  occupation: z.string().optional(),
  ministry_interests: z.union([z.string(), z.array(z.string())]).optional(),
});

export const accountController = {
  /**
   * GET /my-account
   * Renders the main member dashboard with tab support
   */
  renderDashboard: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const tab = req.query.tab || 'overview';
      logger.info(`Loading dashboard tab [${tab}] for user: ${userId}`);

      let data = {
        profile: await accountRepo.getUserDashboardData(userId),
        donations: [],
        events: [],
        prayers: []
      };

      if (!data.profile) {
        return next(new AppError('Profile missing.', 404));
      }

      // Load tab-specific data
      if (tab === 'overview' || tab === 'giving') {
        data.donations = await accountRepo.getRecentDonations(userId);
      }
      if (tab === 'events') {
        data.events = await accountRepo.getUserEvents(userId);
      }
      if (tab === 'prayers') {
        data.prayers = await accountRepo.getUserPrayers(userId);
      }

      res.render('pages/my-account', {
        pageTitle: 'My Dashboard',
        currentPath: req.path,
        activePage: 'dashboard',
        user: data.profile,
        donations: data.donations,
        events: data.events,
        prayers: data.prayers,
        activeTab: tab,
        isStaff: !!data.profile.church_workers && data.profile.church_workers.length > 0
      });

    } catch (err) {
      logger.error(`Dashboard Render Error: ${err.message}`);
      next(new AppError('Error loading dashboard.', 500));
    }
  },

  renderEditProfile: async (req, res, next) => {
    try {
      const profile = await accountRepo.getUserDashboardData(req.user.id);
      res.render('pages/edit-profile', {
        pageTitle: 'Edit Profile | Ambassadors Assembly',
        currentPath: req.path,
        activePage: 'profile',
        user: profile,
        error: null,
        success: req.query.success || null
      });
    } catch (err) {
      next(new AppError('Error loading profile editor.', 500));
    }
  },

  handleUpdateProfile: async (req, res, next) => {
    try {
      const validatedData = updateProfileSchema.parse(req.body);
      await accountRepo.updateProfile(req.user.id, validatedData);
      
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.json({ status: 'success', message: 'Profile updated successfully' });
      }
      res.redirect('/my-account/profile?success=Your profile has been updated.');
    } catch (err) {
      if (err instanceof z.ZodError) {
        const profile = await accountRepo.getUserDashboardData(req.user.id);
        return res.status(400).render('pages/edit-profile', {
          pageTitle: 'Edit Profile',
          currentPath: req.path,
          activePage: 'profile',
          user: profile,
          error: err.errors[0].message,
          success: null
        });
      }
      next(err);
    }
  },

  renderDepartments: async (req, res, next) => {
    try {
      const departments = await accountRepo.getDepartments();
      res.render('pages/departments', {
        pageTitle: 'Church Departments | Ambassadors Assembly',
        currentPath: req.path,
        activePage: 'departments',
        departments
      });
    } catch (err) {
      next(new AppError('Error loading departments.', 500));
    }
  },

  /**
   * POST /api/events/register
   * Handles native event registration
   */
  handleEventRegistration: async (req, res, next) => {
    try {
      const { eventId } = req.body;
      const userId = req.user.id;

      if (!eventId) throw new AppError('Event ID is required', 400);

      const isRegistered = await eventRepo.checkRegistration(eventId, userId);
      if (isRegistered) {
        return res.status(400).json({ status: 'error', message: 'You are already registered for this event.' });
      }

      await eventRepo.registerUser(eventId, userId);
      res.status(200).json({ status: 'success', message: 'Registration successful! See you there.' });

    } catch (err) {
      logger.error(`Registration Error: ${err.message}`);
      res.status(500).json({ status: 'error', message: err.message });
    }
  },
  
  renderOnboarding: async (req, res, next) => {
    try {
      const userId = req.user.id;

      const [departments, positions, ministries, profile] = await Promise.all([
        accountRepo.getDepartments(),
        accountRepo.getPositions(),
        accountRepo.getMinistries(),
        accountRepo.getUserDashboardData(userId)
      ]);

      res.render('pages/onboarding', {
        pageTitle: 'Profile Setup',
        currentPath: req.path,
        step: 1, // Start at step 1 visually
        departments,
        positions,
        ministries,
        user: profile,
        error: null
      });
    } catch (err) {
      next(new AppError('Error loading setup page.', 500));
    }
  },

  submitOnboarding: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const validatedData = onboardingSchema.parse(req.body);

      // Map interests to array if it's a single string
      const ministryInterests = Array.isArray(validatedData.ministry_interests) 
        ? validatedData.ministry_interests 
        : (validatedData.ministry_interests ? [validatedData.ministry_interests] : []);

      await accountRepo.updateProfile(userId, {
        gender: validatedData.gender || null,
        date_of_birth: validatedData.dob || null,
        marital_status: validatedData.marital_status || null,
        wedding_anniversary: validatedData.wedding_anniversary || null,
        phone: validatedData.phone || null,
        address: validatedData.addressLine1 || null,
        city: validatedData.city || null,
        is_baptized: validatedData.is_baptized,
        baptism_date: validatedData.baptism_date || null,
        salvation_date: validatedData.salvation_date || null,
        previous_church: validatedData.previous_church || null,
        department_interest: validatedData.department_interest || null,
        position_interest: validatedData.position_interest || null,
        occupation: validatedData.occupation || null,
        interests: ministryInterests,
        is_onboarded: true
      });

      // AUTOMATIC STAFF LINKING
      // If user selected a department and position, link them as a church worker
      if (validatedData.department_interest && validatedData.position_interest) {
        try {
          const [deptData, posData] = await Promise.all([
             supabaseService.from('church_departments').select('id').eq('name', validatedData.department_interest).single(),
             supabaseService.from('church_positions').select('id').eq('title', validatedData.position_interest).single()
          ]);

          if (deptData.data && posData.data) {
             await supabaseService.from('church_workers').upsert({
                user_id: userId,
                department_id: deptData.data.id,
                position_id: posData.data.id
             }, { onConflict: 'user_id' });
             logger.info(`Automated Staff link created/updated for user: ${userId}`);
          }
        } catch (linkErr) {
          logger.warn(`Non-critical error in automatic staff linking: ${linkErr.message}`);
          // Don't fail the onboarding if linking fails, as it's a side-effect
        }
      }

      return res.redirect('/my-account?success=Welcome home! Your profile has been set up.');
    } catch (err) {
      logger.error(`Onboarding Submission Error: ${err.message}`);
      
      const [departments, positions, ministries, profile] = await Promise.all([
        accountRepo.getDepartments(),
        accountRepo.getPositions(),
        accountRepo.getMinistries(),
        accountRepo.getUserDashboardData(req.user.id)
      ]);

      const errorMessage = err instanceof z.ZodError ? err.errors[0].message : 'An error occurred during submission.';
      
      res.status(400).render('pages/onboarding', {
        pageTitle: 'Profile Setup',
        currentPath: req.path,
        step: 1, // Reset to 1 visually on error for simplicity
        departments,
        positions,
        ministries,
        user: profile,
        error: errorMessage
      });
    }
  }
};