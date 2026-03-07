import { OAuth2Client } from 'google-auth-library';
import env from '../config/envConfigSetup.js';
import { AuthenticationError, InternalServerError } from '../utils/errors.js';
/**
 * Verifies Google ID token and extracts user information
 * @param {string} idToken - Google ID token from frontend
 * @returns {Promise<{email: string, name: string, googleId: string}>}
 * @throws {AuthenticationError} if token is invalid
 * @throws {InternalServerError} if Google Client ID is not configured
 */
const verifyGoogleToken = async (idToken) => {
  // Validate GOOGLE_CLIENT_ID is configured
  if (!env.GOOGLE_CLIENT_ID) {
    throw new InternalServerError('Google Client ID not configured');
  }

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    return {
      email: payload.email.toLowerCase(),
      name: payload.name,
      googleId: payload.sub,
    };
  } catch (error) {
    throw new AuthenticationError('Invalid or expired Google token');
  }
};

export { verifyGoogleToken };