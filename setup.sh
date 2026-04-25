#!/bin/bash
# Quick setup script for Gradia Flow

echo "🚀 Gradia Flow - Quick Setup"
echo "============================"
echo ""

# Check if frontend exists
if [ ! -d "frontend" ]; then
  echo "❌ Error: 'frontend' directory not found"
  echo "   Please run this script from the project root: c:\Users\ADMIN\Desktop\sms"
  exit 1
fi

cd frontend

# Check if .env.local exists
if [ -f ".env.local" ]; then
  echo "✅ .env.local already exists"
  echo ""
  echo "Current environment:"
  cat .env.local
  echo ""
  read -p "Do you want to update it? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping .env.local update"
  fi
else
  echo "📝 Creating .env.local..."
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Clear node_modules cache
echo ""
echo "🧹 Clearing caches..."
npm cache clean --force

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Edit frontend/.env.local with your Supabase credentials:"
echo "   VITE_SUPABASE_URL=https://your-project.supabase.co"
echo "   VITE_SUPABASE_ANON_KEY=your-anon-key-here"
echo ""
echo "2. Get credentials from: https://supabase.com → Your Project → Settings → API"
echo ""
echo "3. Start dev server:"
echo "   npm run dev"
echo ""
echo "4. Open browser:"
echo "   http://localhost:5173"
