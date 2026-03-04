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

  // Create OAuth2Client instance with GOOGLE_CLIENT_ID
  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  
  try {
    // Verify ID token using client.verifyIdToken()
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    
    // Extract email, name, and sub (googleId) from token payload
    const payload = ticket.getPayload();
    
    return {
      email: payload.email.toLowerCase(), // Convert email to lowercase
      name: payload.name.toLowerCase(),   // Convert name to lowercase
      googleId: payload.sub,              // Google's unique user ID
    };
  } catch (error) {
    // Throw AuthenticationError for invalid/expired tokens
    throw new AuthenticationError('Invalid or expired Google token');
  }
};

export { verifyGoogleToken };