# Coding Standards and Guidelines

This document establishes coding standards and best practices for the multi-service platform to ensure consistency, maintainability, and quality across all services.

## Table of Contents

1. [General Principles](#general-principles)
2. [TypeScript Standards](#typescript-standards)
3. [API Design Guidelines](#api-design-guidelines)
4. [Database Guidelines](#database-guidelines)
5. [Testing Standards](#testing-standards)
6. [Documentation Requirements](#documentation-requirements)
7. [Security Guidelines](#security-guidelines)
8. [Performance Guidelines](#performance-guidelines)
9. [Error Handling](#error-handling)
10. [Logging Standards](#logging-standards)

## General Principles

### Code Quality Principles

#### 1. Readability First
Code should be written for humans to read, not just for computers to execute.

```typescript
// ✅ Good: Clear and readable
function calculateOrderTotal(items: OrderItem[], taxRate: number): number {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * taxRate;
  return subtotal + tax;
}

// ❌ Bad: Unclear and cryptic
function calc(i: any[], t: number): number {
  return i.reduce((s, x) => s + (x.p * x.q), 0) * (1 + t);
}
```

#### 2. Consistency
Follow established patterns and conventions throughout the codebase.

#### 3. Single Responsibility Principle
Each function, class, and module should have a single, well-defined responsibility.

#### 4. DRY (Don't Repeat Yourself)
Avoid code duplication by extracting common functionality.

## TypeScript Standards

### Type Definitions

#### Interface vs Type Aliases
Use interfaces for object shapes that might be extended, type aliases for unions and computed types.

```typescript
// ✅ Good: Interface for extensible object shapes
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

interface AdminUser extends User {
  role: AdminRole;
  permissions: Permission[];
}

// ✅ Good: Type aliases for unions and computed types
type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
type UserKeys = keyof User;
type CreateUserRequest = Omit<User, 'id' | 'createdAt'>;
```

#### Strict Type Checking
Always use strict TypeScript configuration and avoid `any` types.

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Naming Conventions

#### Variables and Functions
Use camelCase for variables and functions.

```typescript
// ✅ Good
const userName = 'john_doe';
const isEmailVerified = true;
const calculateTotalPrice = (items: Item[]) => { };

// ❌ Bad
const user_name = 'john_doe';
const IsEmailVerified = true;
const calculate_total_price = (items: Item[]) => { };
```

#### Classes and Interfaces
Use PascalCase for classes and interfaces.

#### Constants
Use SCREAMING_SNAKE_CASE for constants.

```typescript
// ✅ Good
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 20;
const API_BASE_URL = 'https://api.example.com';
```

#### Files and Directories
Use kebab-case for files and directories.

```
✅ Good
user-service.ts
payment-controller.ts
order-status.enum.ts
auth-middleware/

❌ Bad
UserService.ts
paymentController.ts
OrderStatus.enum.ts
authMiddleware/
```

## API Design Guidelines

### RESTful Design

#### Resource Naming
Use nouns for resources and follow REST conventions.

```typescript
// ✅ Good: RESTful endpoints
GET    /users              // List users
GET    /users/:id          // Get specific user
POST   /users              // Create user
PUT    /users/:id          // Update user (full)
PATCH  /users/:id          // Update user (partial)
DELETE /users/:id          // Delete user

// Nested resources
GET    /users/:id/orders   // Get user's orders
POST   /users/:id/orders   // Create order for user

// ❌ Bad: Non-RESTful endpoints
GET    /getUserList
POST   /createUser
PUT    /updateUserById/:id
DELETE /removeUser/:id
```

#### HTTP Status Codes
Use appropriate HTTP status codes.

```typescript
// ✅ Good: Proper status codes
app.post('/users', async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(ApiResponse.success(user)); // 201 Created
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json(ApiResponse.error('VALIDATION_ERROR', error.message)); // 400 Bad Request
    } else if (error instanceof ConflictError) {
      res.status(409).json(ApiResponse.error('CONFLICT', error.message)); // 409 Conflict
    } else {
      res.status(500).json(ApiResponse.error('INTERNAL_ERROR', 'Internal server error')); // 500 Internal Server Error
    }
  }
});
```

#### Request/Response Format
Use consistent request and response formats.

```typescript
// Response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    pagination?: PaginationInfo;
    traceId?: string;
  };
}
```

## Database Guidelines

### Schema Design

#### Table Design
Follow database design best practices.

```sql
-- ✅ Good: Proper table design
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[\d\s-()]+$')
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
```

### Query Optimization

#### Efficient Queries
Write efficient database queries.

```typescript
// ✅ Good: Efficient queries
class UserRepository {
  // Use indexes effectively
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  // Use pagination for large datasets
  async getUsers(page: number, limit: number): Promise<PaginatedResult<User>> {
    const offset = (page - 1) * limit;
    
    const [dataResult, countResult] = await Promise.all([
      this.db.query(
        'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      ),
      this.db.query('SELECT COUNT(*) FROM users')
    ]);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }
}
```

## Testing Standards

### Test Organization

#### Test Structure
Organize tests in a clear, consistent structure.

```
service-name/
├── src/
│   ├── controllers/
│   │   ├── user.controller.ts
│   │   └── __tests__/
│   │       └── user.controller.test.ts
│   ├── services/
│   │   ├── user.service.ts
│   │   └── __tests__/
│   │       └── user.service.test.ts
│   └── __tests__/
│       ├── integration/
│       │   └── user.api.test.ts
│       ├── fixtures/
│       │   └── user.fixtures.ts
│       └── setup.ts
```

#### Test Naming
Use descriptive test names that explain the scenario.

```typescript
// ✅ Good: Descriptive test names
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user successfully with valid data', async () => {});
    it('should throw ValidationError when email is invalid', async () => {});
    it('should throw ConflictError when user already exists', async () => {});
    it('should hash password before storing', async () => {});
  });
});

// ❌ Bad: Unclear test names
describe('UserService', () => {
  it('test1', () => {});
  it('test2', () => {});
  it('should work', () => {});
});
```

### Unit Testing

#### Test Structure (AAA Pattern)
Use Arrange-Act-Assert pattern for clear test structure.

```typescript
// ✅ Good: AAA pattern
describe('OrderService', () => {
  let orderService: OrderService;
  let mockOrderRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    mockOrderRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    } as any;

    orderService = new OrderService(mockOrderRepository);
  });

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      // Arrange
      const orderData = {
        userId: 'user_123',
        items: [{ productId: 'prod_1', quantity: 2, price: 10 }],
        total: 20
      };
      const expectedOrder = { id: 'order_123', ...orderData, status: 'pending' };
      mockOrderRepository.create.mockResolvedValue(expectedOrder);

      // Act
      const result = await orderService.createOrder(orderData);

      // Assert
      expect(result).toEqual(expectedOrder);
      expect(mockOrderRepository.create).toHaveBeenCalledWith(orderData);
    });
  });
});
```

## Documentation Requirements

### Code Documentation

#### Function Documentation
Document all public functions and complex logic.

```typescript
/**
 * Creates a new user account with email verification
 * 
 * @param userData - User registration data
 * @param userData.email - User's email address (must be unique)
 * @param userData.password - User's password (min 8 chars)
 * @param userData.firstName - User's first name
 * @param userData.lastName - User's last name
 * 
 * @returns Promise resolving to the created user (without password)
 * 
 * @throws {ValidationError} When input data is invalid
 * @throws {ConflictError} When user with email already exists
 * 
 * @example
 * ```typescript
 * const user = await userService.createUser({
 *   email: 'john@example.com',
 *   password: 'SecurePass123!',
 *   firstName: 'John',
 *   lastName: 'Doe'
 * });
 * ```
 */
async createUser(userData: CreateUserRequest): Promise<User> {
  // Implementation
}
```

## Security Guidelines

### Input Validation and Sanitization

#### Always Validate Input
Never trust user input - validate everything.

```typescript
// ✅ Good: Comprehensive validation
import Joi from 'joi';
import DOMPurify from 'isomorphic-dompurify';

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required()
});

function validateAndSanitizeUser(userData: any): CreateUserRequest {
  // Validate
  const { error, value } = userSchema.validate(userData);
  if (error) {
    throw new ValidationError(error.message);
  }
  
  // Sanitize
  return {
    email: value.email.toLowerCase().trim(),
    password: value.password, // Don't sanitize passwords
    firstName: DOMPurify.sanitize(value.firstName.trim()),
    lastName: DOMPurify.sanitize(value.lastName.trim())
  };
}
```

#### SQL Injection Prevention
Always use parameterized queries.

```typescript
// ✅ Good: Parameterized queries
async findUserByEmail(email: string): Promise<User | null> {
  const result = await this.db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

// ❌ Bad: String concatenation (vulnerable to SQL injection)
async findUserByEmail(email: string): Promise<User | null> {
  const result = await this.db.query(
    `SELECT * FROM users WHERE email = '${email}'`
  );
  return result.rows[0] || null;
}
```

## Error Handling

### Error Types and Hierarchy

#### Custom Error Classes
Define specific error types for different scenarios.

```typescript
// Base error class
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  readonly isOperational = true;

  constructor(message: string, public readonly details?: any) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

// Specific error types
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = 'UNAUTHORIZED';
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT';
}
```

## Logging Standards

### Structured Logging

#### Log Format
Use structured logging with consistent format.

```typescript
import winston from 'winston';

// ✅ Good: Structured logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'unknown-service',
    version: process.env.SERVICE_VERSION || '1.0.0'
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Usage
logger.info('User created successfully', {
  userId: user.id,
  email: user.email,
  duration: Date.now() - startTime
});
```

#### Security in Logging
Never log sensitive information.

```typescript
// ✅ Good: Sanitized logging
class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    logger.info('Login attempt', {
      email: this.maskEmail(credentials.email),
      ip: this.getClientIP()
    });
    
    // Implementation
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  }
}

// ❌ Bad: Logging sensitive data
logger.info('User login', {
  email: credentials.email,
  password: credentials.password, // Never log passwords!
});
```

This comprehensive coding standards document serves as a reference for all developers working on the multi-service platform.