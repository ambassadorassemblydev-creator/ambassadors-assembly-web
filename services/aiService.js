import axios from 'axios';
import { supabase } from '../config/supabase.js';
import { GoogleGenAI } from '@google/genai';

/**
 * AIService handles communication with AI providers
 * (Native Google GenAI or OpenRouter) to provide a church-aware assistant.
 */
export const aiService = {
    async getChurchContext(userId = null) {
        // Fetch public church info (selective)
        const { data: settings } = await supabase
            .from('church_settings')
            .select('key, value')
            .in('key', ['mission', 'vision', 'about_us', 'contact_email', 'phone_number'])
            .eq('is_public', true);
            
        // Fetch upcoming events (concise)
        const { data: events } = await supabase
            .from('events')
            .select('title, start_date')
            .gte('start_date', new Date().toISOString())
            .order('start_date', { ascending: true })
            .limit(3);

        // Fetch recent sermons (concise)
        const { data: sermons } = await supabase
            .from('sermons')
            .select('title, speaker')
            .order('date', { descending: true })
            .limit(2);

        // Fetch ministries (names only)
        const { data: ministries } = await supabase
            .from('ministries')
            .select('name')
            .limit(8);

        let userRole = '';
        if (userId) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, church_workers(church_departments(name))')
                .eq('id', userId)
                .single();
            
            if (profile?.church_workers?.[0]) {
                userRole = `User: ${profile.first_name || 'Ambassador'}. Member of ${profile.church_workers[0].church_departments?.name} Outreach Team.`;
            }
        }

        const formatList = (arr, key) => arr?.map(i => i[key]).join(', ') || 'None';

        const context = `
Identity: Ambassadors Assembly (Raising Men, Transforming Lives).
Mission/Vision: ${settings?.map(s => `${s.key}: ${s.value}`).join(' | ') || ''}
Service: Sunday (8AM/10AM), Wed (6PM).
Upcoming: ${formatList(events, 'title')}
Latest Sermons: ${formatList(sermons, 'title')}
Outreach Teams: ${formatList(ministries, 'name')}
${userRole}
`;
        return context;
    },


    async chat(message, userId = null, history = []) {
        const context = await this.getChurchContext(userId);
        
        const systemPrompt = `
You are the "Ambassadors AI", a premium, empathetic, and spiritually wise pastoral assistant for Ambassadors Assembly.
Tone: Encouraging, professional, cinematic. Address user as "Ambassador".
Mission: Guide users through church life, answer spiritual questions with scripture.
Context: ${context}
Rules: 
1. Spiritual Wisdom: Use scripture (NIV/KJV) for struggles. Short prayer.
2. Outreach: Guide to "Outreach & Community Impact" teams.
3. Links: Giving(/give), Prayer(/prayer-wall), Testimony(/testimonies), Events(/events).
4. Accuracy: If unknown, refer to Sunday service.
5. Style: PLAIN TEXT only. No markdown, no bold (**). Use paragraph breaks.
`;

        // HIGH IQ: Use the new @google/genai SDK (User Documentation Sync)
        if (process.env.GEMINI_API_KEY) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                
                const response = await ai.models.generateContent({
                    model: "gemini-3.1-flash-lite-preview",
                    systemInstruction: systemPrompt,
                    contents: [
                        ...history.map(h => ({
                            role: h.role === 'user' ? 'user' : 'model',
                            parts: [{ text: h.content }]
                        })),
                        { role: 'user', parts: [{ text: message }] }
                    ],
                    generationConfig: { maxOutputTokens: 500 }
                });

                if (response.text) return response.text;
            } catch (error) {
                console.error('[AIService] Native GenAI SDK Error:', error.message);
                // Fallback to OpenRouter if native fails
            }
        }

        // Fallback: OpenRouter with Gemini 2.0 Flash (Fastest free option)
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: message }
        ];

        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'tencent/hy3-preview:free', // Stable free model
                messages: messages,
                max_tokens: 500,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://ambassadors-assembly-web.onrender.com',
                    'X-Title': 'Ambassadors Assembly'
                },
                timeout: 15000 // Increased to 15s to prevent false offline messages
            });

            if (response.data?.choices?.[0]?.message?.content) {
                return response.data.choices[0].message.content;
            }
            throw new Error('Invalid response from OpenRouter');

        } catch (error) {
            console.error('[AIService] Provider Error:', error.response?.data || error.message);
            // High IQ: Using unicode for apostrophe to avoid encoding issues
            return "Ambassador, I\u0027m momentarily offline. Please try again or join us this Sunday!";
        }
    }
};

