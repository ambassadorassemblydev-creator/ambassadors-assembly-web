/**
 * Centralized utility for setting authentication cookies
 * Ensures consistency between login and session refresh
 */
export const setAuthCookies = (res, session) => {
  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };
  
  res.cookie('jwt', session.access_token, cookieOptions);
  res.cookie('refresh_token', session.refresh_token, cookieOptions);
};
