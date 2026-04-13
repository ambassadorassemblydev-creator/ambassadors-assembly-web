import { authService } from '../services/authService.js';
import { registerSchema, loginSchema } from '../validators/authSchema.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import { setAuthCookies } from '../utils/authUtils.js';

// setAuthCookies moved to utils/authUtils.js for shared access

export const authController = {
  renderSignIn: (req, res) => res.render('pages/sign-in', { pageTitle: 'Sign In', currentPath: req.path }),
  
  renderSignUp: (req, res) => res.render('pages/sign-up', { pageTitle: 'Create Account', currentPath: req.path }),

  signUp: async (req, res, next) => {
    try {
      const validatedData = registerSchema.parse(req.body);
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
  }
};