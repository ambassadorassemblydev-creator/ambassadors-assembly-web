/**
 * Ambassadors Assembly - Voice Assistant
 * Powered by Vapi.ai
 */

document.addEventListener('DOMContentLoaded', () => {
    const callBtn = document.getElementById('ai-call-btn');
    const messagesBody = document.getElementById('ai-chat-messages');

    // Replace with your Vapi Public Key from https://dashboard.vapi.ai
    const VAPI_PUBLIC_KEY = "b45e6a5e-44f4-48a5-a2ec-465df67f1887";

    // Replace with your Vapi Assistant ID
    const ASSISTANT_ID = "8716131c-48ca-4d53-8ca9-441cec404741";


    let vapi = null;
    let isActive = false;

    if (typeof Vapi !== 'undefined') {
        vapi = new Vapi(VAPI_PUBLIC_KEY);

        vapi.on('call-start', () => {
            isActive = true;
            callBtn.classList.add('active');
            addSystemMessage("Voice call started. You can speak now.");
        });

        vapi.on('call-end', () => {
            isActive = false;
            callBtn.classList.remove('active');
            addSystemMessage("Voice call ended.");
        });

        vapi.on('message', (message) => {
            if (message.type === 'transcript' && message.transcriptType === 'final') {
                // If it's a transcript of the user or AI, we can show it in the chat
                // For now, let's just log it or show it if you want text sync
            }
        });

        vapi.on('error', (e) => {
            console.error('Vapi Error:', e);
            addSystemMessage("Connection failed. Check your microphone.");
            isActive = false;
            callBtn.classList.remove('active');
        });
    }

    const addSystemMessage = (text) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai system-msg';
        msgDiv.style.fontStyle = 'italic';
        msgDiv.style.opacity = '0.7';
        msgDiv.innerHTML = `<div class="msg-content">${text}</div>`;
        messagesBody.appendChild(msgDiv);
        messagesBody.scrollTop = messagesBody.scrollHeight;
    };

    callBtn.addEventListener('click', async () => {
        if (!vapi) {
            alert("Voice assistant is still initializing. Please wait.");
            return;
        }

        // 1. Logged-in Restriction
        if (!window.currentUser) {
            addSystemMessage("Ambassador, please sign in to your account to use our Voice AI service.");
            return;
        }

        // 2. Daily Limit Check (One Call Per User Per Day)
        const userId = window.currentUser.id || 'anonymous';
        const lastCallKey = `vapi_last_call_${userId}`;
        const lastCallDate = localStorage.getItem(lastCallKey);
        const today = new Date().toDateString();

        if (lastCallDate === today) {
            addSystemMessage("You have reached your spiritual allowance for voice calls today. Please return tomorrow, Ambassador!");
            return;
        }


        if (isActive) {
            vapi.stop();
        } else {
            // Check for microphone permission
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // HIGH IQ: Pass user context to the AI
                const options = {
                    assistantId: ASSISTANT_ID
                };

                if (window.currentUser) {
                    options.assistantOverrides = {
                        variableValues: {
                            userName: window.currentUser.first_name,
                            userRole: window.currentUser.role,
                            churchAddress: window.churchContext.address || '',
                            churchPhone: window.churchContext.phone || '',
                            churchEmail: window.churchContext.email || '',
                            churchDescription: window.churchContext.description || ''
                        }
                    };
                }


                const startOptions = {
                    assistantId: ASSISTANT_ID,
                    assistantOverrides: options.assistantOverrides
                };

                vapi.start(ASSISTANT_ID, options.assistantOverrides);
                
                // HIGH IQ: Mark call as used for today
                localStorage.setItem(lastCallKey, today);

                addSystemMessage("Connecting to Ambassadors AI...");

            } catch (err) {
                alert("Microphone access is required for voice calls.");
            }
        }

    });
});
