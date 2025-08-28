# Mobile & Frontend Developer Setup Guide

This guide is specifically for mobile and frontend developers who need to run the backend services for development and testing.

## 🎯 Quick Start (Recommended)

### Option 1: Docker Setup (Easiest)

Perfect for mobile/frontend developers who just need the backend running:

```bash
# 1. Clone the repository
git clone <repository-url>
cd multi-service-platform

# 2. Copy environment file
cp .env.example .env

# 3. Start essential services (minimal resources)
./start-platform.sh essential

# 4. Wait for services to start (about 2-3 minutes)
# Check when ready:
curl http://localhost:3000/health
```

**That's it!** Your backend is running and ready for your mobile/frontend app.

### Option 2: Full Backend (All Features)

If you need search, admin panel, analytics, etc.:

```bash
# Start everything
./start-platform.sh full
```

## 📱 Service URLs for Your App

Once running, your mobile/frontend app can connect to:

| Service | URL | Purpose |
|---------|-----|---------|
| **Main API** | `http://localhost:3000` | Primary endpoint for your app |
| Authentication | `http://localhost:3001` | User login/register |
| E-commerce | `http://localhost:3002` | Products, orders, cart |
| Payment | `http://localhost:3003` | Payment processing |
| Taxi | `http://localhost:3004` | Ride booking |
| Hotel | `http://localhost:3005` | Hotel booking |
| File Upload | `http://localhost:3008` | Image/file uploads |
| Search | `http://localhost:3009` | Search functionality |

### API Documentation

Each service provides interactive API documentation:

- **Main API Docs**: http://localhost:3000/api-docs
- **Authentication**: http://localhost:3001/api-docs
- **E-commerce**: http://localhost:3002/api-docs
- **Payment**: http://localhost:3003/api-docs

## 🔧 Configuration for Your App

### Environment Variables for Your Frontend/Mobile App

```javascript
// React Native / React / Vue / Angular
const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  AUTH_URL: 'http://localhost:3001',
  ECOMMERCE_URL: 'http://localhost:3002',
  PAYMENT_URL: 'http://localhost:3003',
  FILE_UPLOAD_URL: 'http://localhost:3008'
};

// For mobile development (iOS Simulator / Android Emulator)
const API_CONFIG_MOBILE = {
  BASE_URL: 'http://10.0.2.2:3000',  // Android Emulator
  // OR
  BASE_URL: 'http://127.0.0.1:3000', // iOS Simulator
};
```

### CORS Configuration

The backend is configured to allow requests from your frontend:

```javascript
// Your frontend can make requests directly
fetch('http://localhost:3000/api/products')
  .then(response => response.json())
  .then(data => console.log(data));
```

## 🚀 Common Development Scenarios

### Scenario 1: React/Vue/Angular Frontend

```bash
# Terminal 1: Start backend
./start-platform.sh essential

# Terminal 2: Start your frontend
cd your-frontend-project
pnpm start
# Your frontend runs on http://localhost:3001 (or different port)
# Backend APIs available at http://localhost:3000
```

### Scenario 2: React Native Development

```bash
# Terminal 1: Start backend
./start-platform.sh essential

# Terminal 2: Start React Native
cd your-react-native-project
npx react-native start

# Terminal 3: Run on device/emulator
npx react-native run-ios
# OR
npx react-native run-android
```

### Scenario 3: Mobile App Testing

```bash
# Start backend with specific services you need
./start-platform.sh essential  # Core features
# OR
./start-platform.sh search     # If you need search
# OR
./start-platform.sh full       # Everything
```

## 📋 Prerequisites

### Required Software

