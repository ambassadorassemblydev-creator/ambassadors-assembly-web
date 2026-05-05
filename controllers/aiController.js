import { aiService } from '../services/aiService.js';
import { supabase } from '../config/supabase.js';
import { redis } from '../config/redis.js';

export const aiController = {
    async handleChat(req, res) {
        try {
            const { message, history } = req.body;
            const userId = req.user?.id || null;

            if (!message) {
                return res.status(400).json({ error: 'Message is required' });
            }

            const response = await aiService.chat(message, userId, history);

            // Log the interaction
            if (userId) {
                await supabase.from('audit_log').insert({
                    actor_id: userId,
                    actor_email: req.user?.email || null,
                    action: 'ai_chat_interact',
                    description: `Interacted with AI Assistant: "${message.substring(0, 50)}..."`,
                    new_values: { message_preview: message.substring(0, 100) }
                });
            }

            res.json({ response });
        } catch (error) {
            console.error('[AIController] Chat Error:', error.message);
            res.status(500).json({ error: 'Failed to process AI chat' });
        }
    },

    async handleVoiceCall(req, res) {
        try {
            const userId = req.user?.id || req.ip;
            const limitKey = `voice_limit:${userId}`;
            const limit = 3;
            const windowSeconds = 7 * 24 * 60 * 60; // 7 days

            // High IQ: Rate limiting logic
            if (redis) {
                const currentCount = await redis.get(limitKey);
                
                if (currentCount && parseInt(currentCount) >= limit) {
                    const ttl = await redis.ttl(limitKey);
                    const days = Math.floor(ttl / (24 * 3600));
                    const hours = Math.floor((ttl % (24 * 3600)) / 3600);
                    const minutes = Math.floor((ttl % 3600) / 60);
                    
                    let timeStr = "";
                    if (days > 0) timeStr += `${days}d `;
                    if (hours > 0) timeStr += `${hours}h `;
                    if (minutes > 0 || timeStr === "") timeStr += `${minutes}m`;

                    return res.status(429).json({ 
                        error: `Weekly call limit reached.`,
                        message: `Ambassador, you have reached your limit of ${limit} calls per week. Please try again in ${timeStr.trim()}.`
                    });
                }
            }

            const userIdForAI = req.user?.id || null;
            const callData = await aiService.getElevenLabsSignedUrl(userIdForAI);
            
            // Increment after successful url generation
            if (redis) {
                const newVal = await redis.incr(limitKey);
                if (newVal === 1) {
                    await redis.expire(limitKey, windowSeconds);
                }
            }

            // High IQ: Return the signed URL and remaining quota
            res.json({ 
                ...callData,
                remaining: Math.max(0, limit - newVal)
            });
        } catch (error) {
            console.error('[AIController] Voice Error:', error.message);
            res.status(500).json({ error: error.message || 'Failed to initiate voice call' });
        }
    }
};
