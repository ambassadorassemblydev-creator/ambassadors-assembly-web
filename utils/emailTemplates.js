/**
 * Ambassadors Assembly Premium Email Template System
 * 
 * DESIGN SYSTEM: "Emerald Majesty"
 * RATIONALE: High-Trust, Cinematic, and Luxurious. Uses emerald greens (#176a60) 
 * paired with a gold accent (#f59e0b) to represent the church's brand identity.
 * 
 * @module EmailTemplates
 */

const COLORS = {
  primary: '#176a60',
  primaryDark: '#0d3f39',
  accent: '#f59e0b', // Gold for highlights
  background: '#f0f4f3',
  white: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  success: '#10b981',
  error: '#ef4444'
};

const FONTS = {
  heading: "'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  body: "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
};

/**
 * Base Layout Wrapper
 * Handles the responsive container, header logo, and brand footer.
 */
const getBaseLayout = (contentHtml, previewText = "") => `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Ambassadors Assembly</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    /* RESET */
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: ${COLORS.background}; }
    img { line-height: 100%; outline: none; text-decoration: none; border: 0; }
    table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    
    /* UTILS */
    .external-wrapper { background-color: ${COLORS.background}; padding: 40px 20px; }
    .main-container { max-width: 600px; margin: 0 auto; background-color: ${COLORS.white}; border-radius: 32px; overflow: hidden; box-shadow: 0 20px 50px rgba(23, 106, 96, 0.12); border: 1px solid rgba(23, 106, 96, 0.05); }
    
    /* HEADER */
    .hero-banner { 
      background: ${COLORS.primary} linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); 
      padding: 60px 40px; 
      text-align: center;
      position: relative;
    }
    .logo-box { 
      background: white; 
      width: 80px; 
      height: 80px; 
      margin: 0 auto; 
      border-radius: 24px; 
      padding: 6px; 
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
    }
    
    /* BODY */
    .email-body { padding: 48px 40px; }
    .h1 { font-family: ${FONTS.heading}; font-size: 32px; font-weight: 800; color: ${COLORS.primary}; margin: 0 0 16px 0; letter-spacing: -0.03em; line-height: 1.1; }
    .p { font-family: ${FONTS.body}; font-size: 16px; line-height: 1.8; color: ${COLORS.text}; margin: 0; }
    
    /* BUTTON */
    .btn-container { padding-top: 40px; text-align: center; }
    .btn { 
      display: inline-block; 
      padding: 18px 44px; 
      background: ${COLORS.primary}; 
      color: #ffffff !important; 
      text-decoration: none; 
      border-radius: 16px; 
      font-family: ${FONTS.heading};
      font-weight: 700; 
      font-size: 14px; 
      text-transform: uppercase; 
      letter-spacing: 0.08em; 
      box-shadow: 0 10px 20px rgba(23, 106, 96, 0.2);
    }
    
    /* FOOTER */
    .footer { padding: 48px 40px; background-color: #f8faf9; text-align: center; border-top: 1px solid #eef2f1; }
    .footer-brand { font-family: ${FONTS.heading}; font-size: 14px; font-weight: 800; color: ${COLORS.primaryDark}; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 8px; }
    .footer-sub { font-size: 12px; color: ${COLORS.textLight}; margin: 4px 0; font-weight: 500; }
    .social-link { color: ${COLORS.primary}; text-decoration: none; font-weight: 700; margin: 0 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }

    @media only screen and (max-width: 480px) {
      .email-body { padding: 40px 24px; }
      .h1 { font-size: 26px; }
      .hero-banner { padding: 48px 20px; }
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</div>
  <div class="external-wrapper">
    <table class="main-container" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td class="hero-banner">
          <div class="logo-box">
            <img src="https://res.cloudinary.com/dxwhpacz7/image/upload/v1775200226/IMG-20260304-WA0059_telyum.jpg" width="80" height="80" alt="Ambassadors Assembly">
          </div>
        </td>
      </tr>
      <tr>
        <td class="email-body">
          ${contentHtml}
        </td>
      </tr>
      <tr>
        <td class="footer">
          <div class="footer-brand">The Ambassadors' Assembly</div>
          <div class="footer-sub">7 Fashe Street, Omole Phase 2, Lagos, Nigeria</div>
          <div class="footer-sub">Raising Men, Transforming Lives.</div>
          <div style="margin-top: 32px;">
            <a href="https://instagram.com/theambassadorsassembly" class="social-link">Instagram</a>
            <a href="https://youtube.com/@theambassadorsassembly" class="social-link">YouTube</a>
            <a href="https://theambassadorsassembly.org" class="social-link">Website</a>
          </div>
          <div class="footer-sub" style="margin-top: 40px; opacity: 0.5;">&copy; ${new Date().getFullYear()} Ambassadors Assembly.</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

/**
 * 1. Welcome Email Template
 * Used when a new member joins the platform to establish immediate brand warmth.
 * 
 * @param {string} name - The first name of the new member.
 * @returns {string} Fully rendered HTML email.
 */
export const getWelcomeTemplate = (name) => {
  const content = `
    <h1 class="h1">Welcome Home,<br>${name}!</h1>
    <p class="p">We are absolutely thrilled to have you as part of the Ambassadors Assembly family. You haven't just joined an organization; you've joined a community dedicated to <strong>Raising Men, Transforming Lives, and Impacting Nations.</strong></p>
    <div style="height: 24px;"></div>
    <p class="p">Your account is now fully active. You can now access our exclusive sermon library, track your community impact, and join a ministry team.</p>
    <div class="btn-container">
      <a href="https://theambassadorsassembly.org/my-account" class="btn">Explore My Account</a>
    </div>
  `;
  return getBaseLayout(content, "Welcome to the family, Ambassador!");
};

/**
 * 2. Donation Success Template
 * A high-trust, receipt-style template for successful financial stewardship.
 * 
 * @param {Object} params
 * @param {string} params.name - Donor's name.
 * @param {number|string} params.amount - Amount contributed.
 * @param {string} params.reference - Transaction reference for tracking.
 * @param {string} params.categoryName - e.g., 'Building Fund' or 'Tithe'.
 * @returns {string} Fully rendered HTML email.
 */
export const getDonationSuccessTemplate = ({ name, amount, reference, categoryName }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; padding: 8px 16px; background: rgba(16, 185, 129, 0.1); color: ${COLORS.success}; border-radius: 100px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px;">
        Payment Confirmed
      </div>
      <h1 class="h1" style="margin-bottom: 8px;">Faithful Stewardship</h1>
      <p class="p">Thank you, ${name || 'Ambassador'}, for your generous contribution.</p>
    </div>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 24px; padding: 32px; margin-top: 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-bottom: 12px; font-family: ${FONTS.body}; font-size: 13px; color: ${COLORS.textLight}; text-transform: uppercase; letter-spacing: 0.05em;">Amount Recieved</td>
          <td align="right" style="padding-bottom: 12px; font-family: ${FONTS.heading}; font-size: 20px; font-weight: 800; color: ${COLORS.primary};">₦${Number(amount).toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 12px; font-family: ${FONTS.body}; font-size: 13px; color: ${COLORS.textLight}; text-transform: uppercase; letter-spacing: 0.05em;">Purpose</td>
          <td align="right" style="padding-bottom: 12px; font-family: ${FONTS.body}; font-size: 14px; font-weight: 700;">${categoryName || 'General Giving'}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 12px; font-family: ${FONTS.body}; font-size: 13px; color: ${COLORS.textLight}; text-transform: uppercase; letter-spacing: 0.05em;">Reference</td>
          <td align="right" style="padding-bottom: 12px; font-family: ${FONTS.body}; font-size: 12px; font-weight: 500; color: ${COLORS.textLight};">${reference}</td>
        </tr>
      </table>
    </div>

    <div style="height: 32px;"></div>
    <p class="p" style="font-size: 14px; text-align: center; color: ${COLORS.textLight};">Your contribution directly fuels our missions, outreach, and church development. May God replenish you abundantly.</p>

    <div class="btn-container">
      <a href="https://theambassadorsassembly.org/my-account?tab=giving" class="btn">View Giving History</a>
    </div>
  `;
  return getBaseLayout(content, "Your donation was successful — Thank you!");
};