- **Docker Desktop** (recommended) - [Download here](https://www.docker.com/products/docker-desktop/)
- **Git** - For cloning the repository
- **curl** (optional) - For testing APIs

### System Requirements

- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 5GB free space
- **OS**: Windows 10+, macOS 10.14+, or Linux

### For Docker-less Setup (Advanced)

If you prefer not to use Docker:

- **Node.js** 18+
- **PostgreSQL** 12+
- **Redis** 6+
- **pnpm** (recommended) or npm

## 🛠️ Running Individual Services

### Docker: Start Specific Services

```bash
# Just infrastructure (database, cache)
./start-platform.sh infra

# Add specific services
docker-compose up -d api-gateway authentication-service ecommerce-service
```

### Local: Run One Service at a Time

```bash
# 1. Start infrastructure
./start-platform.sh infra

# 2. Set environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db"
export REDIS_URL="redis://localhost:6379"

# 3. Run specific service locally
cd services/authentication-service
pnpm install
pnpm run dev
```

## 🧪 Testing Your Setup

### 1. Health Check

```bash
# Check if backend is running
curl http://localhost:3000/health

# Should return: {"status":"ok","timestamp":"..."}
```

### 2. Test Authentication

```bash
# Register a test user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Test E-commerce

```bash
# Get products
curl http://localhost:3002/products

# Search products
curl "http://localhost:3002/products/search?q=laptop"
```

## 📱 Mobile-Specific Configuration

### iOS Development

```javascript
// In your iOS app configuration
const API_BASE_URL = 'http://127.0.0.1:3000';
// OR if using physical device
const API_BASE_URL = 'http://YOUR_COMPUTER_IP:3000';
```

### Android Development

```javascript
// In your Android app configuration
const API_BASE_URL = 'http://10.0.2.2:3000'; // For emulator
// OR if using physical device
const API_BASE_URL = 'http://YOUR_COMPUTER_IP:3000';
```

### Finding Your Computer's IP

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr "IPv4"
```

## 🔍 Troubleshooting

### Common Issues

#### 1. "Connection Refused" Error

```bash
# Check if services are running
./start-platform.sh status

# If not running, start them
./start-platform.sh essential
```

#### 2. CORS Errors in Browser

The backend is configured for CORS, but if you have issues:

```javascript
// Make sure you're using the correct URL
const API_URL = 'http://localhost:3000'; // Not https://
```

#### 3. Mobile App Can't Connect

```bash
# For physical devices, use your computer's IP
# Find your IP:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Update your mobile app config:
const API_URL = 'http://192.168.1.100:3000'; // Your actual IP
```

#### 4. Services Won't Start

```bash
# Check Docker is running
docker --version

# Check ports aren't in use
lsof -i :3000

# Clean restart
./start-platform.sh clean
./start-platform.sh essential
```

#### 5. Slow Performance

```bash
# Start only essential services
./start-platform.sh essential

# Instead of full stack
./start-platform.sh full
```

### Getting Help

```bash
# Check service status
./start-platform.sh status

# View logs
./start-platform.sh logs

# Check specific service
docker-compose logs authentication-service
```

## 🎨 Frontend Integration Examples

### React/JavaScript

```javascript
// api.js
const API_BASE = 'http://localhost:3000';

export const authAPI = {
  login: async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },
  
  register: async (userData) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  }
};

export const productsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE}/products`);
    return response.json();
  },
  
  search: async (query) => {
    const response = await fetch(`${API_BASE}/products/search?q=${query}`);
    return response.json();
  }
};
```

### React Native

```javascript
// services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://10.0.2.2:3000'; // Android emulator
// const API_BASE = 'http://127.0.0.1:3000'; // iOS simulator

class ApiService {
  async makeRequest(endpoint, options = {}) {
    const token = await AsyncStorage.getItem('authToken');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    return response.json();
  }

  // Authentication
  async login(email, password) {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Products
  async getProducts() {
    return this.makeRequest('/products');
  }

  // File upload
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.makeRequest('/files/upload', {
      method: 'POST',
      headers: {}, // Let fetch set Content-Type for FormData
      body: formData,
    });
  }
}

export default new ApiService();
```

### Vue.js

```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
};

export const productService = {
  async getProducts() {
    const response = await api.get('/products');
    return response.data;
  },
  
  async searchProducts(query) {
    const response = await api.get(`/products/search?q=${query}`);
    return response.data;
  },
};
```

## 🔄 Development Workflow

### Daily Development

```bash
# Morning: Start backend
./start-platform.sh essential

# Work on your frontend/mobile app
# Backend APIs are available at localhost:3000-3012

# Evening: Stop backend (optional)
./start-platform.sh stop
```

### When You Need Different Features

```bash
# Need search functionality?
./start-platform.sh search

# Need admin features?
./start-platform.sh admin

# Need everything?
./start-platform.sh full
```

### Testing Different Scenarios

```bash
# Test with fresh data
./start-platform.sh clean
./start-platform.sh essential

# Test with specific services
docker-compose up -d postgres redis api-gateway authentication-service
```

## 📚 Additional Resources

- **API Documentation**: http://localhost:3000/api-docs (when running)
- **Quick Reference**: [docs/QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **Main README**: [README.md](../README.md)
- **Production Deployment**: [docs/PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)

## 💡 Pro Tips

1. **Use Essential Mode**: Start with `./start-platform.sh essential` for faster startup
2. **Check Health**: Always verify with `curl http://localhost:3000/health`
3. **Use API Docs**: Visit http://localhost:3000/api-docs for interactive testing
4. **Mobile Testing**: Use your computer's IP address for physical device testing
5. **Clean Restart**: Use `./start-platform.sh clean` if you encounter issues

---

**Happy coding! 🚀**

Your backend is now ready for frontend and mobile development!