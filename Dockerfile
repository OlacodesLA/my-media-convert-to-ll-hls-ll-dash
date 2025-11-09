FROM node:18-alpine AS base

ENV NODE_ENV=production
WORKDIR /app

# Install system dependencies needed for sharp
RUN apk add --no-cache \
    bash \
    python3 \
    make \
    g++ \
    libc6-compat

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Ensure entrypoint is executable
RUN chmod +x docker/entrypoint.sh

# Generate Prisma client at build time
RUN npx prisma generate

EXPOSE 3000

# Entrypoint allows migrations before starting the app
ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["npm", "start"]

