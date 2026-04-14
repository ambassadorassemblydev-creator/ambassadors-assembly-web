import { supabase } from '../config/supabase.js';
import { setAuthCookies } from '../utils/authUtils.js';

/**
 * High IQ Session Management:
 * Handles token refreshing seamlessly in the background.
 */
const refreshUserSession = async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return null;

  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
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
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        user = data.user;
      }
    }

    // If no user found via JWT, try refreshing
    if (!user) {
      user = await refreshUserSession(req, res);
    }

    res.locals.user = user;
    next();
  },

  // 2. The "Bouncer": Completely BLOCKS users from viewing protected pages
  protect: async (req, res, next) => {
    let token = req.cookies?.jwt;
    let user = null;

    if (token && token !== 'loggedout') {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        user = data.user;
      }
    }

    // If no user found via JWT, try refreshing
    if (!user) {
      user = await refreshUserSession(req, res);
    }

    if (!user) {
      // Kick them back to the login page or return JSON for APIs
      if (req.originalUrl.startsWith('/api')) {
        return res.status(401).json({ status: 'fail', message: 'Unauthorized. Please check your credentials.' });
      }
      return res.status(401).redirect('/sign-in');
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

      // Check if profile is complete (e.g. they have at least updated is_baptized or filled marital_status or address)
      // Since first_name and last_name are usually set on signup, we check for something explicitly asked in onboarding.
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_baptized, marital_status')
        .eq('id', userId)
        .single();
        
      if (error || !profile) {
        return res.redirect('/onboarding');
      }

      // If marital_status is null, we assume they haven't onboarded yet.
      if (!profile.marital_status) {
        // Only redirect if they are not already on the onboarding page
        if (req.originalUrl !== '/onboarding' && req.originalUrl !== '/api/onboarding') {
          return res.redirect('/onboarding');
        }
      }

      next();
    } catch (err) {
      next();
    }
  }
};