# UltraFast Social Platform Startup Script (PowerShell)
# This script sets up the development environment on Windows

Write-Host "Setting up UltraFast Social Platform..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed. Please install Node.js 16+ first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from template..." -ForegroundColor Blue
    Copy-Item "env.example" ".env"
    Write-Host "Please edit .env file with your AWS credentials and database settings" -ForegroundColor Yellow
} else {
    Write-Host ".env file already exists" -ForegroundColor Green
}

# Validate DATABASE_URL exists
$envContent = Get-Content ".env"
if (-not ($envContent -match "DATABASE_URL")) {
    Write-Host "DATABASE_URL is missing in .env. Please update it before continuing." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Blue
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "Dependencies installed successfully" -ForegroundColor Green

# Database setup instructions
# Apply Prisma migrations
Write-Host "Applying Prisma migrations..." -ForegroundColor Blue
npm run prisma:deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to apply Prisma migrations. Check DATABASE_URL and ensure PostgreSQL is running." -ForegroundColor Red
    exit 1
}

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Blue
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to generate Prisma client." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Blue
Write-Host "1. Edit .env file with your AWS credentials" -ForegroundColor White
Write-Host "2. Follow AWS setup guide in docs/AWS_SETUP.md" -ForegroundColor White
Write-Host "3. Run Prisma migrations: npm run prisma:deploy" -ForegroundColor White
Write-Host "4. Run: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Your platform will be available at: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Ready to build the fastest social media platform!" -ForegroundColor Green