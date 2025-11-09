# 🚀 UltraFast Social Platform

The fastest social media platform powered by **LL-DASH** and **LL-HLS** streaming technology, designed to outperform Instagram and other social media platforms.

## ✨ Features

- **Ultra-Fast Streaming**: LL-DASH and LL-HLS adaptive bitrate streaming
- **Real-time Processing**: FFmpeg for ultra-fast local video processing
- **Modern UI**: Beautiful, responsive HTML5 interface
- **High Performance**: Optimized database schema and caching
- **Scalable Architecture**: AWS S3 + CloudFront CDN
- **Social Features**: Posts, likes, comments, and user interactions

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌────────────────────────┐
│   HTML5 Frontend │    │   Node.js API   │    │ PostgreSQL (via Prisma)│
│                 │◄──►│                 │◄──►│                        │
│  - Modern UI    │    │  - Express.js   │    │  - Posts & Users       │
│  - Drag & Drop  │    │  - File Upload  │    │  - Streaming Metadata  │
│  - Streaming    │    │  - S3 Integration│   │  - Analytics           │
└─────────────────┘    └─────────────────┘    └────────────────────────┘
                                │
                                ▼
                    ┌─────────────────┐
                    │   AWS Services  │
                    │                 │
                    │  - S3 Storage   │
                    │  - FFmpeg       │
                    │  - CloudFront   │
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- PostgreSQL 14+
- AWS Account with S3 and CloudFront access
- FFmpeg installed locally
- AWS CLI configured

### 1. Clone and Install

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Update the DATABASE_URL in .env to point to your PostgreSQL instance
```

### 2. Database Setup

```bash
# Apply Prisma migrations
npm run prisma:deploy

# Generate Prisma client (optional if migrations already ran)
npm run prisma:generate
```

### 3. AWS Configuration

Follow the detailed setup guide in [docs/AWS_SETUP.md](docs/AWS_SETUP.md) to configure:

- S3 bucket for media storage
- FFmpeg installation for local processing
- CloudFront distribution for CDN
- Environment variables

### 4. Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Visit `http://localhost:3000` to see your ultra-fast social platform!

### Docker Deployment

Build and run everything (app + PostgreSQL) with Docker:

```bash
# Copy environment file
cp env.example .env

# Update .env with your AWS + other secrets (DATABASE_URL is overridden in compose)

# Start services
docker compose up --build
```

The app will be available at `http://localhost:3000`. The bundled Postgres instance listens on `localhost:5432` with credentials defined in `docker-compose.yml`. To tear everything down, run `docker compose down` (add `-v` to remove the database volume).

## 📱 Usage

### Creating Posts

1. **Upload Media**: Drag & drop or click to upload images/videos (up to 500MB)
2. **Add Caption**: Write a compelling caption for your post
3. **Submit**: Click upload and watch the magic happen!

### Video Processing

- **Images**: Instantly available after upload
- **Videos**: Automatically processed for LL-DASH and LL-HLS streaming
- **Status Tracking**: Real-time processing status updates
- **Streaming**: Switch between HLS and DASH formats for optimal performance

### Social Features

- **Like Posts**: Click the heart icon to like posts
- **View Counts**: Track post engagement
- **Responsive Design**: Works perfectly on all devices

## 🔧 API Endpoints

### Posts

- `GET /api/posts` - Get all posts (paginated)
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create new post
- `GET /api/posts/:id/status` - Check processing status
- `POST /api/posts/:id/like` - Like/unlike post

### Health

- `GET /health` - Health check endpoint

## 🎯 Performance Optimizations

### Streaming Technology

- **LL-DASH**: Low-latency DASH for ultra-fast startup
- **LL-HLS**: Low-latency HLS for broad compatibility
- **Adaptive Bitrate**: Automatic quality adjustment
- **CDN Distribution**: Global content delivery

### Database Optimizations

- **Indexed Queries**: Optimized for social media queries
- **Prisma Client**: Efficient connection & query management
- **Prepared Statements**: ORM-powered SQL injection protection

### Frontend Optimizations

- **Lazy Loading**: Images and videos load on demand
- **Progressive Enhancement**: Works without JavaScript
- **Responsive Images**: Optimized for all screen sizes

## 🔒 Security Features

- **File Validation**: Type and size restrictions
- **SQL Injection Protection**: Prepared statements
- **CORS Configuration**: Secure cross-origin requests
- **Rate Limiting**: API abuse prevention
- **Helmet.js**: Security headers

## 📊 Monitoring

- **Health Checks**: Application status monitoring
- **Processing Status**: Real-time job tracking
- **Error Handling**: Comprehensive error management
- **Performance Metrics**: Upload and processing times

## 🚀 Deployment

### Production Checklist

1. **Environment Variables**: Configure all AWS credentials
2. **Database**: Set up a production PostgreSQL instance
3. **AWS Services**: Configure S3, CloudFront
4. **Security**: Update CORS and security settings
5. **Monitoring**: Set up logging and monitoring

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check the docs folder
- **Issues**: Open an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions

## 🎉 Why UltraFast Social?

This platform is designed to be **faster than Instagram** by:

1. **Low-Latency Streaming**: LL-DASH and LL-HLS reduce startup time
2. **Optimized Processing**: AWS MediaConvert for efficient encoding
3. **Global CDN**: CloudFront for worldwide fast delivery
4. **Modern Architecture**: Built for scale and performance
5. **Efficient Database**: Optimized queries and indexing

Ready to build the future of social media? Let's go! 🚀
