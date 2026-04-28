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

/**
 * AMBASSADORS ASSEMBLY - DASHBOARD CONTROLLER
 * Handles tab switching, sidebar toggles, and mobile interactions.
 */
window.aasTab = function(tabId, el) {
    // 1. Progress bar animation
    const pb = document.getElementById('aasProgress');
    if (pb) {
        pb.style.opacity = '1';
        pb.style.width = '30%';
        setTimeout(() => { pb.style.width = '100%'; }, 100);
        setTimeout(() => { pb.style.opacity = '0'; pb.style.width = '0%'; }, 500);
    }

    // 2. Tab switching
    document.querySelectorAll('.aas-tab').forEach(t => t.classList.remove('on'));
    const target = document.getElementById('aas-' + tabId);
    if (target) target.classList.add('on');

    // 3. Sidebar link active state
    document.querySelectorAll('.aas-lnk').forEach(l => l.classList.remove('active'));
    if (el) el.classList.add('active');

    // 4. Close mobile sidebar if open
    const sidebar = document.getElementById('aasSidebar');
    const overlay = document.getElementById('aasOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('on');

    // 5. URL management (optional but premium)
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.pushState({}, '', url);
};

window.aasTabById = function(tabId) {
    const btn = document.querySelector(`.aas-lnk[onclick*="'${tabId}'"]`);
    window.aasTab(tabId, btn);
};

// Hamburger Toggle
document.addEventListener('DOMContentLoaded', () => {
    const ham = document.getElementById('aasHam');
    const sidebar = document.getElementById('aasSidebar');
    const overlay = document.getElementById('aasOverlay');

    if (ham && sidebar && overlay) {
        ham.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('on');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('on');
        });
    }
});
