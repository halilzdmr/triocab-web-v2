/**
 * Script to change the server port
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */

const fs = require('fs');
const path = require('path');

// Path to .env file
const envPath = path.join(__dirname, '.env');

// Read current .env content
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace the PORT setting
  const updatedContent = envContent.replace(
    /PORT=5000/g,
    'PORT=5001'
  );
  
  // Write updated content back to the file
  fs.writeFileSync(envPath, updatedContent);
  
  console.log('✅ Server port changed from 5000 to 5001');
  console.log('🔄 Please restart your server with: npm run dev');
  console.log('⚠️  Remember to update API_BASE_URL in your frontend to: http://localhost:5001');
} catch (error) {
  console.error('❌ Error updating port:', error);
}