/**
 * 3. Donation Failed Template
 * A helpful, non-punitive notice for unsuccessful transactions.
 * Includes a prominent "Try Again" call-to-action.
 * 
 * @param {Object} params
 * @param {string} params.name - Intended donor's name.
 * @param {string} params.reason - Friendly explanation of the failure.
 * @param {string} params.reference - Transaction reference for support.
 * @returns {string} Fully rendered HTML email.
 */
export const getDonationFailedTemplate = ({ name, reason, reference }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; padding: 8px 16px; background: rgba(239, 68, 68, 0.1); color: ${COLORS.error}; border-radius: 100px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px;">
        Payment Unsuccessful
      </div>
      <h1 class="h1">Transaction Notice</h1>
      <p class="p">Dear ${name || 'Ambassador'}, we noticed an issue with your recent donation attempt.</p>
    </div>

    <div style="background: rgba(239, 68, 68, 0.02); border: 1px dashed ${COLORS.error}; border-radius: 24px; padding: 32px; margin-top: 32px; text-align: center;">
      <p style="font-family: ${FONTS.body}; font-size: 14px; color: ${COLORS.error}; font-weight: 700; margin: 0;">Error Reason</p>
      <p style="font-family: ${FONTS.body}; font-size: 16px; color: ${COLORS.text}; margin: 8px 0 0 0;">${reason || 'The bank declined the transaction.'}</p>
    </div>

    <div style="height: 32px;"></div>
    <p class="p" style="font-size: 14px; text-align: center;">Don't worry, no funds were deducted. You can try again using a different card or contact your financial provider for more details.</p>

    <div class="btn-container">
      <a href="https://theambassadorsassembly.org/give" class="btn" style="background: #ef4444; box-shadow: 0 10px 20px rgba(239, 68, 68, 0.2);">Try Again</a>
    </div>
  `;
  return getBaseLayout(content, "Issue with your recent donation attempt.");
};

/**
 * 4. Milestone Template (Birthday/Anniversary)
 * A celebratory template used for personal congregation milestones.
 * 
 * @param {Object} params
 * @param {string} params.name - Member's name.
 * @param {string} params.milestoneType - e.g., 'Birthday' or 'Anniversary'.
 * @param {string} params.title - Custom greeting (e.g., 'Happy 30th Birthday!').
 * @param {string} params.message - A spiritual or personal note.
 * @returns {string} Fully rendered HTML email.
 */
export const getMilestoneTemplate = ({ name, milestoneType, title, message }) => {
  const content = `
    <div style="text-align: center;">
      <div style="font-size: 48px; margin-bottom: 24px;">🎉</div>
      <h1 class="h1">${title || 'Happy Celebration!'}</h1>
      <p class="p">Dearest ${name}, the entire Ambassadors Assembly family joins you in celebrating this special ${milestoneType}.</p>
      <div style="height: 24px;"></div>
      <div style="font-family: 'Outfit'; font-style: italic; font-size: 18px; color: ${COLORS.primaryDark}; padding: 0 20px;">
        "${message}"
      </div>
    </div>
    <div class="btn-container">
      <a href="https://theambassadorsassembly.org" class="btn">Celebrate with Us</a>
    </div>
  `;
  return getBaseLayout(content, `Happy ${milestoneType}, ${name}!`);
};

/**
 * 5. Re-engagement Template (Missed Attendance)
 * A warm, concerned follow-up for members who haven't been seen in a while.
 * 
 * @param {Object} params
 * @param {string} params.name - Member's name.
 * @returns {string} Fully rendered HTML email.
 */
export const getReengagementTemplate = (name) => {
  const content = `
    <h1 class="h1">We Miss You,<br>${name}!</h1>
    <p class="p">The sanctuary just doesn't feel the same without you. We noticed it's been a while since your last visit, and we wanted to check in to see how you're doing.</p>
    <div style="height: 24px;"></div>
    <p class="p">You are a vital part of this family, and your presence is truly valued. If you need any prayer or support, please let us know. We hope to see you home again soon!</p>
    <div class="btn-container">
      <a href="https://theambassadorsassembly.org/#services" class="btn">View Service Times</a>
    </div>
  `;
  return getBaseLayout(content, `We've missed you, ${name}!`);
};

