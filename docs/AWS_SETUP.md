# AWS Setup Guide for UltraFast Social Platform

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. Node.js application running

## Step 1: Create S3 Bucket

```bash
# Create S3 bucket for media storage
aws s3 mb s3://your-streaming-bucket-name --region us-east-1

# Enable CORS for the bucket
aws s3api put-bucket-cors --bucket your-streaming-bucket-name --cors-configuration file://cors-config.json
```

## Step 2: Install FFmpeg (Local Processing)

```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# On macOS with Homebrew
brew install ffmpeg

# On Windows with Chocolatey
choco install ffmpeg

# Verify installation
ffmpeg -version
```

**Note**: FFmpeg is now used for local video processing instead of AWS MediaConvert, making it faster and more cost-effective!

## Step 3: Setup CloudFront Distribution

```bash
# Create CloudFront distribution configuration
cat > cloudfront-config.json << EOF
{
    "CallerReference": "ultrafast-social-$(date +%s)",
    "Comment": "UltraFast Social Platform CDN",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-your-streaming-bucket-name",
                "DomainName": "your-streaming-bucket-name.s3.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-your-streaming-bucket-name",
        "ViewerProtocolPolicy": "redirect-to-https",
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000
    },
    "CacheBehaviors": {
        "Quantity": 2,
        "Items": [
            {
                "PathPattern": "streaming/*",
                "TargetOriginId": "S3-your-streaming-bucket-name",
                "ViewerProtocolPolicy": "redirect-to-https",
                "TrustedSigners": {
                    "Enabled": false,
                    "Quantity": 0
                },
                "ForwardedValues": {
                    "QueryString": true,
                    "Cookies": {
                        "Forward": "none"
                    }
                },
                "MinTTL": 0,
                "DefaultTTL": 0,
                "MaxTTL": 0
            },
            {
                "PathPattern": "uploads/*",
                "TargetOriginId": "S3-your-streaming-bucket-name",
                "ViewerProtocolPolicy": "redirect-to-https",
                "TrustedSigners": {
                    "Enabled": false,
                    "Quantity": 0
                },
                "ForwardedValues": {
                    "QueryString": false,
                    "Cookies": {
                        "Forward": "none"
                    }
                },
                "MinTTL": 0,
                "DefaultTTL": 86400,
                "MaxTTL": 31536000
            }
        ]
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100"
}
EOF

# Create CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

## Step 4: Environment Variables

Create a `.env` file in your project root:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/social_platform?schema=public"

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-streaming-bucket-name
CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net

# FFmpeg Configuration (no additional configuration needed)
# FFmpeg will be used for local video processing

# Server Configuration
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-super-secret-jwt-key
```

## Step 5: CORS Configuration

Create `cors-config.json`:

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

## Step 6: Database Setup

```bash
# Apply Prisma schema to your PostgreSQL database
npm run prisma:deploy
```

## Step 7: Install Dependencies and Start

```bash
# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

## Performance Optimizations

### S3 Bucket Configuration

- Enable versioning for media files
- Configure lifecycle policies for cost optimization
- Use S3 Transfer Acceleration for faster uploads

### CloudFront Optimizations

- Configure appropriate cache behaviors for different content types
- Enable compression
- Use appropriate TTL values for streaming content

### MediaConvert Optimizations

- Use appropriate bitrates for different quality levels
- Configure adaptive bitrate streaming
- Optimize encoding settings for mobile and desktop

## Security Considerations

1. **IAM Roles**: Use least privilege principle
2. **S3 Bucket Policies**: Restrict access appropriately
3. **CloudFront**: Configure security headers
4. **Database**: Use connection pooling and prepared statements
5. **File Upload**: Validate file types and sizes

## Monitoring and Logging

1. **CloudWatch**: Monitor AWS services
2. **Application Logs**: Use structured logging
3. **Performance Metrics**: Track upload times and processing durations
4. **Error Tracking**: Implement comprehensive error handling

## Cost Optimization

1. **S3 Storage Classes**: Use appropriate storage classes
2. **CloudFront**: Optimize cache hit ratios
3. **MediaConvert**: Use appropriate encoding settings
4. **Database**: Optimize queries and indexes
