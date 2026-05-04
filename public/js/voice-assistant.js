import { Conversation } from "https://esm.sh/@elevenlabs/client";

/**
 * Ambassadors Assembly - Professional Voice Assistant
 * Powered by ElevenLabs Conversational AI
 */

class VoiceVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        this.isActive = false;
    }

    async start(stream) {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            this.isActive = true;
            this.draw();
        } catch (err) {
            console.error("Visualizer Start Error:", err);
        }
    }

    draw() {
        if (!this.isActive) return;
        this.animationId = requestAnimationFrame(() => this.draw());

        this.analyser.getByteFrequencyData(this.dataArray);

        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.clearRect(0, 0, width, height);

        const barWidth = (width / this.dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < this.dataArray.length; i++) {
            const barHeight = (this.dataArray[i] / 255) * height * 0.8;
            
            // Cinematic Gradient (Emerald Theme)
            const gradient = this.ctx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
            gradient.addColorStop(0, 'rgba(23, 106, 96, 0)');
            gradient.addColorStop(0.5, 'rgba(37, 211, 102, 0.8)');
            gradient.addColorStop(1, 'rgba(23, 106, 96, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, (height - barHeight) / 2, barWidth - 2, barHeight);

            x += barWidth;
        }
    }

    stop() {
        this.isActive = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.audioContext) this.audioContext.close();
        if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const callBtn = document.getElementById('ai-call-btn');
    const messagesBody = document.getElementById('ai-chat-messages');
    const callOverlay = document.getElementById('ai-call-overlay');
    const statusLabel = document.getElementById('call-status-label');
    const endCallBtn = document.getElementById('end-call-btn');
    
    let conversation = null;
    let visualizer = new VoiceVisualizer('voice-visualizer');
    let isActive = false;
    let callSafetyTimer = null; // High IQ: Safety timer to prevent credit drain

    const addSystemMessage = (text) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai system-msg';
        msgDiv.style.fontStyle = 'italic';
        msgDiv.style.opacity = '0.7';
        msgDiv.innerHTML = `<div class="msg-content">${text}</div>`;
        if (messagesBody) {
            messagesBody.appendChild(msgDiv);
            messagesBody.scrollTop = messagesBody.scrollHeight;
        }
    };

    const updateUIState = (state) => {
        if (statusLabel) {
            statusLabel.innerText = state;
            statusLabel.style.color = (state === 'ERROR') ? '#ef4444' : '#25D366';
        }
    };

    const startCall = async () => {
        try {
            // 1. Check Microphone Permission First
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (micErr) {
                console.error("[Voice] Microphone Error:", micErr);
                alert("Microphone access denied. Please enable microphone permissions in your browser settings to use the AI Assistant.");
                stopCall();
                return;
            }

            console.log("[Voice] Initiating ElevenLabs Session...");
            updateUIState('INITIALIZING');
            callOverlay.classList.add('active');
            callBtn.classList.add('connecting');

            // 2. Fetch Signed URL
            const response = await fetch('/api/voice/create-web-call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': document.querySelector('input[name="_csrf"]')?.value || ''
                }
            });

            if (!response.ok) throw new Error('Failed to get signed URL from server.');
            const { signed_url } = await response.json();
            
            // 3. Start Conversation
            conversation = await Conversation.startSession({
                signedUrl: signed_url,
                onConnect: () => {
                    isActive = true;
                    updateUIState('CONNECTED');
                    console.log("[Voice] Connected to ElevenLabs");
                    addSystemMessage("Ambassadors AI is now live. You can speak freely.");

                    // Start Visualizer with the stream we already got
                    visualizer.start(stream);

                    if (callSafetyTimer) clearTimeout(callSafetyTimer);
                    callSafetyTimer = setTimeout(() => {
                        console.log("[Voice] 90s safety limit reached. Ending call.");
                        addSystemMessage("Safety limit reached (1:30). Wrapping up...");
                        stopCall();
                    }, 90000); 
                },
                onDisconnect: () => {
                    isActive = false;
                    if (callSafetyTimer) clearTimeout(callSafetyTimer);
                    stopCall();
                },
                onError: (error) => {
                    console.error("[Voice] ElevenLabs Error:", error);
                    updateUIState('ERROR');
                    addSystemMessage("Connection error. Reconnecting...");
                },
                onModeChange: ({ mode }) => {
                    if (mode === 'speaking') {
                        updateUIState('AI SPEAKING');
                    } else {
                        updateUIState('LISTENING');
                    }
                }
            });

        } catch (err) {
            console.error("[Voice] General Start Error:", err);
            alert("Could not start voice call: " + err.message);
            stopCall();
        }
    };

    const stopCall = async () => {
        if (conversation) {
            await conversation.endSession();
            conversation = null;
        }
        if (callSafetyTimer) clearTimeout(callSafetyTimer);
        isActive = false;
        visualizer.stop();
        callOverlay.classList.remove('active');
        callBtn.classList.remove('active', 'connecting');
        updateUIState('DISCONNECTED');
    };

    callBtn.addEventListener('click', () => {
        const isLoggedIn = callBtn.getAttribute('data-logged-in') === 'true';
        
        if (!isLoggedIn) {
            alert("Please log in to use the AI Voice Assistant.");
            window.location.href = '/account/login?redirect=/';
            return;
        }

        if (isActive) {
            stopCall();
        } else {
            startCall();
        }
    });

    if (endCallBtn) {
        endCallBtn.addEventListener('click', stopCall);
    }
});
