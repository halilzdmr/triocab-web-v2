/**
 * Script to update Salesforce authentication settings
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create interface for reading user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to .env file
const envPath = path.join(__dirname, '.env');

// Prompt for Salesforce password and security token
console.log('📝 Please enter your Salesforce credentials for username-password authentication:');

// Read current .env content
fs.readFile(envPath, 'utf8', (err, data) => {
  if (err) {
    console.error('❌ Error reading .env file:', err);
    process.exit(1);
  }
  
  rl.question('Salesforce password: ', (password) => {
    rl.question('Salesforce security token: ', (securityToken) => {
      // Update .env content with new credentials
      let updatedContent = data;
      
      // Check if variables already exist
      if (updatedContent.includes('SF_PASSWORD=')) {
        updatedContent = updatedContent.replace(/SF_PASSWORD=.*\n/, `SF_PASSWORD=${password}\n`);
      } else {
        updatedContent += `\n# Salesforce Password (for username-password auth)\nSF_PASSWORD=${password}\n`;
      }
      
      if (updatedContent.includes('SF_SECURITY_TOKEN=')) {
        updatedContent = updatedContent.replace(/SF_SECURITY_TOKEN=.*\n/, `SF_SECURITY_TOKEN=${securityToken}\n`);
      } else {
        updatedContent += `\n# Salesforce Security Token (for username-password auth)\nSF_SECURITY_TOKEN=${securityToken}\n`;
      }
      
      // Write updated content back to .env
      fs.writeFile(envPath, updatedContent, 'utf8', (err) => {
        if (err) {
          console.error('❌ Error writing .env file:', err);
          process.exit(1);
        }
        
        console.log('✅ Salesforce credentials updated successfully');
        console.log('🔄 Please restart your server with: npm run dev');
        rl.close();
      });
    });
  });
});
