#!/bin/bash

# Script to set Agora credentials as Supabase secrets
# Run this after adding credentials to .env file

echo "🔐 Setting Agora credentials as Supabase secrets..."

# Read from .env file
if [ ! -f .env ]; then
  echo "❌ .env file not found"
  exit 1
fi

# Extract Agora credentials from .env
AGORA_APP_ID=$(grep "^EXPO_PUBLIC_AGORA_APP_ID=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
AGORA_APP_CERTIFICATE=$(grep "^EXPO_PUBLIC_AGORA_APP_CERTIFICATE=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$AGORA_APP_ID" ] || [ -z "$AGORA_APP_CERTIFICATE" ]; then
  echo "❌ Agora credentials not found in .env file"
  echo "Please add:"
  echo "  EXPO_PUBLIC_AGORA_APP_ID=your_app_id"
  echo "  EXPO_PUBLIC_AGORA_APP_CERTIFICATE=your_certificate"
  exit 1
fi

echo "✅ Found Agora credentials in .env"
echo "📤 Setting as Supabase secrets..."

# Set as Supabase secrets
supabase secrets set AGORA_APP_ID="$AGORA_APP_ID"
supabase secrets set AGORA_APP_CERTIFICATE="$AGORA_APP_CERTIFICATE"

if [ $? -eq 0 ]; then
  echo "✅ Successfully set Agora credentials as Supabase secrets!"
  echo "🔄 The Edge Function should now work correctly."
else
  echo "❌ Failed to set secrets. Make sure you're logged in: supabase login"
  exit 1
fi





