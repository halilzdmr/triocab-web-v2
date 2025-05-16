/**
 * Script to fix the Salesforce login URL
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */

const fs = require('fs');
const path = require('path');

// Path to .env file
const envPath = path.join(__dirname, '.env');

// Read current .env content
fs.readFile(envPath, 'utf8', (err, data) => {
  if (err) {
    console.error('❌ Error reading .env file:', err);
    process.exit(1);
  }
  
  // Update Salesforce login URL to the correct format
  let updatedContent = data.replace(
    /SF_LOGIN_URL=https:\/\/triocab\.my\.salesforce\.com\/services\/data\/v62\.0/,
    'SF_LOGIN_URL=https://triocab.my.salesforce.com'
  );
  
  // Write updated content back to .env
  fs.writeFile(envPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('❌ Error writing .env file:', err);
      process.exit(1);
    }
    
    console.log('✅ Salesforce login URL fixed');
    console.log('   Changed from: https://triocab.my.salesforce.com/services/data/v62.0');
    console.log('   Changed to: https://triocab.my.salesforce.com');
    console.log('🔄 Please restart your server with: npm run dev');
  });
});
