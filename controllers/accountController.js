import { accountRepo } from '../repositories/accountRepo.js';
import { eventRepo } from '../repositories/eventRepo.js';
import { auditRepo } from '../repositories/auditRepo.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import { supabaseService } from '../config/supabase.js';
import { z } from 'zod';
import { Buffer } from 'node:buffer';

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
  
  // Journey
  is_baptized: z.any().transform(val => val === "true" || val === "on"),
  baptism_date: z.string().optional(),
  salvation_date: z.string().optional(),
  previous_church: z.string().optional(),
  how_did_you_hear: z.string().optional(),
  spiritual_gifts: z.union([z.string(), z.array(z.string())]).optional(),
  
  // Service
  department_interest: z.string().optional(),
  position_interest: z.string().optional(),
  motivation: z.string().optional(),
  occupation: z.string().optional(),
  
  // Contact
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  
  // Avatar
  avatar_data: z.string().optional(), 
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
        fullHistory: [],
        events: [],
        prayers: [],
        notes: []
      };

      if (!data.profile) {
        return next(new AppError('Profile missing.', 404));
      }

      // Load tab-specific data
      if (tab === 'overview' || tab === 'giving') {
        data.donations = await accountRepo.getRecentDonations(userId);
        data.fullHistory = await accountRepo.getFullDonationHistory(userId);
      }
      if (tab === 'overview' || tab === 'notes') {
        data.notes = await accountRepo.getUserNotes(userId);
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
        fullHistory: data.fullHistory,
        events: data.events,
        prayers: data.prayers,
        notes: data.notes,
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

      logger.info(`Processing onboarding submission for user: ${userId}`);

      // 1. Handle Avatar Upload (if any)
      let avatarUrl = null;
      if (validatedData.avatar_data && validatedData.avatar_data.startsWith('data:image')) {
        try {
          const base64Data = validatedData.avatar_data.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `avatars/${userId}-${Date.now()}.jpg`;

          const { data: uploadData, error: uploadError } = await supabaseService
            .storage
            .from('avatars')
            .upload(fileName, buffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabaseService
            .storage
            .from('avatars')
            .getPublicUrl(fileName);
          
          avatarUrl = publicUrl;
        } catch (avatarErr) {
          logger.error(`Avatar upload failed: ${avatarErr.message}`);
          // Don't fail onboarding for avatar failure, but log it
        }
      }

      // 2. Data Mapping & Standardization
      const gifts = Array.isArray(validatedData.spiritual_gifts) 
        ? validatedData.spiritual_gifts 
        : (validatedData.spiritual_gifts ? [validatedData.spiritual_gifts] : []);

      // Map visitor source to enum values
      const sourceMap = {
        'friend_family': 'friend',
        'social_media': 'social_media',
        'website': 'website',
        'outreach': 'other',
        'other': 'other'
      };
      const source = sourceMap[validatedData.how_did_you_hear] || 'other';

      // 3. Update Profile
      const profileUpdates = {
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
        how_did_you_hear: source,
        spiritual_gifts: gifts,
        occupation: validatedData.occupation || null,
        emergency_contact_name: validatedData.emergency_contact_name || null,
        emergency_contact_phone: validatedData.emergency_contact_phone || null,
        is_onboarded: true
      };

      if (avatarUrl) {
        profileUpdates.avatar_url = avatarUrl;
      }

      await accountRepo.updateProfile(userId, profileUpdates);

      // 4. Church Worker & Volunteer Application Logic
      if (validatedData.department_interest && validatedData.position_interest) {
        try {
          const [deptData, posData] = await Promise.all([
             supabaseService.from('church_departments').select('id').eq('name', validatedData.department_interest).single(),
             supabaseService.from('church_positions').select('id').eq('title', validatedData.position_interest).single()
          ]);

          if (deptData.data && posData.data) {
            // Create a worker record in 'probation' status
            await supabaseService.from('church_workers').upsert({
              user_id: userId,
              department_id: deptData.data.id,
              position_id: posData.data.id,
              status: 'probation',
              skills: gifts,
              start_date: new Date()
            }, { onConflict: 'user_id' });

            // Create a formal volunteer application
            await supabaseService.from('volunteer_applications').insert({
              user_id: userId,
              department_id: deptData.data.id,
              position_id: posData.data.id,
              applicant_name: req.user.email, 
              applicant_email: req.user.email,
              motivation: validatedData.motivation || 'Standard onboarding interest.',
              skills: gifts,
              status: 'pending'
            });

            logger.info(`Service application initiated for user: ${userId} to ${validatedData.department_interest}`);
          }
        } catch (svcErr) {
          logger.warn(`Non-critical error in service linking: ${svcErr.message}`);
        }
      }

      // 5. Finalize - Audit & Redirect
      await auditRepo.logAction(userId, 'complete_onboarding', 'profile', userId, {}, profileUpdates);

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