/**
 * 6. Application Status Template
 * Used for volunteer or ministry applications to provide clear status updates.
 * 
 * @param {Object} params
 * @param {string} params.name - Applicant's name.
 * @param {string} params.deptName - Name of the department/ministry.
 * @returns {string} Fully rendered HTML email.
 */
export const getApplicationTemplate = (name, deptName) => {
  const content = `
    <h1 class="h1">Impact Team<br>Update</h1>
    <p class="p">Hi ${name}, thank you for your willingness to serve in the <strong>${deptName}</strong>! Your application has been received and is currently under review by our leadership team.</p>
    <div style="height: 24px;"></div>
    <p class="p">We'll be in touch shortly to discuss the next steps in your journey of service. In the meantime, you can track your status in your member dashboard.</p>
    <div class="btn-container">
      <a href="https://theambassadorsassembly.org/my-account?tab=ministry" class="btn">Track My Application</a>
    </div>
  `;
  return getBaseLayout(content, `Your application for ${deptName}`);
};

/**
 * 7. Admin Notification Template
 * High-legibility, technical layout for critical system or financial alerts.
 * 
 * @param {Object} params
 * @param {string} params.title - Clear summary of the event.
 * @param {string} params.details - Detailed context or raw data.
 * @param {string} params.actionUrl - Deep-link to the relevant admin panel.
 * @returns {string} Fully rendered HTML email.
 */
export const getAdminAlertTemplate = ({ title, details, actionUrl }) => {
  const content = `
    <h1 class="h1" style="font-size: 24px; border-bottom: 2px solid ${COLORS.primary}; padding-bottom: 12px;">System Notification</h1>
    <div style="height: 24px;"></div>
    <p class="p" style="font-weight: 700; color: ${COLORS.primaryDark};">${title}</p>
    <div style="height: 16px;"></div>
    <div style="background: #f1f5f9; padding: 24px; border-radius: 16px; font-family: monospace; font-size: 13px; color: ${COLORS.text};">
      ${details}
    </div>
    <div class="btn-container" style="text-align: left;">
      <a href="${actionUrl}" class="btn" style="padding: 14px 28px; font-size: 12px;">Review in Dashboard</a>
    </div>
  `;
  return getBaseLayout(content, `ADMIN ALERT: ${title}`);
};

/**
 * Legacy Support / Generic
 */
export const getStandardTemplate = (title, content, buttonText = null, buttonUrl = null) => {
  const buttonHtml = buttonText && buttonUrl 
    ? `<div class="btn-container"><a href="${buttonUrl}" class="btn">${buttonText}</a></div>`
    : '';
    
  const body = `
    <h1 class="h1">${title}</h1>
    <div class="p">${content}</div>
    ${buttonHtml}
  `;
  return getBaseLayout(body, title);
};
