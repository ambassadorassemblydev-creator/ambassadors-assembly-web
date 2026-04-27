import { supabase, supabaseService } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import { cache } from '../config/redis.js';

export const watchController = {
  renderWatch: async (req, res, next) => {
    try {
      const { sermonId } = req.query;
      let activeContent = null;
      let contentType = 'stream'; // 'stream' or 'sermon'

      // 1. Fetch Priority Content
      if (sermonId) {
        // Mode: Watch specific sermon archive
        const { data: sermon } = await supabase
          .from('sermons')
          .select('*, sermon_speakers(*), sermon_series(*)')
          .eq('id', sermonId)
          .single();
        
        if (sermon) {
          activeContent = sermon;
          contentType = 'sermon';
        }
      }

      // 2. If no specific sermon requested, check for LIVE stream
      if (!activeContent) {
        const { data: liveStream } = await supabase
          .from('live_streams')
          .select('*')
          .eq('status', 'live')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (liveStream) {
          activeContent = liveStream;
          contentType = 'stream';
        }
      }

      // 3. If STILL nothing, check for SHEDULED stream (for countdown)
      if (!activeContent) {
        const { data: scheduledStream } = await supabase
          .from('live_streams')
          .select('*')
          .eq('status', 'scheduled')
          .order('scheduled_start', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (scheduledStream) {
          activeContent = scheduledStream;
          contentType = 'stream';
        }
      }

      // 4. Fetch the latest 5 sermons for the "Up Next" sidebar
      const cacheKey = 'watch_recent_sermons';
      let recentSermons = await cache.get(cacheKey);

      if (!recentSermons) {
        const { data } = await supabase
          .from('sermons')
          .select('*, sermon_speakers(name)')
          .order('sermon_date', { ascending: false })
          .limit(6);
        
        recentSermons = data;
        await cache.set(cacheKey, recentSermons, 600); // 10 minute cache
      }

      // 5. Build display metadata
      let displayTitle = "Join us Live";
      let description = "Ambassadors Assembly";
      let speaker = null;
      let scripture = { reference: "", text: "" };
      let videoUrl = "";

      if (contentType === 'sermon' && activeContent) {
        displayTitle = activeContent.title;
        description = activeContent.description;
        speaker = activeContent.sermon_speakers;
        scripture = { reference: activeContent.scripture_reference, text: activeContent.scripture_text };
        videoUrl = activeContent.video_embed_url;
      } else if (contentType === 'stream' && activeContent) {
        displayTitle = activeContent.title;
        description = activeContent.description;
        videoUrl = activeContent.embed_url;
        
        // Fetch speaker if linked
        if (activeContent.speaker_id) {
          const { data: speakerData } = await supabase
            .from('sermon_speakers')
            .select('*')
            .eq('id', activeContent.speaker_id)
            .single();
          speaker = speakerData;
        }
        
        scripture = { 
          reference: activeContent.scripture_reference || "", 
          text: activeContent.scripture_text || "" 
        };
      } else if (recentSermons && recentSermons[0]) {
        // Fallback to latest
        activeContent = recentSermons[0];
        contentType = 'sermon';
        displayTitle = activeContent.title;
        description = activeContent.description;
        videoUrl = activeContent.video_embed_url;
        speaker = activeContent.sermon_speakers;
        scripture = { reference: activeContent.scripture_reference, text: activeContent.scripture_text };
      }

      res.render('pages/watch', {
        pageTitle: `${displayTitle} | Ambassadors Assembly`,
        currentPath: req.path,
        content: activeContent,
        contentType,
        recentSermons: recentSermons || [],
        displayTitle,
        description,
        speaker,
        scripture,
        videoUrl,
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY
      });

    } catch (err) {
      logger.error(`Watch Page Error: ${err.message}`);
      next(new AppError('The watch page is currently unavailable.', 500));
    }
  },

  handlePostComment: async (req, res, next) => {
    try {
      const { sermon_id, content, author_name, contentType } = req.body;
      
      // Validate UUID to prevent 500 error from Postgres
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!sermon_id || !uuidRegex.test(sermon_id)) {
        return res.status(400).json({ error: 'Invalid or missing content ID' });
      }

      if (!content) {
        return res.status(400).json({ error: 'Missing comment content' });
      }

      const table = contentType === 'stream' ? 'live_stream_comments' : 'sermon_comments';
      const idColumn = contentType === 'stream' ? 'stream_id' : 'sermon_id';

      // Use the service client to bypass RLS and post
      const { data, error } = await supabaseService
        .from(table)
        .insert([{
          [idColumn]: sermon_id,
          user_id: req.user?.id,
          author_name: author_name || (req.user ? (req.user.first_name || req.user.user_metadata?.first_name) : 'Member'),
          content,
          is_approved: true
        }])
        .select()
        .single();

      if (error) {
        logger.error(`Supabase Insert Error in ${table}: ${error.message}`);
        throw error;
      }

      return res.status(200).json({ success: true, data });
    } catch (err) {
      logger.error(`Comment Post Error: ${err.message}`);
      return res.status(500).json({ error: 'Failed to post comment' });
    }
  }
};