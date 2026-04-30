import { authService } from '../services/authService.js';
import { registerSchema, loginSchema } from '../validators/authSchema.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import { setAuthCookies } from '../utils/authUtils.js';
import { verifyRecaptcha } from '../utils/recaptcha.js';


// setAuthCookies moved to utils/authUtils.js for shared access

export const authController = {
  renderSignIn: (req, res) => res.render('pages/sign-in', { pageTitle: 'Sign In', currentPath: req.path }),
  
  renderSignUp: (req, res) => res.render('pages/sign-up', { pageTitle: 'Create Account', currentPath: req.path }),

  renderEmailConfirmed: (req, res) => res.render('pages/email-confirmed', { pageTitle: 'Email Confirmed | Ambassadors Assembly', currentPath: req.path }),

  signUp: async (req, res, next) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // 1. Verify reCAPTCHA
      const isHuman = await verifyRecaptcha(req.body['g-recaptcha-response']);
      if (!isHuman) {
          return next(new AppError('Security verification failed. Please try again.', 400));
      }

      await authService.signUp(validatedData);

      res.status(201).json({ status: 'success', message: 'Check your email to verify your account.' });
    } catch (err) {
      if (err.name === 'ZodError') return next(new AppError(err.errors[0].message, 400));
      next(err);
    }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      // 1. Verify reCAPTCHA
      const isHuman = await verifyRecaptcha(req.body['g-recaptcha-response']);
      if (!isHuman) {
          return next(new AppError('Security verification failed. Please try again.', 400));
      }

      const { user, session } = await authService.login(email, password);

      setAuthCookies(res, session);
      res.status(200).json({ status: 'success', data: { user } });
    } catch (err) {
      next(err);
    }
  },

  logout: async (req, res, next) => {
    try {
      await authService.logout();
      res.clearCookie('jwt');
      res.clearCookie('refresh_token');
      res.status(200).json({ status: 'success' });
    } catch (err) {
      next(err);
    }
  },

  googleLogin: async (req, res, next) => {
    try {
      // Use the host from the request to ensure we redirect back to the same origin
      const host = req.get('host');
      const protocol = req.protocol;
      const redirectTo = `${protocol}://${host}/auth/callback`;
      
      logger.info(`Initiating Google OAuth redirect to: ${redirectTo}`);
      const url = await authService.getGoogleOAuthUrl(redirectTo);
      res.redirect(url);
    } catch (err) {
      next(err);
    }
  },

  /**
   * High IQ: New endpoint to establish a session from a client-side hash (OAuth/Email Confirm)
   */
  setSession: async (req, res, next) => {
    try {
      const { session } = req.body;
      if (!session || !session.access_token) {
        return next(new AppError('No session data provided', 400));
      }

      setAuthCookies(res, session);
      res.status(200).json({ status: 'success', message: 'Session established' });
    } catch (err) {
      next(err);
    }
  },

  handleCallback: async (req, res, next) => {
    try {
      const { code } = req.query;
      
      // If no code is present, it might be an implicit flow (hash) handled by the client-side bridge
      if (!code) {
        logger.info('No OAuth code found in query, redirecting to sign-in to check for hash.');
        return res.redirect('/sign-in');
      }

      const { session, user } = await authService.exchangeCodeForSession(code);
      setAuthCookies(res, session);

      // Redirect to confirmation page (which now has the bridge script)
      res.redirect('/email-confirmed');
    } catch (err) {
      logger.error('OAuth callback error:', err);
      res.redirect('/sign-in?error=oauth_failed');
    }
  }

};