/**
 * Environment Variable Validation
 * 
 * This module validates that all required environment variables are present
 * before the server starts. This prevents runtime errors due to missing configuration.
 */
import env from "./envConfigSetup.js";
const requiredEnvVars = [
  // Server Configuration
  'PORT',
  'NODE_ENV',
  'WHITE_LIST_CLIENT_URI',
  
  // Database
  'DB_URI',
  
  // JWT Secrets
  'ADMIN_ACCESS_TOKEN_SECRET',
  'USER_ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  
  // Email Configuration (ZOHO SMTP)
  'ZOHO_ADMIN_EMAIL',
  'ZOHO_SMTP_SECRET',
  
  // Payment Gateway (Razorpay)
  'RP_LOCAL_TEST_KEY_ID',
  'RP_LOCAL_TEST_SECRET',
  'RP_WEBHOOK_TEST_SECRET',
  
  // AWS S3 Configuration
  'AWS_ACCESS_KEY',
  'AWS_SECRET',
  'AWS_BUCKET_REGION',
  'AWS_BUCKET_NAME',
  'AWS_CDN_BASE_URL',
];

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required environment variables are missing
 */
export function validateEnvironment() {
  const missing = requiredEnvVars.filter(varName => !env[varName]);
  
  if (missing.length > 0) {
    console.error('\n❌ ERROR: Missing required environment variables:\n');
    missing.forEach(varName => console.error(`  - ${varName}`));
    console.error('\n💡 Please check your .env file and ensure all required variables are set.');
    console.error('   Refer to .env.example for the complete list of required variables.\n');
    process.exit(1);
  }
  
  console.log('✓ All required environment variables are set');
}

/**
 * Validates environment-specific configuration
 */
export function validateEnvironmentConfig() {
  const nodeEnv = env.NODE_ENV;
  
  if (!['development', 'production', 'staging'].includes(nodeEnv)) {
    console.warn(`⚠️  Warning: NODE_ENV is set to "${nodeEnv}". Expected: development, production, or staging`);
  }
  
  // Validate CORS origins format
  const corsOrigins = env.WHITE_LIST_CLIENT_URI;
  if (corsOrigins && !corsOrigins.includes('http')) {
    console.warn('⚠️  Warning: WHITE_LIST_CLIENT_URI may not be properly formatted. Expected comma-separated URLs.');
  }
  
  console.log(`✓ Running in ${nodeEnv} mode`);
}
