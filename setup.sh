#!/bin/bash

# UltraFast Social Platform Startup Script
# This script sets up the development environment

echo "🚀 Setting up UltraFast Social Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your AWS credentials and database settings"
fi

# Check for DATABASE_URL
if ! grep -q "DATABASE_URL" .env; then
    echo "❌ DATABASE_URL is missing in .env. Please update it before continuing."
    exit 1
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Check if database exists
echo "🗄️  Applying Prisma migrations..."
npm run prisma:deploy || {
    echo "⚠️  Prisma migration failed. Please ensure your DATABASE_URL is correct and PostgreSQL is running."
    exit 1
}

echo "🧬 Generating Prisma client..."
npm run prisma:generate || {
    echo "⚠️  Prisma client generation failed."
    exit 1
}

echo "✅ Setup complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Edit .env file with your AWS credentials"
echo "2. Follow AWS setup guide in docs/AWS_SETUP.md"
echo "3. Run: npm run dev"
echo ""
echo "🌐 Your platform will be available at: http://localhost:3000"
echo ""
echo "🎉 Ready to build the fastest social media platform!"
