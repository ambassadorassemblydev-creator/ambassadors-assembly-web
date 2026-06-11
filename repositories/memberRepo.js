import { supabase, supabaseService } from '../config/supabase.js';
import { logger } from '../config/logger.js';

export const memberRepo = {
  /**
   * Search members by name or role.
   * Joins profiles with church_workers to get their ministry roles.
   */
  searchMembers: async (query = '') => {
    try {
      // Base query fetching profiles and their associated worker roles
      let dbQuery = supabaseService
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          avatar_url,
          is_baptized,
          church_workers (
            position_id,
            church_positions (
              title,
              church_departments (
                name
              )
            )
          )
        `);

      // If there's a search term, filter by first_name or last_name
      if (query && query.trim() !== '') {
        const searchTerm = `%${query.trim()}%`;
        dbQuery = dbQuery.or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`);
      }

      // Execute query
      const { data, error } = await dbQuery.order('first_name', { ascending: true });

      if (error) {
        throw error;
      }

      // Restructure the data to make it flat for the template
      return data.map(profile => {
        const workerRoles = profile.church_workers || [];
          const roles = workerRoles.map(w => ({
            title: w.church_positions?.title,
            department: w.church_positions?.church_departments?.name
          })).filter(r => r.title);

        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.first_name}+${profile.last_name}&background=random`,
          is_baptized: profile.is_baptized,
          roles: roles
        };
      });

    } catch (error) {
      logger.error(`Error searching members: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get all users with a church position (Staff/Leadership).
   */
  getStaff: async () => {
    try {
      const { data, error } = await supabaseService
        .from('church_workers')
        .select(`
          profiles!user_id (
            id,
            first_name,
            last_name,
            avatar_url
          ),
          church_positions (
            title,
            church_departments (
              name
            )
          )
        `)
        .order('id', { ascending: true });

      if (error) throw error;

      return data.map(w => ({
        id: w.profiles?.id,
        first_name: w.profiles?.first_name,
        last_name: w.profiles?.last_name,
        avatar_url: w.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${w.profiles?.first_name}+${w.profiles?.last_name}&background=random`,
        role: w.church_positions?.title,
        department: w.church_positions?.church_departments?.name
      }));
    } catch (error) {
      logger.error(`Error fetching staff: ${error.message}`);
      return [];
    }
  },

  /**
   * Get all active church departments for filtering
   */
  getDepartments: async () => {
    try {
      const { data, error } = await supabaseService
        .from('church_departments')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error fetching departments: ${error.message}`);
      return [];
    }
  },

  /**
   * Get all active members' birthdays
   */
  getAllBirthdays: async () => {
    try {
      const { data, error } = await supabaseService
        .from('profiles')
        .select('id, first_name, last_name, email, date_of_birth, avatar_url')
        .eq('status', 'active')
        .not('date_of_birth', 'is', null);

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error fetching birthdays: ${error.message}`);
      return [];
    }
  }
};
