# CORS Configuration for CloudFront

## The Problem

Your streams are hosted on CloudFront, but the CORS headers are not configured, causing:

```
Access to XMLHttpRequest blocked by CORS policy
```

## Solutions

### Option 1: Configure CloudFront CORS (Recommended)

1. **Go to AWS CloudFront Console**
2. **Find your distribution** (d2ssmtrbh2u7oe.cloudfront.net)
3. **Click on your distribution**
4. **Go to "Behaviors" tab**
5. **Edit the behavior**
6. **Under "Cache key and origin requests"**
   - Set **Cache policy** to "CORS-S3Origin" or create a custom one
7. **Save changes**

### Option 2: Configure S3 Bucket CORS (Quick Fix)

Apply this CORS configuration to your S3 bucket:

1. **Go to AWS S3 Console**
2. **Select your bucket**: `olajides-speed-streaming-test`
3. **Go to "Permissions" tab**
4. **Scroll to "Cross-origin resource sharing (CORS)"**
5. **Click "Edit"**
6. **Paste this configuration:**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3000
  }
]
```

7. **Save changes**

### Option 3: Update CloudFront Origin Response Headers

Add these headers in CloudFront:

1. **CloudFront Console** → **Distribution** → **Behaviors**
2. **Create New Behavior** or **Edit Existing**
3. **Under "Response headers policy"**:
   - Add: `Access-Control-Allow-Origin: *`
   - Add: `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
   - Add: `Access-Control-Allow-Headers: *`

### Option 4: Use S3 Direct URLs (Temporary Workaround)

Update your video URLs to use S3 directly instead of CloudFront:

```typescript
// In your backend, return S3 URLs instead of CloudFront URLs
const videoUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${filename}`;
```

This bypasses CloudFront CORS issues.

## Testing

After applying the CORS configuration:

1. Clear your browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check browser console for CORS errors
4. Video should now load properly

## Quick Command (If you have AWS CLI configured)

Apply CORS to S3 bucket:

```bash
aws s3api put-bucket-cors --bucket olajides-speed-streaming-test --cors-configuration file://cors-config-cloudfront.json
```

Then invalidate CloudFront cache:

```bash
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```





