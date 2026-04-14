import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

export const authService = {
  /**
   * Registers a new user with extended profile data
   */
  signUp: async (userData) => {
    logger.info(`Attempting registration for: ${userData.email}`);
    
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: 'member'
        }
      }
    });

    if (error) {
      logger.error(`Registration failed: ${error.message}`);
      throw new AppError(error.message, 400);
    }
    
    return data;
  },

  /**
   * Authenticates user and returns session
   */
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      logger.warn(`Failed login attempt for: ${email}`);
      throw new AppError('Invalid credentials', 401);
    }
    
    return data;
  },

  /**
   * Retrieves profile data for authenticated users
   */
  getProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, church_workers(*), family_members(*)')
      .eq('id', userId)
      .single();
      
    if (error) throw new AppError('Profile not found', 404);
    return data;
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new AppError(error.message, 500);
  }
};