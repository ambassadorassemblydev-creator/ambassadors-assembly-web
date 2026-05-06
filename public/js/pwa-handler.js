const PWA = {
    VAPID_PUBLIC_KEY: window.APP_VAPID_PUBLIC_KEY || 'BAmtIZImYIhCLz6fyr8t41WrtWWAvdxyVKFOY5fs8X6vfo5YPxyMpoBAEFh1N7mjst2XxhNGX4gJV5ms_EGD9Rs',

    init: async function() {
        if (!('serviceWorker' in navigator)) return;

        try {
            // Wait for the SW registered in head.ejs to be ready
            const registration = await navigator.serviceWorker.ready;
            console.log('[PWA] Service Worker ready.');
            
            // 1. If granted, ensure subscription is fresh
            if (Notification.permission === 'granted') {
                this.subscribeUser(registration);
            } 
            // 2. If default (not asked yet), show the premium prompt
            else if (Notification.permission === 'default') {
                this.showNotificationPrompt();
            }
        } catch (error) {
            console.error('[PWA] Initialization failed:', error);
        }
    },

    showNotificationPrompt: function() {
        // High IQ: Prevent multiple prompts
        if (document.getElementById('pwa-notification-prompt')) return;

        const prompt = document.createElement('div');
        prompt.id = 'pwa-notification-prompt';
        prompt.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            z-index: 9999;
            background: rgba(23, 106, 96, 0.9);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 20px 25px;
            color: white;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            gap: 20px;
            width: 90%;
            max-width: 500px;
            transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            font-family: 'Articulatcf-regular', sans-serif;
        `;

        prompt.innerHTML = `
            <div style="font-size: 24px;">🔔</div>
            <div style="flex: 1;">
                <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #25D366;">Stay Connected</h4>
                <p style="margin: 5px 0 0; font-size: 13px; opacity: 0.9; line-height: 1.4;">Receive alerts for live sermons and community updates.</p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="pwa-prompt-dismiss" style="background: transparent; border: none; color: rgba(255,255,255,0.6); font-size: 12px; cursor: pointer; padding: 5px 10px;">Later</button>
                <button id="pwa-prompt-enable" style="background: #25D366; border: none; color: white; padding: 8px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);">Enable</button>
            </div>
        `;

        document.body.appendChild(prompt);

        // Animate in
        setTimeout(() => {
            prompt.style.transform = 'translateX(-50%) translateY(0)';
        }, 1000);

        // Event Listeners
        document.getElementById('pwa-prompt-dismiss').onclick = () => {
            prompt.style.transform = 'translateX(-50%) translateY(150px)';
            setTimeout(() => prompt.remove(), 600);
        };

        document.getElementById('pwa-prompt-enable').onclick = async () => {
            prompt.style.transform = 'translateX(-50%) translateY(150px)';
            const granted = await this.requestPermission();
            setTimeout(() => prompt.remove(), 600);
        };
    },

    requestPermission: async function() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready;
                await this.subscribeUser(registration);
                return true;
            }
        } catch (error) {
            console.error('[PWA] Permission request failed:', error);
        }
        return false;
    },

    subscribeUser: async function(registration) {
        try {
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY)
            });

            console.log('[PWA] User is subscribed.');

            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken
                },
                body: JSON.stringify({ subscription })
            });
            console.log('[PWA] Subscription saved ✅');
        } catch (error) {
            console.error('[PWA] Failed to subscribe:', error);
        }
    },

    urlBase64ToUint8Array: function(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
};

window.addEventListener('load', () => PWA.init());
window.PWA = PWA;
