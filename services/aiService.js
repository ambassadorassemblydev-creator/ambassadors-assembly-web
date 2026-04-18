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
            .limit(5);

        // If user is logged in, fetch recent audit logs to personalize
        let userActivity = '';
        if (userId) {
            const { data: logs } = await supabase
                .from('audit_log')
                .select('action, description, created_at')
                .eq('actor_id', userId)
                .order('created_at', { descending: true })
                .limit(10);
                
            if (logs && logs.length > 0) {
                userActivity = `\nRecent User Activity:\n${logs.map(l => `- ${l.description || l.action} at ${l.created_at}`).join('\n')}`;
            }
        }

        const context = `
Church Atmosphere: Ambassadors Assembly is a modern, vibrant church focused on spiritual growth, community, and "Love in Action".
Settings: ${JSON.stringify(settings)}
Upcoming Events: ${JSON.stringify(events)}
${userActivity}
`;
        return context;
    },

    async chat(message, userId = null, history = []) {
        const context = await this.getChurchContext(userId);
        
        const systemPrompt = `
You are the "Ambassadors AI", a premium, helpful, and spiritually uplifting assistant for Ambassadors Assembly.
Your tone is welcoming, professional, and slightly cinematic. Use "Ambassador" to address the user occasionally.

Context about the church:
${context}

Instructions:
1. Provide accurate information about events and services.
2. If the user has recent activity, acknowledge it subtly (e.g., "I see you've been active in intercessory prayer, thank you Ambassador!").
3. For giving or prayer requests, provide direct links: /give or /prayer-wall.
4. Keep responses concise but "wow" the user with your insight.
`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: message }
        ];

        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'google/gemma-4-31b-it:free', 
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
