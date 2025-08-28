# Comprehensive Testing Suite

This directory contains the comprehensive testing suite for the Giga multi-service platform. The test suite follows the testing pyramid approach with unit tests, integration tests, contract tests, end-to-end tests, and performance tests.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── authentication/      # Auth service unit tests
│   ├── payment/             # Payment service unit tests
│   ├── ecommerce/           # Ecommerce service unit tests
│   └── ...
├── integration/             # Integration tests for API endpoints
│   ├── authentication/      # Auth API integration tests
│   ├── api-gateway/         # Gateway integration tests
│   └── ...
├── contract/                # Contract tests using Pact
│   ├── payment-auth.contract.test.ts
│   └── ecommerce-payment.contract.test.ts
├── e2e/                     # End-to-end tests for user journeys
│   ├── user-registration-login.e2e.test.ts
│   └── ecommerce-purchase-flow.e2e.test.ts
├── performance/             # Performance and load tests
│   ├── load-test.js         # k6 load test
│   └── stress-test.js       # k6 stress test
├── utils/                   # Test utilities and helpers
│   └── test-helpers.ts
├── setup.ts                 # Global test setup
├── jest.config.js           # Jest configuration
└── run-tests.sh             # Comprehensive test runner
```

## Test Types

### 1. Unit Tests (70% of test suite)

Unit tests focus on testing individual functions, classes, and components in isolation.

**Coverage:**
- Service layer business logic
- Data validation and transformation
- Utility functions
- Error handling
- Domain models

**Example:**
```bash
npm run test:unit
```

### 2. Integration Tests (20% of test suite)

Integration tests verify that different components work together correctly.

**Coverage:**
- API endpoint testing
- Database integration
- External service integration
- Message queue integration
- Service-to-service communication

**Example:**
```bash
npm run test:integration
```

### 3. Contract Tests (5% of test suite)

Contract tests ensure that service interfaces remain compatible using Pact.

**Coverage:**
- Service-to-service API contracts
- Message format validation
- API versioning compatibility

**Example:**
```bash
npm run test:contract
```

### 4. End-to-End Tests (5% of test suite)

E2E tests validate complete user journeys across multiple services.

**Coverage:**
- User registration and login flow
- Complete purchase journey
- Booking workflows
- Payment processing
- Cross-service functionality

**Example:**
```bash
npm run test:e2e
```

### 5. Performance Tests

Performance tests validate system behavior under load.

**Coverage:**
- Load testing with k6
- Stress testing
- Response time validation
- Throughput testing
- Resource utilization

**Example:**
```bash
npm run test:performance
npm run test:stress
```

## Running Tests

### Prerequisites

1. **Node.js** (v18+)
2. **Docker** (for integration tests)
3. **PostgreSQL** (test database)
4. **Redis** (test cache)
5. **k6** (for performance tests)

### Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm run test:comprehensive

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:contract
npm run test:e2e
npm run test:performance
```

### Test Environment Setup

1. Copy the test environment file:
```bash
cp .env.example .env.test
```

2. Update test database configuration in `.env.test`

3. Start test infrastructure:
```bash
docker-compose -f docker-compose.test.yml up -d
```

### Individual Service Tests

Each service also has its own test suite:

```bash
# Authentication service tests
cd services/authentication-service
npm test

# Payment service tests
cd services/payment-service
npm test

# Ecommerce service tests
cd services/ecommerce-service
npm test
```

## Test Configuration

### Jest Configuration

The test suite uses Jest with TypeScript support. Configuration is in `jest.config.js`.

Key features:
- TypeScript support with ts-jest
- Custom test sequencer for optimal test order
- Coverage reporting with multiple formats
- Module path mapping for imports
- Global setup and teardown

### Test Database

Tests use a separate test database to avoid conflicts with development data.

**Setup:**
```sql
CREATE DATABASE test_db;
CREATE USER test_user WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE test_db TO test_user;
```

### Test Data Management

- Test data is created and cleaned up automatically
- Each test suite has isolated test data
- Database transactions are used for test isolation
- Redis keys are prefixed with `test:` for easy cleanup

## Writing Tests

### Unit Test Example

```typescript
import { AuthService } from '../../../services/authentication-service/src/services/auth-service';
import { createTestContext } from '../../utils/test-helpers';

describe('AuthService', () => {
  let context: TestContext;
  let authService: AuthService;

  beforeAll(async () => {
    context = await createTestContext();
    authService = new AuthService(context.db);
  });

  afterAll(async () => {
    await context.cleanup();
  });

  it('should register a new user', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
    };

    const result = await authService.register(userData);

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('token');
    expect(result.user.email).toBe(userData.email);
  });
});
```

