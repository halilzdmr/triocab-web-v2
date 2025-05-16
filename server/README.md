# BLT Partner Portal Server

Backend server for Bodrum Luxury Travel Partner Portal that connects to Salesforce to show transfer booking information to local transfer companies.

## Features

- JWT authentication with email verification via OTP codes
- Integration with Salesforce API using direct SOQL queries
- AWS DynamoDB for OTP storage
- AWS SES for sending verification emails
- Rate limiting, CORS, and security headers

## API Endpoints

### Authentication

- `POST /auth/request-code`: Request a verification code
  - Body: `{ "email": "partner@example.com" }`
  - Response: 200 OK with message on success

- `POST /auth/verify-code`: Verify code and get JWT token
  - Body: `{ "email": "partner@example.com", "code": "123456" }`
  - Response: 200 OK with JWT token on success

### Protected Routes

- `GET /transfers`: Get all transfers for the authenticated partner
  - Header: `Authorization: Bearer <jwt_token>`
  - Query Parameters (optional):
    - `status`: Filter by Journey_Status__c (e.g., "Planned", "Completed")
    - `start_date`: Filter transfers after this date (ISO format)
    - `end_date`: Filter transfers before this date (ISO format)
  - Response: JSON list of reservation records from Salesforce

## Salesforce Data Structure

The API returns reservation data with the following fields:

- `Pickup_Address__c`: Full pickup address
- `Pickup_Resolved_Region__c`: Pickup location name
- `Dropoff_Address__c`: Full dropoff address
- `Dropoff_Resolved_Region__c`: Dropoff location name
- `Pickup_Date_Time__c`: Scheduled pickup time (ISO format)
- `Additional_Comments__c`: Notes from the customer
- `Passenger_Count__c`: Number of passengers
- `Passenger_Name__c`: Customer name
- `Passenger_Telephone_Number__c`: Customer phone number
- `Journey_Status__c`: Status of the reservation (Planned, Driver Underway, etc.)
- `Vehicle_Type__c`: Type of vehicle required
- `Add_Ons__c`: Additional services requested
- `Supplier_Net_Price__c`: Price for the transfer

## Setup and Installation

### Local Development

1. Install dependencies:
```bash
cd server
npm install
```

2. Set up test environment (with bypassed email verification):
```bash
node setup-test-env.js
```
This will create a `.env` file with email verification bypassed for easier local testing.

3. Update the `.env` file with your Salesforce credentials

4. Start development server:
```bash
npm run dev
```

### Authentication in Test Mode

When `BYPASS_EMAIL_VERIFICATION=true` is set in your `.env` file:

1. The `/auth/request-code` endpoint will still work normally but you don't need to use it
2. The `/auth/verify-code` endpoint will accept any email without requiring a code
3. Simply send a POST request to `/auth/verify-code` with just the email:
```json
{
  "email": "test@example.com"
}
```
4. You'll receive a JWT token that can be used for authenticated requests

### AWS EC2 Deployment

1. Clone the repository on your EC2 instance
2. Set up environment variables
3. Create an IAM role with appropriate permissions for DynamoDB and SES
4. Attach the IAM role to your EC2 instance
5. Start the server with PM2 or similar process manager:
```bash
npm install -g pm2
pm2 start src/index.js --name "blt-partner-portal"
```

## AWS Resources Required

- DynamoDB Table: "OtpCodes" with schema:
  - Partition key: `email` (String)
  - Attributes: `code` (String), `expiresAt` (String)
- IAM Role with:
  - DynamoDB permissions for "OtpCodes" table
  - SES sending permissions
- SES verified sending domain/email

## Salesforce Configuration

- Connected App with JWT OAuth enabled
- Custom objects:
  - Transfer__c: For storing transfer records
  - Account: With Operation_Email__c field to link to transfer companies
