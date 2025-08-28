# File Service

A comprehensive file upload and media management service with cloud storage integration, image processing capabilities, and CDN support.

## Features

- **File Upload**: Support for images, videos, and documents
- **Cloud Storage**: AWS S3 integration with optional CloudFront CDN
- **Image Processing**: Resize, optimize, format conversion, and watermarking
- **Security**: File type validation, size limits, and access control
- **Metadata Management**: File metadata storage and search capabilities
- **Authentication**: JWT-based authentication with public/private file support
- **API Documentation**: Comprehensive REST API with validation

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- AWS S3 bucket (configured)
- Redis (optional, for caching)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment configuration
cp .env.example .env

# Configure your environment variables
# Edit .env with your database and AWS credentials

# Run database migrations (automatic on startup)
npm run dev
```

### Environment Configuration

```bash
# Server Configuration
PORT=3007
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/file_service_db

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
S3_BUCKET_NAME=your-s3-bucket-name

# Optional CloudFront CDN
CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net

# File Upload Limits
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp
ALLOWED_VIDEO_TYPES=video/mp4,video/mpeg,video/quicktime
ALLOWED_DOCUMENT_TYPES=application/pdf,application/msword

# Security
JWT_SECRET=your-jwt-secret-key
```

## API Endpoints

### File Upload

```bash
# Upload single file
POST /api/files/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

# Upload multiple files
POST /api/files/upload/multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

### File Management

```bash
# Get file by ID
GET /api/files/:fileId

# Search files
GET /api/files?category=image&limit=20&offset=0

# Get user's files
GET /api/files/user/files

# Delete file
DELETE /api/files/:fileId
Authorization: Bearer <token>
```

### Image Processing

```bash
# Process image (resize, optimize, etc.)
POST /api/files/:fileId/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "resize": {
    "width": 800,
    "height": 600,
    "fit": "cover"
  },
  "quality": 80,
  "format": "jpeg"
}
```

### Signed URLs

```bash
# Get signed URL for direct access
POST /api/files/:fileId/signed-url
Content-Type: application/json

{
  "expiresIn": 3600
}
```

## File Upload Example

### JavaScript/Node.js

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('category', 'image');
formData.append('tags', JSON.stringify(['profile', 'avatar']));
formData.append('isPublic', 'false');

const response = await fetch('/api/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('Uploaded file:', result.data);
```

### cURL

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/your/file.jpg" \
  -F "category=image" \
  -F "isPublic=false" \
  http://localhost:3007/api/files/upload
```

## Image Processing Features

### Resize Images

```javascript
const processOptions = {
  resize: {
    width: 800,
    height: 600,
    fit: 'cover' // 'cover', 'contain', 'fill', 'inside', 'outside'
  }
};
```

### Format Conversion

```javascript
const processOptions = {
  format: 'webp', // 'jpeg', 'png', 'webp'
  quality: 80
};
```

### Watermarking

```javascript
const processOptions = {
  watermark: {
    image: 'base64-encoded-watermark-image',
    position: 'bottom-right' // 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'
  }
};
```

## File Categories

The service automatically categorizes files based on MIME type:

- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, MPEG, QuickTime
- **Documents**: PDF, Word documents
- **Other**: All other file types

## Security Features

### File Validation

- MIME type checking
- File size limits
- Malicious file detection
- Extension validation

### Access Control

- JWT-based authentication
- Public/private file access
- User ownership validation
- Signed URLs for secure access

### Data Protection

- Encrypted storage (S3 server-side encryption)
- Secure file URLs
- Access logging
- CORS protection

## Database Schema

The service uses PostgreSQL with the following main table:

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  category VARCHAR(50) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  s3_url TEXT NOT NULL,
  cdn_url TEXT,
  uploaded_by VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_processed BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(50),
  processing_error TEXT,
  metadata JSONB,
  tags TEXT[],
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t file-service .

# Run container
docker run -p 3007:3007 --env-file .env file-service
```

## Monitoring and Health Checks

### Health Endpoints

```bash
# Basic health check
GET /api/health

# Detailed health check (includes database and S3 status)
GET /api/health/detailed

# Kubernetes readiness probe
GET /api/health/ready

# Kubernetes liveness probe
GET /api/health/live
```

## Performance Optimization

### Caching Strategy

- CDN integration for static file delivery
- Database query optimization with proper indexing
- Connection pooling for database connections

### Image Processing

- Asynchronous processing for large images
- Multiple format support for optimal delivery
- Responsive image generation

### Scalability

- Stateless service design
- Horizontal scaling support
- Load balancer compatible

## Error Handling

The service provides comprehensive error handling with structured error responses:

```json
{
  "error": "File too large",
  "code": "FILE_TOO_LARGE",
  "timestamp": "2023-07-20T10:30:00.000Z",
  "path": "/api/files/upload",
  "details": {
    "maxSize": 10485760
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.