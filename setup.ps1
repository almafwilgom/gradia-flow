# Gradia Flow Quick Setup for Windows
# Run this from the project root: c:\Users\ADMIN\Desktop\sms

Write-Host "🚀 Gradia Flow - Quick Setup for Windows" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

# Check if frontend exists
if (!(Test-Path "frontend")) {
    Write-Host "❌ Error: 'frontend' directory not found" -ForegroundColor Red
    Write-Host "   Please run this script from the project root" -ForegroundColor Yellow
    exit 1
}

# Navigate to frontend
Push-Location frontend

Write-Host "📋 Checking environment setup..." -ForegroundColor Blue
Write-Host ""

# Check if .env.local exists
if (Test-Path ".env.local") {
    Write-Host "✅ .env.local found" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current environment:" -ForegroundColor Yellow
    Get-Content .env.local
    Write-Host ""
    $response = Read-Host "Update .env.local? (y/n)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "Skipping .env.local update" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  .env.local not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Creating template..." -ForegroundColor Blue
    
    $envContent = @"
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-here.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Get these from: https://supabase.com → Your Project → Settings → API
"@
    
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ Created .env.local" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Edit .env.local with your Supabase credentials!" -ForegroundColor Yellow
}

# Install dependencies
Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Clear caches
Write-Host ""
Write-Host "🧹 Clearing caches..." -ForegroundColor Blue
npm cache clean --force

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Edit frontend\.env.local with your Supabase credentials"
Write-Host "2. Get credentials from:"
Write-Host "   https://supabase.com → Your Project → Settings → API"
Write-Host "3. Add these environment variables:"
Write-Host "   VITE_SUPABASE_URL=https://your-project.supabase.co"
Write-Host "   VITE_SUPABASE_ANON_KEY=your-anon-key-here"
Write-Host ""
Write-Host "4. Start dev server:"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "5. Open browser:"
Write-Host "   http://localhost:5173"
Write-Host ""

Pop-Location
