import { accountRepo } from '../repositories/accountRepo.js';
import { eventRepo } from '../repositories/eventRepo.js';
import { auditRepo } from '../repositories/auditRepo.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import { supabaseService } from '../config/supabase.js';
import { emailService } from '../services/emailService.js';
import { z } from 'zod';
import { Buffer } from 'node:buffer';
import { withRetry } from '../utils/fetchUtils.js';
import { automationService } from '../services/automationService.js';

const updateProfileSchema = z.object({
  title: z.string().optional(),
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
  // Identity
  title: z.string().optional(),
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
  already_serving: z.any().transform(val => val === "true" || val === "on" || val === true).optional(),
  motivation: z.string().optional(),
  occupation: z.string().optional(),
  
  // Contact
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  
  // Avatar
  avatar_data: z.string().optional(),
  
  // High IQ: Capture multiple interests
  interests: z.union([z.string(), z.array(z.string())]).optional(),
  ministry_interests: z.union([z.string(), z.array(z.string())]).optional(),
  
  // Professional & Profile
  employer: z.string().optional(),
  bio: z.string().optional(),
  
  // Preferences
  receive_email_newsletter: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional(),
  receive_email_events: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional(),
  receive_sms_notifications: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional(),
  receive_birthday_greeting: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional(),
  receive_email_devotionals: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional(),
  
  // Path Selection
  onboarding_path: z.enum(['new_convert', 'existing_member', 'church_worker']).optional(),
  role_claim: z.string().optional(),
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
      logger.info(`Loading dashboard (SPA) for user: ${userId}`);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

      // Fetch all data in parallel — departments now included for integrated sidebar
      const [profile, donations, events, prayers, notes, departments, attendance] = await Promise.all([
        accountRepo.getUserDashboardData(userId),
        accountRepo.getFullDonationHistory(userId),
        accountRepo.getUserEvents(userId),
        accountRepo.getUserPrayers(userId),
        accountRepo.getUserNotes(userId),
        accountRepo.getDepartments(),
        accountRepo.getUserAttendance(userId)
      ]);

      if (!profile) {
        return next(new AppError('Profile missing.', 404));
      }

      // Calculate localized stats
      const stats = {
        totalGiving: donations.reduce((sum, d) => sum + Number(d.amount), 0).toFixed(2),
        eventCount: events.length,
        prayerCount: prayers.length,
        noteCount: notes.length
      };

      // Handle session selection if scan found multiple
      let selectSessions = null;
      if (req.query.selectSessions) {
        try {
          selectSessions = JSON.parse(Buffer.from(req.query.selectSessions, 'base64').toString());
        } catch (e) {
          logger.error('Failed to parse selection sessions');
        }
      }

      res.render('pages/my-account', {
        pageTitle: 'My Dashboard | Ambassadors Assembly',
        currentPath: req.path,
        activePage: 'dashboard',
        user: profile,
        donations,
        fullHistory: donations,
        events,
        prayers,
        notes,
        stats,
        departments: departments || [],
        attendance: attendance || [],
        activeTab: tab,
        interest: req.query.interest || null,
        isStaff: !!profile.church_workers && profile.church_workers.length > 0,
        selectSessions,
        error: req.query.error || null,
        success: req.query.success || null
      });

    } catch (err) {
      logger.error(`Dashboard Render Error: ${err.message}`);
      next(new AppError('Error loading dashboard.', 500));
    }
  },

  renderEditProfile: async (req, res, next) => {
    res.redirect('/my-account?tab=profile');
  },

  handleUpdateProfile: async (req, res, next) => {
    try {
      const validatedData = updateProfileSchema.parse(req.body);
      await accountRepo.updateProfile(req.user.id, validatedData);
      
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.json({ status: 'success', message: 'Profile updated successfully' });
      }
      res.redirect('/my-account?tab=profile&success=Your profile has been updated.');
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.redirect(`/my-account?tab=profile&error=${encodeURIComponent(err.errors[0].message)}`);
      }
      next(err);
    }
  },

  renderDepartments: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const [departments, profile] = await Promise.all([
        accountRepo.getDepartments(),
        accountRepo.getUserDashboardData(userId)
      ]);

      res.render('pages/departments', {
        pageTitle: 'Church Departments | Ambassadors Assembly',
        currentPath: req.path,
        activePage: 'departments',
        departments,
        user: profile
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
      const userId = req.user?.id;
      if (!userId) {
        logger.warn('Onboarding Access Attempt: No User ID found');
        return res.redirect('/account/login');
      }

      // Force the browser to NEVER cache this page, ensuring CSRF tokens are always fresh
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      logger.info(`Starting high-resilience onboarding fetch for user: ${userId}`);

      // High IQ: Parallel fetching with allSettled for maximum resilience
      const results = await Promise.allSettled([
        withRetry(() => accountRepo.getDepartments(), { context: 'Departments', maxRetries: 2 }),
        withRetry(() => accountRepo.getPositions(), { context: 'Positions', maxRetries: 2 }),
        withRetry(() => accountRepo.getMinistries(), { context: 'Ministries', maxRetries: 2 }),
        withRetry(() => accountRepo.getUserDashboardData(userId), { context: 'Profile', maxRetries: 2 })
      ]);

      const departments = results[0].status === 'fulfilled' ? (results[0].value || []) : [];
      const positions = results[1].status === 'fulfilled' ? (results[1].value || []) : [];
      const ministries = results[2].status === 'fulfilled' ? (results[2].value || []) : [];
      const profile = results[3].status === 'fulfilled' ? results[3].value : null;

      // Handle query params safely to avoid URI malformed errors
      let errorMsg = null;
      try {
        errorMsg = req.query.error ? String(req.query.error) : null;
      } catch (e) {
        logger.warn('Malformed error query param detected');
      }

      res.render('pages/onboarding', {
        pageTitle: 'Profile Setup | Ambassadors Assembly',
        currentPath: req.path || '/onboarding',
        step: 1,
        departments: Array.isArray(departments) ? departments : [],
        positions: Array.isArray(positions) ? positions : [],
        ministries: Array.isArray(ministries) ? ministries : [],
        user: profile || req.user || {},
        error: errorMsg,
        csrfToken: res.locals.csrfToken
      });
    } catch (err) {
      logger.error(`Onboarding Critical Failure: ${err.message}`, { stack: err.stack });
      // Redirect to a safe fallback instead of throwing a raw error
      res.redirect('/account/login?error=Service%20Unavailable');
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
      const source = sourceMap[validatedData.how_did_you_hear] || 'other';      // 3. Update Profile
      const path = validatedData.onboarding_path || 'new_convert';
      const isAlreadyServing = (path === 'church_worker') || (validatedData.already_serving === 'true' || validatedData.already_serving === true);
      
      const pastoralTitles = ['Pastor', 'Bishop', 'Apostle', 'Prophet', 'Evangelist'];
      const leaderTitles = ['Elder', 'Deacon', 'Deaconess', 'Minister'];
      const titleStr = validatedData.title || '';

      // Role & Approval Logic based on Path
      let targetRoleClaim = 'member';
      let targetApprovalStatus = 'none';
      let needsManualVerification = false;

      if (path === 'church_worker') {
        // High IQ: If they say they are a worker, they must pick a role claim
        targetRoleClaim = validatedData.role_claim || 'worker';
        targetApprovalStatus = 'pending';
        needsManualVerification = true;
      } else {
        // New Converts and Existing Members start as regular members
        targetRoleClaim = 'member';
        targetApprovalStatus = 'none';
      }

      // Overriding role claim if they picked a high-authority title during regular onboarding
      if (!needsManualVerification && (pastoralTitles.includes(titleStr) || leaderTitles.includes(titleStr))) {
        targetRoleClaim = pastoralTitles.includes(titleStr) ? 'pastor' : 'leader';
        targetApprovalStatus = 'pending';
        needsManualVerification = true;
      }

      const profileUpdates = {
        title: validatedData.title || null,
        gender: validatedData.gender || null,
        date_of_birth: validatedData.dob || null,
        marital_status: validatedData.marital_status || null,
        wedding_anniversary: validatedData.wedding_anniversary || null,
        phone: validatedData.phone || null,
        address_line_1: validatedData.addressLine1 || null, 
        city: validatedData.city || null,
        is_baptized: validatedData.is_baptized,
        baptism_date: validatedData.baptism_date || null,
        salvation_date: validatedData.salvation_date || null,
        previous_church: validatedData.previous_church || null,
        how_did_you_hear: source,
        spiritual_gifts: gifts,
        occupation: validatedData.occupation || null,
        employer: validatedData.employer || null,
        bio: validatedData.bio || null,
        emergency_contact_name: validatedData.emergency_contact_name || null,
        emergency_contact_phone: validatedData.emergency_contact_phone || null,
        receive_email_newsletter: validatedData.receive_email_newsletter ?? true,
        receive_email_events: validatedData.receive_email_events ?? true,
        receive_sms_notifications: validatedData.receive_sms_notifications ?? false,
        receive_birthday_greeting: validatedData.receive_birthday_greeting ?? true,
        receive_email_devotionals: validatedData.receive_email_devotionals ?? false,
        is_onboarded: true,
        already_serving: isAlreadyServing,
        approval_status: targetApprovalStatus,
        role_claim: targetRoleClaim,
        department_interest: (validatedData.department_interest && validatedData.department_interest !== 'None') ? validatedData.department_interest : null,
        department_claim: (validatedData.department_interest && validatedData.department_interest !== 'None') ? validatedData.department_interest : null,
        is_member: true,
        member_since: new Date(),
        country: 'Nigeria',
        interests: Array.isArray(validatedData.interests) ? validatedData.interests : (validatedData.interests ? [validatedData.interests] : [])
      };

      if (avatarUrl) {
        profileUpdates.avatar_url = avatarUrl;
      }

      await accountRepo.updateProfile(userId, profileUpdates);

      // 4. Church Worker & Volunteer Application Logic
      if (validatedData.department_interest && validatedData.department_interest !== 'None' && validatedData.position_interest) {
        try {
          const [deptData, posData] = await Promise.all([
             supabaseService.from('church_departments').select('id').eq('name', validatedData.department_interest).single(),
             supabaseService.from('church_positions').select('id').eq('title', validatedData.position_interest).single()
          ]);

          if (deptData.data && posData.data) {
            // Create a worker record - set to 'active' if already serving, else 'probation'
            await supabaseService.from('church_workers').upsert({
              user_id: userId,
              department_id: deptData.data.id,
              position_id: posData.data.id,
              status: isAlreadyServing ? 'active' : 'probation',
              skills: gifts,
              start_date: new Date(),
              notes: isAlreadyServing ? 'User identified as already serving during onboarding.' : null
            }, { onConflict: 'user_id' });

            // Create a formal volunteer application
            const { data: application, error: insError } = await supabaseService.from('volunteer_applications').insert({
              user_id: userId,
              department_id: deptData.data.id,
              position_id: posData.data.id,
              applicant_name: req.user.email, 
              applicant_email: req.user.email,
              motivation: isAlreadyServing 
                ? 'EXISTING MEMBER: ' + (validatedData.motivation || 'Already serving in this capacity.')
                : (validatedData.motivation || 'Standard onboarding interest.'),
              skills: gifts,
              status: isAlreadyServing ? 'approved' : 'pending'
            }).select().single();

            if (!insError && application) {
                await automationService.handleVolunteerApplication(application);
            }

            logger.info(`Service entry processed for user: ${userId} to ${validatedData.department_interest} (Existing: ${isAlreadyServing})`);
          }
        } catch (svcErr) {
          logger.warn(`Non-critical error in service linking: ${svcErr.message}`);
        }
      }

      // 4.5. Ministry Interests Logic
      if (validatedData.ministry_interests) {
        try {
          const mInterests = (Array.isArray(validatedData.ministry_interests) 
            ? validatedData.ministry_interests 
            : [validatedData.ministry_interests]).filter(m => m && m !== 'None');
          
          for (const mName of mInterests) {
            const { data: mData } = await supabaseService
              .from('ministries')
              .select('id')
              .eq('name', mName)
              .single();

            if (mData) {
              await supabaseService.from('ministry_members').upsert({
                user_id: userId,
                ministry_id: mData.id,
                role: 'pending',
                status: 'pending',
                joined_at: new Date()
              }, { onConflict: 'user_id,ministry_id' });
            }
          }
          logger.info(`Ministry interests processed for user: ${userId}`);
        } catch (mErr) {
          logger.warn(`Non-critical error in ministry linking: ${mErr.message}`);
        }
      }      // 5. Audit Logging
      logger.info(`Onboarding completed for user: ${userId} with role claim: ${targetRoleClaim} (Path: ${path})`);
    

      // 6. Finalize - Trigger Welcome & Redirect
      // User has configured Resend Automations - triggering 'auth.welcome'
      try {
        await emailService.triggerAutomation('auth.welcome', {
            email: req.user.email,
            firstName: req.user.first_name || validatedData.firstName || 'Ambassador',
            lastName: req.user.last_name || validatedData.lastName || ''
        });
      } catch (emailErr) {
        logger.error(`Welcome automation failed but onboarding proceeded: ${emailErr.message}`);
      }

      await auditRepo.logAction(req, 'complete_onboarding', 'Completed full profile onboarding', 'profiles', userId, profileUpdates);

      return res.redirect('/confirmation?type=onboarding');
    } catch (err) {
      logger.error(`Onboarding Submission Error: ${err.message}`);
      
      const [departments, positions, ministries, profile] = await Promise.all([
        accountRepo.getDepartments(),
        accountRepo.getPositions(),
        accountRepo.getMinistries(),
        accountRepo.getUserDashboardData(req.user.id)
      ]);

      const errorMessage = err instanceof z.ZodError 
        ? (err.issues && err.issues[0] ? err.issues[0].message : err.errors[0]?.message || 'Validation failed')
        : 'An error occurred during submission.';
      
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
  },

  /**
   * GET /my-account/attendance/mark
   * Entry point for static QR code scanning
   */
  handleMarkAttendance: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { service } = req.query;

      logger.info(`Attendance scan attempt by user: ${userId}`);
      const result = await accountRepo.markAttendance(userId, service);

      if (result.needsSelection) {
        // High IQ: Multiple sessions active. Redirect to dashboard with selection options
        const sessionsJson = Buffer.from(JSON.stringify(result.sessions)).toString('base64');
        return res.redirect(`/my-account?tab=attendance&selectSessions=${sessionsJson}`);
      }

      if (!result.success) {
        return res.redirect(`/my-account?tab=attendance&error=${encodeURIComponent(result.message)}`);
      }

      res.redirect(`/my-account?tab=attendance&success=${encodeURIComponent(result.message)}`);
    } catch (err) {
      logger.error(`Attendance Marking Error: ${err.message}`);
      res.redirect('/my-account?tab=attendance&error=An error occurred while marking your attendance. Please try again.');
    }
  },

  markSocialShareShown: async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // High IQ: Use the service role client if available to ensure RLS bypass for system flags
      const client = supabaseService || supabase;
      
      const { error } = await client
        .from('profiles')
        .update({ social_share_shown: true })
        .eq('id', userId);
      
      if (error) {
        logger.warn(`Non-critical Social Share Update Error: ${error.message}`);
        // Even if DB update fails, we return 200 to the client so the UI can proceed
        // unless it's a critical system failure.
        return res.json({ status: 'warning', message: 'Flag not updated in DB but proceeding.' });
      }

      res.json({ status: 'success' });
    } catch (err) {
      logger.error(`Mark Social Share Shown Critical Error: ${err.message}`);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  },

  getMe: async (req, res) => {
    try {
      logger.info(`Dynamic profile sync requested for user: ${req.user?.id}`);
      if (!req.user) return res.status(401).json({ status: 'error', message: 'Not authenticated' });
      const userId = req.user.id;
      const profile = await accountRepo.getUserDashboardData(userId);
      res.json({ status: 'success', data: profile });
    } catch (err) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  }
};