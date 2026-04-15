/**
 * Ambassadors Assembly - Global UI Controller
 * Overrides native browser popups and handles cinematic interactions.
 */

window.AA = {
  // Custom Alert
  alert: function(message, title = "Notification") {
    return new Promise((resolve) => {
      this._openModal(message, title, false, resolve);
    });
  },

  // Custom Confirm
  confirm: function(message, title = "Confirmation") {
    return new Promise((resolve) => {
      this._openModal(message, title, true, (result) => {
        resolve(result);
      });
    });
  },

  // Internal Modal Logic
  _openModal: function(message, title, isConfirm, callback) {
    const root = document.getElementById('aa-modal-root');
    const msgEl = document.getElementById('aa-modal-message');
    const headerEl = document.getElementById('aa-modal-header-text');
    const cancelBtn = document.getElementById('aa-modal-cancel');
    const confirmBtn = document.getElementById('aa-modal-confirm');
    const closeBtn = document.getElementById('aa-modal-close');

    if (!root) {
      console.warn('[AA-UI] Modal root not found in DOM.');
      return;
    }

    msgEl.innerText = message;
    headerEl.innerText = title;
    cancelBtn.style.display = isConfirm ? 'block' : 'none';
    confirmBtn.innerText = isConfirm ? 'Confirm' : 'Got it';

    root.classList.add('active');

    const handleAction = (result) => {
      root.classList.remove('active');
      // Remove listeners to prevent leak
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      closeBtn.onclick = null;
      callback(result);
    };

    confirmBtn.onclick = () => handleAction(true);
    cancelBtn.onclick = () => handleAction(false);
    closeBtn.onclick = () => handleAction(false);
  }
};

// GLOBAL OVERRIDE (High IQ: Intercepts all legacy alert calls)
// Note: We keep them as aliases but recommend using window.AA
window.alert = (msg) => window.AA.alert(msg);
window.confirm = (msg) => window.AA.confirm(msg);
// Prompt is more complex, we'll implement if needed but for now we discourage it for premium UX.
