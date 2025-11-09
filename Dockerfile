FROM node:18-bullseye-slim AS base

ENV NODE_ENV=production
WORKDIR /app

# Install system dependencies needed for native modules (sharp, Prisma, etc.)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openssl \
        ca-certificates \
        python3 \
        make \
        g++ \
        bash \
        git \
    && rm -rf /var/lib/apt/lists/*

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

