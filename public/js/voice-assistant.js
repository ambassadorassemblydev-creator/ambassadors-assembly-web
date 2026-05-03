/**
 * Ambassadors Assembly - Voice Assistant
 * Powered by Vapi.ai
 */

document.addEventListener('DOMContentLoaded', () => {
    const callBtn = document.getElementById('ai-call-btn');
    const messagesBody = document.getElementById('ai-chat-messages');
    const callOverlay = document.getElementById('ai-call-overlay');
    const callStatusText = document.getElementById('ai-call-status');
    const endCallBtn = document.getElementById('end-call-btn');

    // Replace with your Vapi Public Key from https://dashboard.vapi.ai
    const VAPI_PUBLIC_KEY = "b45e6a5e-44f4-48a5-a2ec-465df67f1887";

    // Replace with your Vapi Assistant ID
    const ASSISTANT_ID = "8716131c-48ca-4d53-8ca9-441cec404741";


    let vapi = null;
    let isActive = false;

    const initVapi = () => {
        if (vapi) return true;
        if (typeof Vapi !== 'undefined') {
            vapi = new Vapi(VAPI_PUBLIC_KEY);
            setupVapiHandlers();
            return true;
        }
        return false;
    };

    const setupVapiHandlers = () => {
        vapi.on('call-start', () => {
            isActive = true;
            callBtn.classList.remove('connecting');
            callBtn.classList.add('active');
            if (callOverlay) callOverlay.classList.add('active');
            if (callStatusText) callStatusText.innerText = "Call Active";
            addSystemMessage("Voice call started. You can speak now.");
        });

        vapi.on('call-end', () => {
            isActive = false;
            callBtn.classList.remove('active', 'connecting');
            if (callOverlay) callOverlay.classList.remove('active');
            addSystemMessage("Voice call ended.");
        });

        vapi.on('speech-start', () => {
            if (callStatusText) callStatusText.innerText = "AI Speaking...";
        });

        vapi.on('speech-end', () => {
            if (callStatusText) callStatusText.innerText = "Listening...";
        });

        vapi.on('error', (e) => {
            console.error('Vapi Error:', e);
            addSystemMessage("Connection failed. Check your microphone.");
            isActive = false;
            callBtn.classList.remove('active', 'connecting');
        });
    };

    // Try initial load
    initVapi();

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
        // High IQ: JIT Initialization if not already ready
        if (!initVapi()) {
            alert("Voice assistant library is still loading from the cloud. Please wait 2 seconds and try again.");
            return;
        }

        // 1. Context Resolution (High IQ: Provide personal touch if logged in, fallback to guest)
        const userContext = window.currentUser || { first_name: 'Ambassador', role: 'Guest' };

        if (isActive) {
            vapi.stop();
        } else {
            // Check for microphone permission
            try {
                const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // HIGH IQ: Stop the test stream immediately to release the microphone for Vapi
                testStream.getTracks().forEach(track => track.stop());
                
                // HIGH IQ: Pass user context to the AI
                const assistantOverrides = {
                    variableValues: {
                        userName: userContext.first_name || 'Ambassador',
                        userRole: userContext.role || 'Guest',
                        churchAddress: window.churchContext?.address || '',
                        churchPhone: window.churchContext?.phone || '',
                        churchEmail: window.churchContext?.email || '',
                        churchDescription: window.churchContext?.description || ''
                    }
                };

                // Clear any previous state
                vapi.stop();
                
                // Connect with full context
                vapi.start(ASSISTANT_ID, assistantOverrides);
                
                addSystemMessage("Connecting to the Throne Room (Ambassadors AI)...");
                callBtn.classList.add('connecting');

            } catch (err) {
                console.error("Voice Error:", err);
                alert("Microphone access is required for voice calls.");
            }
        }
    });

    if (endCallBtn) {
        endCallBtn.addEventListener('click', () => {
            if (vapi && isActive) {
                vapi.stop();
            }
        });
    }
});

