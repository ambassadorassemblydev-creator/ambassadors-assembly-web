import { aiService } from '../services/aiService.js';
import { supabase } from '../config/supabase.js';

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
            const userId = req.user?.id || null;
            const callData = await aiService.getElevenLabsSignedUrl(userId);
            
            // High IQ: Return the signed URL for the frontend SDK
            res.json(callData);
        } catch (error) {
            console.error('[AIController] Voice Error:', error.message);
            res.status(500).json({ error: error.message || 'Failed to initiate voice call' });
        }
    }
};
