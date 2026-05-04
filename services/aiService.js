import axios from 'axios';
import { supabase } from '../config/supabase.js';

/**
 * AIService handles communication with AI providers
 * (Primarily OpenRouter for Gemini 2.0 Flash) to provide a church-aware assistant.
 */
export const aiService = {
    async getChurchContext(userId = null) {
        // Fetch public church info (selective)
        const { data: settings } = await supabase
            .from('church_settings')
            .select('key, value')
            .in('key', ['site_description', 'church_address', 'church_email', 'church_phone', 'social_instagram', 'social_facebook', 'social_youtube'])
            .eq('is_public', true);
            
        // Fetch active service times (High IQ: Real data from DB)
        const { data: serviceTimes } = await supabase
            .from('service_times')
            .select('name, day_of_week, start_time, end_time')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

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
            .select('title')
            .order('sermon_date', { descending: true })
            .limit(3);

        // Fetch ministries (names only)
        const { data: ministries } = await supabase
            .from('ministries')
            .select('name')
            .limit(8);

        let userName = '';
        let userDept = '';
        if (userId) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, department')
                .eq('id', userId)
                .single();
            
            if (profile) {
                userName = profile.first_name || 'Ambassador';
                userDept = profile.department || '';
            }
        }

        const formatList = (arr, key) => arr?.map(i => i[key]).join(', ') || 'None';
        const formattedServiceTimes = serviceTimes?.map(s => `${s.name}: ${s.day_of_week}s at ${s.start_time.substring(0, 5)}`).join(' | ') || 'Sundays at 8AM and 10AM';

        const context = `
Identity: Ambassadors Assembly (Raising Men, Transforming Lives).
Description: ${settings?.find(s => s.key === 'site_description')?.value || ''}
Address: ${settings?.find(s => s.key === 'church_address')?.value || ''}
Contact: ${settings?.find(s => s.key === 'church_phone')?.value || ''} / ${settings?.find(s => s.key === 'church_email')?.value || ''}
Service Times: ${formattedServiceTimes}
Upcoming Events: ${formatList(events, 'title')}
Latest Sermons: ${formatList(sermons, 'title')}
Active Ministries: ${formatList(ministries, 'name')}
User Info: Name: ${userName}, Department: ${userDept}
`;
        return { context, userName };
    },

    async chat(message, userId = null, history = []) {
        const { context, userName } = await this.getChurchContext(userId);
        
        const systemPrompt = `
You are the "Ambassadors AI", the official digital assistant for Ambassadors Assembly.
Your primary role is to assist the "Ambassadors" (members and visitors) with information about our church.

CHURCH CONTEXT (REAL-TIME DATA):
${context}

PERSONALITY & TONE:
- Professional, cinematic, and spiritually encouraging. 
- Address the user as "Ambassador ${userName || ''}" if a name is known, otherwise just "Ambassador".
- Always provide a relevant Scripture (NIV or KJV) for spiritual questions.
- You are allowed and encouraged to use Markdown formatting (bold, italics, lists) for beautiful responses.

OPERATIONAL RULES:
1. You ARE the Ambassadors AI. Never mention Google, OpenAI, or being a model.
2. If asked about service times, refer exactly to the "Service Times" provided in the context.
3. Be concise but impactful.
`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map(h => ({
                role: h.role === 'assistant' ? 'assistant' : 'user',
                content: h.content
            })),
            { role: 'user', content: message } 
        ];

        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'openai/gpt-oss-20b:free', 
                messages: messages,
                max_tokens: 2048,
                temperature: 0.7
            }, {

                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://theambassadorsassembly.org',
                    'X-Title': 'Ambassadors AI'
                },
                timeout: 20000
            });

            if (response.data?.choices?.[0]?.message?.content) {
                return response.data.choices[0].message.content;
            }

            console.error('[AIService] OpenRouter Response Data:', response.data);
            throw new Error('OpenRouter response missing content');

        } catch (error) {
            console.error('[AIService] Provider Error:', error.response?.data || error.message);
            return "Ambassador, I\u0027m momentarily offline. Our service times are Sundays at 8AM and 10AM, and Wednesdays at 6PM. I look forward to assisting you again soon!";
        }
    },

    async getElevenLabsSignedUrl(userId = null) {
        try {
            // High IQ: Fetch the latest church context from DB
            const { context, userName } = await this.getChurchContext(userId);

            // High IQ: Securely creating a signed URL with Dynamic Context Override
            // This injects the church info directly into the AI's "brain" for this specific call
            const response = await axios.get(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url`, {
                params: {
                    agent_id: process.env.ELEVENLABS_AGENT_ID
                },
                headers: {
                    'xi-api-key': process.env.ELEVENLABS_API_KEY
                }
            });

            return {
                signed_url: response.data.signed_url,
                dynamic_variables: {
                    user_name: userName || 'Ambassador',
                    church_context: context
                }
            };
        } catch (error) {
            console.error('[AIService] ElevenLabs Error:', error.response?.data || error.message);
            throw new Error('Failed to initiate voice connection');
        }
    }
};
