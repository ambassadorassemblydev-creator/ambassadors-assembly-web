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
window.alert = (msg) => {
    if (typeof showToast === 'function') {
        showToast(msg, 'info');
    } else {
        window.AA.alert(msg); // Fallback
    }
};
window.confirm = (msg) => window.AA.confirm(msg);


// ==========================================
// 2. GLOBAL DOUBLE-SUBMISSION PREVENTION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('submit', (e) => {
        const form = e.target;
        
        // Skip if specifically opted out
        if (form.classList.contains('no-disable')) return;

        // Find the submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (!submitBtn) return;

        // Prevent double clicks
        submitBtn.disabled = true;

        // UI Feedback: Show "Processing..." or a spinner
        // If it's a simple text button, update text. If it has icons, we add a class.
        const originalHtml = submitBtn.innerHTML;
        submitBtn.setAttribute('data-original-html', originalHtml);
        
        // Premium Nigerian/South UX: "Conscious Loading"
        if (submitBtn.innerText.trim().length > 0) {
            submitBtn.innerHTML = `
                <span class="loading-container">
                    <span class="processing-text">Processing...</span>
                </span>
            `;
        } else {
            // Usually icon-only buttons
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        }

        // Add a global class for styling if needed
        submitBtn.classList.add('is-submitting');
    });
});
