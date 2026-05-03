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
            if (callStatusText) callStatusText.innerText = "Call Ended";
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
            if (callOverlay) callOverlay.classList.remove('active');
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
        console.log("[Voice] Start Call Button Pressed");
        
        // High IQ: JIT Initialization if not already ready
        if (!initVapi()) {
            console.warn("[Voice] Vapi not initialized, library may still be loading");
            alert("Voice assistant library is still loading from the cloud. Please wait 2 seconds and try again.");
            return;
        }

        // 1. Context Resolution (High IQ: Provide personal touch if logged in, fallback to guest)
        const userContext = window.currentUser || { first_name: 'Ambassador', role: 'Guest' };

        if (isActive) {
            console.log("[Voice] Stopping active call");
            vapi.stop();
        } else {
            console.log("[Voice] Initiating connection...");
            
            // Show connecting UI immediately for instant feedback
            if (callOverlay) {
                callOverlay.classList.add('active');
                if (callStatusText) callStatusText.innerText = "Connecting...";
            }
            callBtn.classList.add('connecting');
            addSystemMessage("Connecting to the Throne Room (Ambassadors AI)...");

            // Check for microphone permission
            try {
                const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log("[Voice] Microphone permission granted");
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
                console.log("[Voice] Calling vapi.start()");
                vapi.start(ASSISTANT_ID, assistantOverrides);

            } catch (err) {
                console.error("[Voice] Media Error:", err);
                alert("Microphone access is required for voice calls.");
                // Reset UI on error
                isActive = false;
                callBtn.classList.remove('active', 'connecting');
                if (callOverlay) callOverlay.classList.remove('active');
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

