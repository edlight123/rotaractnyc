#!/bin/bash

# Annual Dues System - Deployment Script
# This script helps deploy Firestore rules and indexes

set -e

echo "======================================"
echo "Annual Dues System - Deployment"
echo "======================================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi

echo "✓ Firebase CLI found"
echo ""

# Check if logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase"
    echo "Run: firebase login"
    exit 1
fi

echo "✓ Logged in to Firebase"
echo ""

# Get current project
PROJECT=$(firebase use 2>&1 | grep "Active Project:" | awk '{print $3}')
if [ -z "$PROJECT" ]; then
    echo "❌ No Firebase project selected"
    echo "Run: firebase use <project-id>"
    exit 1
fi

echo "📦 Active Project: $PROJECT"
echo ""

# Ask for confirmation
read -p "Deploy Firestore rules and indexes for dues system? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "Deploying..."
echo ""

# Deploy Firestore rules
echo "📝 Deploying Firestore security rules..."
if firebase deploy --only firestore:rules; then
    echo "✓ Rules deployed successfully"
else
    echo "❌ Failed to deploy rules"
    exit 1
fi

echo ""

# Deploy Firestore indexes
echo "📊 Deploying Firestore indexes..."
if firebase deploy --only firestore:indexes; then
    echo "✓ Indexes deployed successfully"
else
    echo "❌ Failed to deploy indexes"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Add AUTOMATION_API_KEY to your .env.local (see .env.annual-dues.template)"
echo "2. Deploy to production: git push"
echo "3. Add environment variables to Vercel dashboard"
echo "4. Create your first dues cycle at: /admin/finance/dues"
echo "5. Setup automation cron jobs (see docs/ANNUAL_DUES_GUIDE.md)"
echo ""
