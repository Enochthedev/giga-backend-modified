# Messaging Service

A comprehensive communication and support system service that provides real-time messaging, helpdesk ticketing, FAQ management, and notification preferences.

## Features

### 🔄 Real-time Messaging
- Direct conversations between users
- Group conversations
- Support conversations linked to tickets
- Real-time message delivery via WebSocket
- Message read receipts and typing indicators
- Message editing and deletion
- File attachments support
- Message search functionality

### 🎫 Helpdesk & Ticketing System
- Support ticket creation and management
- Ticket assignment to support agents
- Priority and category management
- Ticket status tracking
- Comment system with file attachments
- Ticket search and filtering
- Analytics and reporting

### ❓ FAQ Management
- FAQ creation and categorization
- Full-text search capabilities
- FAQ rating system (helpful/not helpful)
- Popular FAQs tracking
- Admin management interface
- Multi-category organization

### 🔔 Notification Preferences
- Granular notification controls
- Email, SMS, and push notification settings
- Marketing communication opt-out
- GDPR-compliant data management
- Unsubscribe token system
- Bulk preference management

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Real-time**: Socket.IO
- **Database**: PostgreSQL with Redis caching
- **Authentication**: JWT tokens
- **Validation**: Express Validator
- **Testing**: Jest
- **Documentation**: OpenAPI/Swagger

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+

### Setup

1. **Clone and install dependencies**
```bash
cd services/messaging-service
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
# Create database
createdb messaging_db

# Run migrations
npm run migrate
```

4. **Start Development Server**
```bash
npm run dev
```

## Environment Variables

```bash
# Server Configuration
PORT=3007
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/messaging_db
DATABASE_POOL_SIZE=10

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@yourapp.com

# Socket.IO Configuration
SOCKET_CORS_ORIGIN=http://localhost:3000
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## API Endpoints

### Messaging
- `POST /api/messaging/conversations` - Create conversation
- `GET /api/messaging/conversations` - Get user conversations
- `GET /api/messaging/conversations/:id` - Get conversation details
- `POST /api/messaging/messages` - Send message
- `GET /api/messaging/conversations/:id/messages` - Get messages
- `PUT /api/messaging/messages/:id` - Edit message
- `DELETE /api/messaging/messages/:id` - Delete message
- `POST /api/messaging/conversations/:id/read` - Mark as read
- `GET /api/messaging/search` - Search messages
- `GET /api/messaging/unread-count` - Get unread count

### Tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets` - Get tickets (admin/support)
- `GET /api/tickets/my-tickets` - Get user tickets
- `GET /api/tickets/:id` - Get ticket details
- `PUT /api/tickets/:id/status` - Update status
- `PUT /api/tickets/:id/assign` - Assign ticket
- `POST /api/tickets/:id/comments` - Add comment
- `GET /api/tickets/search` - Search tickets
- `GET /api/tickets/stats` - Get statistics

### FAQs
- `GET /api/faqs` - Get FAQs
- `GET /api/faqs/:id` - Get FAQ details
- `POST /api/faqs` - Create FAQ (admin/support)
- `PUT /api/faqs/:id` - Update FAQ
- `DELETE /api/faqs/:id` - Delete FAQ
- `GET /api/faqs/search` - Search FAQs
- `GET /api/faqs/popular` - Get popular FAQs
- `POST /api/faqs/:id/rate` - Rate FAQ
- `GET /api/faqs/categories` - Get categories

### Notification Preferences
- `GET /api/notifications` - Get preferences
- `PUT /api/notifications` - Update preferences
- `POST /api/notifications/opt-out/marketing` - Opt out marketing
- `POST /api/notifications/opt-out/all-non-essential` - Opt out non-essential
- `GET /api/notifications/unsubscribe/:token` - Unsubscribe via token
- `GET /api/notifications/export` - Export preferences (GDPR)
- `DELETE /api/notifications` - Delete preferences (GDPR)

## WebSocket Events

### Client to Server
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `message_read` - Mark message as read
- `update_presence` - Update user presence

### Server to Client
- `new_message` - New message received
- `message_updated` - Message was edited
- `message_read_receipt` - Message read by user
- `typing_indicator` - User typing status
- `user_joined` - User joined conversation
- `user_left` - User left conversation
- `presence_update` - User presence changed
- `notification` - System notification

## Database Schema

### Core Tables
- `users` - User information and online status
- `conversations` - Conversation metadata
- `conversation_participants` - User-conversation relationships
- `messages` - Message content and metadata
- `message_attachments` - File attachments
- `message_read_receipts` - Read status tracking

### Support System
- `tickets` - Support tickets
- `ticket_attachments` - Ticket file attachments
- `faqs` - FAQ content
- `faq_categories` - FAQ organization

### Preferences
- `notification_preferences` - User notification settings

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- messaging-service.test.ts
```

## Docker Deployment

```bash
# Build image
docker build -t messaging-service .

# Run container
docker run -d \
  --name messaging-service \
  -p 3007:3007 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  messaging-service
```

## Development

### Code Structure
```
src/
├── controllers/     # Request handlers
├── services/        # Business logic
├── middleware/      # Express middleware
├── routes/          # API route definitions
├── database/        # Database connection and migrations
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
└── tests/           # Test files
```

### Adding New Features

1. **Define Types**: Add interfaces in `src/types/`
2. **Create Service**: Implement business logic in `src/services/`
3. **Add Controller**: Create request handlers in `src/controllers/`
4. **Define Routes**: Add endpoints in `src/routes/`
5. **Add Validation**: Create validators in `src/middleware/`
6. **Write Tests**: Add test coverage in `src/tests/`

### Code Quality

- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier for consistent code style
- **Type Safety**: Strict TypeScript configuration
- **Testing**: Jest with comprehensive test coverage
- **Documentation**: JSDoc comments for all public methods

## Security Features

- **Authentication**: JWT token validation
- **Authorization**: Role-based access control
- **Rate Limiting**: Request throttling
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization
- **CORS Configuration**: Secure cross-origin requests

## Performance Optimizations

- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient database connections
- **Redis Caching**: Fast data access
- **Compression**: Response compression
- **Pagination**: Large dataset handling
- **Full-text Search**: PostgreSQL search capabilities

## Monitoring & Logging

- **Structured Logging**: Winston logger with JSON format
- **Health Checks**: Service health monitoring
- **Error Tracking**: Comprehensive error handling
- **Performance Metrics**: Request timing and statistics
- **Socket Monitoring**: Real-time connection tracking

## Contributing

1. Follow the coding standards defined in `.kiro/steering/coding-standards.md`
2. Write comprehensive tests for new features
3. Update documentation for API changes
4. Use conventional commit messages
5. Ensure all tests pass before submitting

## License

This project is licensed under the MIT License.