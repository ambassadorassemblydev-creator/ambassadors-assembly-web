/**
 * AMBASSADORS ASSEMBLY - PWA HANDLER
 * Manages Service Worker registration and Push Notification subscriptions.
 */

const PWA = {
    VAPID_PUBLIC_KEY: window.APP_VAPID_PUBLIC_KEY || 'BAmtIZImYIhCLz6fyr8t41WrtWWAvdxyVKFOY5fs8X6vfo5YPxyMpoBAEFh1N7mjst2XxhNGX4gJV5ms_EGD9Rs',

    init: async function() {
        if (!('serviceWorker' in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('[PWA] Service Worker registered with scope:', registration.scope);

            // Wait for registration to be ready
            await navigator.serviceWorker.ready;
            
            // Auto-request subscription if permission already granted
            if (Notification.permission === 'granted') {
                this.subscribeUser(registration);
            }
        } catch (error) {
            console.error('[PWA] Service Worker registration failed:', error);
        }
    },

    requestPermission: async function() {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const registration = await navigator.serviceWorker.ready;
            await this.subscribeUser(registration);
            return true;
        }
        return false;
    },

    subscribeUser: async function(registration) {
        try {
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY)
            });

            console.log('[PWA] User is subscribed:', subscription);

            // Send subscription to server
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription })
            });

            if (!response.ok) throw new Error('Failed to save subscription on server');
            console.log('[PWA] Subscription saved on server ✅');
        } catch (error) {
            console.error('[PWA] Failed to subscribe the user:', error);
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

// Initialize on load
window.addEventListener('load', () => PWA.init());
window.PWA = PWA;
