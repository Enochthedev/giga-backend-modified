# Installation Guide

## Available Installation Commands

### Quick Setup
```bash
# Complete setup with environment file
pnpm run bootstrap
```

### Installation Commands
```bash
# Install all dependencies (root + all workspaces)
pnpm run install:all

# Install only root dependencies
pnpm run install:root

# Install only workspace dependencies
pnpm run install:workspaces

# Fresh installation (clean + install all)
pnpm run install:fresh
```

### Development Commands
```bash
# Build all packages
pnpm run build

# Build common package first
pnpm run build:common

# Build all services
pnpm run build:services

# Start all services in development mode
pnpm run dev

# Start specific services
pnpm run dev:gateway
pnpm run dev:auth
pnpm run dev:payment
# ... etc
```

### Testing Commands
```bash
# Run all tests
pnpm run test

# Run unit tests
pnpm run test:unit

# Run integration tests
pnpm run test:integration

# Run with coverage
pnpm run test:coverage
```

### Utility Commands
```bash
# Lint all code
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Clean all dependencies
pnpm run clean

# Validate everything
pnpm run validate:all
```

## Workspace Configuration

The project uses pnpm workspaces with the following structure:

```yaml
packages:
  - 'packages/*'          # Shared packages
  - 'services/*'          # Modern services
  - 'ecommerce-backend'    # Legacy services
  - 'hotel-service'
  - 'advertisement-service'
  - 'giga_taxi_main'
  - 'giga_taxi_driver'
  - 'tests'               # Test suites
```

## First Time Setup

1. **Install dependencies:**
   ```bash
   pnpm run install:all
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build common packages:**
   ```bash
   pnpm run build:common
   ```

4. **Start development:**
   ```bash
   pnpm run dev
   ```

## Troubleshooting

### Peer Dependency Warnings
The warnings about OpenTelemetry peer dependencies are normal and don't affect functionality. They occur because of version mismatches in the telemetry stack.

### Clean Installation
If you encounter issues, try a fresh installation:
```bash
pnpm run install:fresh
```

### Individual Service Issues
To work on a specific service:
```bash
cd services/[service-name]
pnpm install
pnpm run dev
```