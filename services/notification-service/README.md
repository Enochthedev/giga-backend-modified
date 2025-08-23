# Notification Service

A comprehensive multi-channel notification service supporting email, SMS, and push notifications with template management and user preferences.

## Features

- **Multi-channel Support**: Email (SendGrid), SMS (Twilio), Push (Firebase)
- **Template Management**: Reusable notification templates with variable substitution
- **User Preferences**: Granular notification preferences per user
- **Delivery Tracking**: Complete audit trail of notification delivery
- **Retry Logic**: Automatic retry for failed notifications
- **Bulk Operations**: Send multiple notifications efficiently
- **Scheduling**: Schedule notifications for future delivery

## API Endpoints

### Notifications

- `POST /api/notifications/send` - Send single notification
- `POST /api/notifications/send-bulk` - Send bulk notifications
- `GET /api/notifications/history/:userId` - Get user notification history
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `POST /api/notifications/:id/retry` - Retry failed notification

### User Preferences

- `GET /api/notifications/preferences/:userId` - Get user preferences
- `PUT /api/notifications/preferences/:userId` - Update user preferences

### Templates

- `GET /api/notifications/templates/:name` - Get notification template

## Environment Variables

```bash
# Server Configuration
PORT=3006
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notification_db
DB_USER=postgres
DB_PASSWORD=password

# SendGrid Configuration (Email)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@giga.com

# Twilio Configuration (SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_FROM_NUMBER=+1234567890

# Firebase Configuration (Push Notifications)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project"}
```

## Usage Examples

### Send Email Notification

```bash
curl -X POST http://localhost:3006/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "type": "email",
    "recipient": "user@example.com",
    "subject": "Welcome!",
    "content": "Welcome to our platform!"
  }'
```

### Send SMS Notification

```bash
curl -X POST http://localhost:3006/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "type": "sms",
    "recipient": "+1234567890",
    "content": "Your verification code is: 123456"
  }'
```

### Send Push Notification

```bash
curl -X POST http://localhost:3006/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "type": "push",
    "recipient": "firebase_device_token",
    "subject": "New Message",
    "content": "You have a new message!"
  }'
```

### Use Template

```bash
curl -X POST http://localhost:3006/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "type": "email",
    "recipient": "user@example.com",
    "templateName": "welcome_email",
    "templateVariables": {
      "user_name": "John Doe",
      "platform_name": "Giga"
    }
  }'
```

## Database Schema

### Notifications Table
- Stores all notification records with delivery status
- Tracks retry attempts and error messages
- Supports scheduling for future delivery

### Notification Templates Table
- Reusable templates with variable placeholders
- Support for different notification types
- Template versioning and activation status

### Notification Preferences Table
- User-specific notification preferences
- Granular control over notification types
- Marketing and security alert preferences

### Delivery Logs Table
- Complete audit trail of delivery attempts
- Provider-specific response data
- Error tracking and debugging information

## Development

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Building

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Docker

```bash
# Build image
docker build -t notification-service .

# Run container
docker run -p 3006:3006 --env-file .env notification-service
```

## Integration with Other Services

The notification service integrates with other platform services through:

1. **Message Queue Events**: Listens for events like OrderCreated, RideBooked, etc.
2. **Direct API Calls**: Other services can call notification endpoints directly
3. **Webhook Integration**: Receives delivery status updates from providers

## Monitoring and Logging

- Health check endpoint: `GET /health`
- Comprehensive request/response logging
- Error tracking and alerting
- Performance metrics and monitoring

## Security

- Input validation and sanitization
- Rate limiting protection
- Secure credential management
- PII data protection
- Audit logging for compliance