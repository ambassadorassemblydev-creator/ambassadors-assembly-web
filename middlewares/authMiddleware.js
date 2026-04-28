import { supabase } from '../config/supabase.js';
import { setAuthCookies } from '../utils/authUtils.js';
import { withRetry } from '../utils/fetchUtils.js';
import { logger } from '../config/logger.js';

/**
 * High IQ Session Management:
 * Handles token refreshing seamlessly in the background.
 */
const refreshUserSession = async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return null;

  try {
    const { data, error } = await withRetry(
      () => supabase.auth.refreshSession({ refresh_token: refreshToken }),
      { context: 'RefreshSession', maxRetries: 2 }
    );
    if (error || !data.session) return null;

    // Persist the new tokens to cookies
    setAuthCookies(res, data.session);
    return data.user;
  } catch (err) {
    return null;
  }
};

export const authMiddleware = {
  
  // 1. The "Observer": Checks if someone is logged in to update the Navbar. 
  checkUser: async (req, res, next) => {
    let token = req.cookies?.jwt;
    let user = null;

    if (token && token !== 'loggedout') {
      try {
        const result = await withRetry(
          () => supabase.auth.getUser(token),
          { context: 'CheckUser', maxRetries: 2, throwAfterAll: false }
        );
        
        if (result && !result.error && result.data?.user) {
          user = result.data.user;
        }
      } catch (err) {
        logger.warn(`Auth CheckUser Resilience: ${err.message}`);
      }
    }

    // If no user found via JWT, try refreshing
    if (!user) {
      user = await refreshUserSession(req, res);
    }

    res.locals.user = user;
    req.user = user;
    next();
  },

  // 2. The "Bouncer": Completely BLOCKS users from viewing protected pages
  protect: async (req, res, next) => {
    let token = req.cookies?.jwt;
    let user = null;

    if (token && token !== 'loggedout') {
      try {
        const result = await withRetry(
          () => supabase.auth.getUser(token),
          { context: 'ProtectUser', maxRetries: 3, throwAfterAll: false }
        );

        if (result && !result.error && result.data?.user) {
          user = result.data.user;
        }
      } catch (err) {
        logger.warn(`Auth Protect Resilience: ${err.message}`);
      }
    }

    // If no user found via JWT, try refreshing
    if (!user) {
      user = await refreshUserSession(req, res);
    }

    if (!user) {
      // Kick them back to the login page or return JSON for APIs
      if (req.originalUrl.startsWith('/api') || req.originalUrl.includes('/intercede')) {
        return res.status(401).json({ status: 'fail', message: 'Unauthorized. Please check your credentials.' });
      }
      return res.status(401).redirect('/account/login');
    }

    // Allow them to pass
    req.user = user;
    res.locals.user = user;
    next();
  },

  // 3. The "Onboarder": Ensures the user has filled out required profile fields
  requireProfileCompletion: async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.redirect('/sign-in');

      // Check if profile is complete via the is_onboarded flag
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_onboarded')
        .eq('id', userId)
        .single();
        
      if (error || !profile) {
        return res.redirect('/onboarding');
      }

      // If is_onboarded is false, we assume they haven't finished the process.
      if (!profile.is_onboarded) {
        // Only redirect if they are not already on the onboarding page
        if (req.originalUrl !== '/onboarding' && !req.originalUrl.startsWith('/onboarding') && req.originalUrl !== '/api/onboarding') {
          return res.redirect('/onboarding');
        }
      }

      next();
    } catch (err) {
      next();
    }
  },

  // 4. The "VIP Access": Restricts route to specific roles
  restrictTo: (...roles) => {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (!profile || !roles.includes(profile.role)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        next();
      } catch (err) {
        return res.status(500).json({ error: 'Server error during authorization' });
      }
    };
  }
};