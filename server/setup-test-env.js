/**
 * Setup Test Environment Script
 * This script helps set up the local testing environment
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */

const fs = require('fs');
const path = require('path');

// Path to .env file
const envPath = path.join(__dirname, '.env');

// Create .env file with test settings
const envContent = `# Server Configuration
NODE_ENV=development
PORT=5000

# JWT Configuration
JWT_SECRET=test_secret_key_for_local_development

# Authentication options
# Email verification bypass enabled for local testing
BYPASS_EMAIL_VERIFICATION=true

# Salesforce Configuration
SF_LOGIN_URL=https://login.salesforce.com
SF_CLIENT_ID=your_connected_app_client_id
SF_USERNAME=your_salesforce_username
# For testing we'll use a mock private key
SF_PRIVATE_KEY=test_private_key_for_local_development_only
`;

try {
  // Write the .env file
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Test environment setup complete!');
  console.log('📝 A .env file has been created with email verification bypassed');
  console.log('🚀 You can now run the server with: npm run dev');
  console.log('\n⚠️  Important: Update the Salesforce credentials in the .env file with your actual credentials');
} catch (error) {
  console.error('❌ Error creating .env file:', error);
}
