#!/bin/bash

# Script to deploy the optimized notification RPC function to Supabase
# Run this script to create the get_team_notification_summary function

echo "🚀 Deploying optimized notification RPC function to Supabase..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run this from your project root."
    exit 1
fi

# Deploy the SQL function
echo "📝 Creating get_team_notification_summary function..."
supabase db reset --db-url "$DATABASE_URL" < database/get_team_notification_summary.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully deployed get_team_notification_summary function!"
    echo "🎯 The app will now use the optimized single-query notification counting."
else
    echo "❌ Failed to deploy the function. Please check your database connection."
    exit 1
fi

echo "🎉 Phase 5 optimization complete!"
echo "📊 Notification counting is now optimized with a single RPC call."
