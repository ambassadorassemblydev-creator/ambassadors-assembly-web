/**
 * Standard Premium Email Template for Ambassadors Assembly
 */
export const getStandardTemplate = (title, content, buttonText = null, buttonUrl = null) => {
  const buttonHtml = buttonText && buttonUrl 
    ? `<a href="${buttonUrl}" class="button">${buttonText}</a>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(145deg, #121212, #0a0a0a); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; overflow: hidden; margin-top: 40px; }
    .header { background: #176a60; padding: 40px; text-align: center; }
    .logo { width: 180px; filter: brightness(0) invert(1); }
    .content { padding: 40px; text-align: center; line-height: 1.6; }
    .title { font-size: 28px; font-weight: 700; margin-bottom: 20px; color: #ffffff; }
    .text { color: rgba(255,255,255,0.7); font-size: 16px; margin-bottom: 30px; white-space: pre-wrap; }
    .button { display: inline-block; padding: 16px 32px; background: #25D366; color: #000000; text-decoration: none; border-radius: 12px; font-weight: 600; box-shadow: 0 4px 14px 0 rgba(37, 211, 102, 0.39); }
    .footer { padding: 30px; text-align: center; font-size: 12px; color: rgba(255,255,255,0.4); border-top: 1px solid rgba(255,255,255,0.05); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://res.cloudinary.com/dxwhpacz7/image/upload/v1775200226/IMG-20260304-WA0059_telyum.jpg" class="logo" alt="Ambassadors Assembly">
    </div>
    <div class="content">
      <h1 class="title">${title}</h1>
      <div class="text">${content}</div>
      ${buttonHtml}
    </div>
    <div class="footer">
      <p>Living Faith Foundation - The Ambassadors' Assembly</p>
      <p>Lagos, Nigeria</p>
      <p>&copy; ${new Date().getFullYear()} Ambassadors Assembly. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};
