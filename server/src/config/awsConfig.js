/**
 * AWS Configuration
 * Sets up AWS clients for DynamoDB and SES
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { SESClient } = require('@aws-sdk/client-ses');

// Debug log for AWS configuration initialization
console.log(`[${new Date().toISOString()}] Initializing AWS clients`);

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: process.env.NODE_ENV === 'local' 
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      } 
    : undefined // Use EC2 instance role credentials when deployed to AWS
});

// Initialize DynamoDB Document client for easier interactions
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);

// Initialize SES client in eu-central-1 region as specified in requirements
const sesClient = new SESClient({
  region: 'eu-central-1', // Hard-coded as per requirements
  credentials: process.env.NODE_ENV === 'local' 
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      } 
    : undefined // Use EC2 instance role credentials when deployed to AWS
});

console.log(`[${new Date().toISOString()}] AWS clients initialized successfully`);

module.exports = {
  dynamoClient,
  dynamoDocClient,
  sesClient
};