### Integration Test Example

```typescript
import request from 'supertest';
import { createTestContext } from '../../utils/test-helpers';

describe('Authentication API', () => {
  let context: TestContext;
  let app: Express;

  beforeAll(async () => {
    context = await createTestContext();
    app = await createAuthApp(context.db);
  });

  it('should register a new user', async () => {
    const userData = {
      email: 'integration@example.com',
      password: 'SecurePassword123!',
    };

    const response = await request(app)
      .post('/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('token');
  });
});
```

### Contract Test Example

```typescript
import { Pact } from '@pact-foundation/pact';
import { like } from '@pact-foundation/pact/dsl/matchers';

describe('Payment-Auth Contract', () => {
  let provider: Pact;

  beforeAll(() => {
    provider = new Pact({
      consumer: 'PaymentService',
      provider: 'AuthenticationService',
      port: 1234,
    });
    return provider.setup();
  });

  it('should validate user token', async () => {
    await provider.addInteraction({
      state: 'user exists with valid token',
      uponReceiving: 'a request to validate user token',
      withRequest: {
        method: 'GET',
        path: '/auth/validate',
        headers: {
          'Authorization': like('Bearer valid-jwt-token'),
        },
      },
      willRespondWith: {
        status: 200,
        body: {
          success: true,
          user: {
            id: like('user-123'),
            email: like('user@example.com'),
          },
        },
      },
    });

    // Test implementation...
  });
});
```

## Test Utilities

### Test Helpers

The `test-helpers.ts` file provides utilities for:
- Creating test database connections
- Generating test users and data
- JWT token generation
- Mock request/response objects
- Test data cleanup

### Test Context

The `TestContext` interface provides:
- Database connection
- Redis connection
- Cleanup function
- Test isolation

## Coverage Requirements

- **Overall Coverage:** 80% minimum
- **Unit Tests:** 90% minimum
- **Integration Tests:** 70% minimum
- **Critical Paths:** 95% minimum

Coverage reports are generated in `coverage/` directory with:
- HTML report: `coverage/lcov-report/index.html`
- JSON report: `coverage/coverage-final.json`
- LCOV report: `coverage/lcov.info`

## Continuous Integration

### GitHub Actions

The test suite integrates with CI/CD pipelines:

```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
```

### Test Parallelization

Tests are configured to run in parallel for faster execution:
- Jest runs tests in parallel by default
- Test sequencer optimizes test order
- Database connections are pooled
- Test isolation prevents conflicts

## Performance Benchmarks

### Load Test Thresholds

- **Response Time:** 95% of requests < 500ms
- **Error Rate:** < 1%
- **Throughput:** > 100 requests/second
- **Concurrent Users:** 50 users sustained

### Stress Test Thresholds

- **Breaking Point:** > 400 concurrent users
- **Error Rate:** < 20% under extreme load
- **Recovery Time:** < 30 seconds after load reduction

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure test database is running
   - Check connection string in `.env.test`
   - Verify user permissions

2. **Redis Connection Errors**
   - Start Redis server
   - Check Redis URL configuration
   - Verify Redis is accessible

3. **Test Timeouts**
   - Increase Jest timeout in configuration
   - Check for hanging promises
   - Verify test cleanup

4. **Port Conflicts**
   - Ensure test ports are available
   - Check for running services
   - Update port configuration

### Debug Mode

Run tests in debug mode:

```bash
# Debug specific test
npm run test -- --testNamePattern="should register user" --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test file
npm run test -- tests/unit/authentication/auth-service.test.ts
```

## Contributing

### Adding New Tests

1. Follow the existing test structure
2. Use appropriate test type (unit/integration/e2e)
3. Include proper setup and cleanup
4. Add meaningful assertions
5. Update documentation

### Test Naming Conventions

- Test files: `*.test.ts` or `*.spec.ts`
- Test descriptions: Use "should" statements
- Test groups: Use `describe` blocks for organization
- Test data: Prefix with `test-` for easy identification

### Code Coverage

- Aim for high coverage but focus on quality
- Test edge cases and error conditions
- Mock external dependencies appropriately
- Use integration tests for complex workflows

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Pact Documentation](https://docs.pact.io/)
- [k6 Documentation](https://k6.io/docs/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)