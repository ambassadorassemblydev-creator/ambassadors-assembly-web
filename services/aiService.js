import axios from 'axios';
import { supabase } from '../config/supabase.js';

/**
 * AIService handles communication with OpenRouter
 * to provide a church-aware assistant.
 */
export const aiService = {
    async getChurchContext(userId = null) {
        // Fetch public church info
        const { data: settings } = await supabase
            .from('church_settings')
            .select('key, value')
            .eq('is_public', true);
            
        // Fetch upcoming events
        const { data: events } = await supabase
            .from('events')
            .select('title, start_date, location_name, event_type')
            .gte('start_date', new Date().toISOString())
            .order('start_date', { ascending: true })
            .limit(5);

        // Fetch recent sermons
        const { data: sermons } = await supabase
            .from('sermons')
            .select('title, speaker, date, scripture_reference')
            .order('date', { descending: true })
            .limit(3);

        // Fetch ministries (Outreach & Impact)
        const { data: ministries } = await supabase
            .from('ministries')
            .select('name, description, category')
            .limit(15);

        // If user is logged in, fetch profile and worker data
        let userActivity = '';
        let userRole = '';
        if (userId) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*, church_workers(church_departments(name))')
                .eq('id', userId)
                .single();
            
            if (profile?.church_workers?.[0]) {
                userRole = `They are a member of the ${profile.church_workers[0].church_departments?.name} Outreach Team.`;
            }

            const { data: logs } = await supabase
                .from('audit_log')
                .select('action, description, created_at')
                .eq('actor_id', userId)
                .order('created_at', { descending: true })
                .limit(5);
                
            if (logs && logs.length > 0) {
                userActivity = `\nRecent User Activity:\n${logs.map(l => `- ${l.description || l.action} at ${l.created_at}`).join('\n')}`;
            }
        }

        const context = `
Church Identity: Ambassadors Assembly (Raising Men, Transforming Lives, Advancing God's Kingdom).
Core Values: Love in Action, Spiritual Excellence, Community Impact.
Nomenclature: We recently transitioned from "Departments" to "Outreach & Community Impact" teams.
Location: Lagos, Nigeria (Main Sanctuary).
Service Times: Sunday (8:00 AM & 10:00 AM), Wednesday (6:00 PM Mid-Week Encounter).
Settings: ${JSON.stringify(settings)}
Events: ${JSON.stringify(events)}
Sermons: ${JSON.stringify(sermons)}
Ministries/Outreach: ${JSON.stringify(ministries)}
User Info: ${userRole}
${userActivity}
`;
        return context;
    },


    async chat(message, userId = null, history = []) {
        const context = await this.getChurchContext(userId);
        
        const systemPrompt = `
You are the "Ambassadors AI", a premium, empathetic, and spiritually wise pastoral assistant for Ambassadors Assembly.
Your tone is deeply encouraging, professional, and cinematic. You address users as "Ambassador" to acknowledge their divine identity.

Core Mission:
Guide members and visitors through our church life, answer spiritual questions with scripture, and provide information about our events, sermons, and "Outreach & Community Impact" teams.

Context about the church:
${context}

Instructions:
1. SPIRITUAL WISDOM: When users share struggles, respond with deep empathy and a relevant scripture (NIV or KJV). Offer a short, powerful prayer.
2. OUTREACH & IMPACT: If users ask about joining a "Department", guide them toward our "Outreach & Community Impact" teams. Explain that we serve to transform lives.
3. PERSONALIZATION: If the context shows they are already on a team, acknowledge their service with gratitude.
4. ACTION ORIENTED:
   - Giving -> /give
   - Prayer Wall -> /prayer-wall
   - Testimony -> /testimonies
   - Events -> /events
5. ACCURACY: If the information isn't in the context, say "I don't have those specific details yet, Ambassador, but I'd love for you to speak with one of our Pastors on Sunday."
6. STYLE: Respond in PLAIN TEXT. No Markdown, no bolding (**), no special characters. Use paragraph breaks for readability.
`;


        const messages = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: message }
        ];

        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'tencent/hy3-preview:free', 
                messages: messages,
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://ambassadors-assembly-web.onrender.com',
                    'X-Title': 'Ambassadors Assembly'
                }
            });

            return response.data.choices[0].message.content;

        } catch (error) {
            console.error('[AIService] OpenRouter Error:', error.response?.data || error.message);
            return "I'm having a small connection issue, Ambassador. Please try again in a moment.";
        }
    }
};
