# Agora Token Edge Function

This Edge Function securely generates Agora.io tokens for calling features.

## Setup

### 1. Environment Variables

Set these in your Supabase project dashboard (Settings > Edge Functions > Environment Variables):

- `AGORA_APP_ID` - Your Agora App ID from console.agora.io
- `AGORA_APP_CERTIFICATE` - Your Agora App Certificate
- `SUPABASE_URL` - Your Supabase project URL (auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (auto-set)

### 2. Deploy

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy agora-token
```

### 3. Test

```bash
# Test locally (requires Deno)
supabase functions serve agora-token

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/agora-token' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"callSessionId": "your-call-session-id"}'
```

## Security

- ✅ Validates user authentication
- ✅ Checks team membership
- ✅ Verifies call session exists and hasn't ended
- ✅ Validates user is a call participant
- ✅ Tokens expire in 1 hour
- ✅ Logs all token generation events

## Usage

From your React Native app:

```javascript
import { getAgoraToken } from '../api/calling';

const { data, error } = await getAgoraToken(callSessionId);
if (data) {
  const { token, channelName, uid } = data;
  // Use token with Agora SDK
}
```

