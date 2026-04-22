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
            .select('title, date, location')
            .gte('date', new Date().toISOString())
            .order('date', { ascending: true })
            .limit(3);

        // Fetch recent sermons
        const { data: sermons } = await supabase
            .from('sermons')
            .select('title, speaker, date, scripture')
            .order('date', { descending: true })
            .limit(2);

        // Fetch ministries
        const { data: ministries } = await supabase
            .from('ministries')
            .select('name')
            .limit(10);

        // If user is logged in, fetch recent audit logs to personalize
        let userActivity = '';
        if (userId) {
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
Church Identity: Ambassadors Assembly is a modern, vibrant church focused on spiritual growth, community, and "Love in Action".
Location: 123 Ambassadors Drive, Ikeja, Lagos, Nigeria.
Service Times: Sunday (8:00 AM First Service, 10:00 AM Second Service, 5:00 PM Monthly Encounter), Wednesday (6:00 PM Mid-Week Bible Study).
Settings: ${JSON.stringify(settings)}
Upcoming Events: ${JSON.stringify(events)}
Recent Sermons: ${JSON.stringify(sermons)}
Ministries: ${ministries ? ministries.map(m => m.name).join(', ') : ''}
${userActivity}
`;
        return context;
    },

    async chat(message, userId = null, history = []) {
        const context = await this.getChurchContext(userId);
        
        const systemPrompt = `
You are the "Ambassadors AI", a premium, helpful, and spiritually uplifting pastoral assistant for Ambassadors Assembly.
Your tone is deeply empathetic, welcoming, professional, and slightly cinematic. Use the term "Ambassador" to address the user warmly, but don't overuse it.

Context about the church:
${context}

Instructions:
1. Provide highly accurate information based ONLY on the context provided. If you don't know, gracefully offer to connect them with a pastor or direct them to the Contact page.
2. If the user asks for prayer, respond with a short, comforting prayer and direct them to the Prayer Wall (/prayer-wall).
3. If the user asks about giving/tithing, explain the blessing of giving and direct them to /give.
4. If the user asks about visiting, warmly welcome them and share the Service Times and Location.
5. If the user has recent activity, subtly acknowledge their commitment to the church family.
6. Keep responses concise, warm, and spiritually encouraging. Quote relevant scripture if appropriate to their situation.
7. CRITICAL: RESPOND IN PLAIN TEXT ONLY. DO NOT use Markdown, asterisks (**), hash symbols (#), bold text, or special characters. Use standard capitalization and paragraph breaks.
`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: message }
        ];

        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'google/gemma-4-26b-a4b-it:free', 
                messages: messages,
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://ambassadors-assembly.com',
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
