# 🧪 OAuth Integration Test Script

## Test the Complete OAuth Flow

### Prerequisites
Make sure these services are running:
- ✅ Supabase: `supabase start`
- ✅ Neptino Frontend: `npm run dev` (port 3000)
- ✅ OAuth Server: `npm run dev:oauth` (port 3001)

### Test Steps

1. **Create a New Account**
   - Go to: http://localhost:3000/src/pages/shared/signup.html
   - Fill in the form:
     - Email: `test@example.com`
     - Password: `testpassword123`
     - Full Name: `Test User`
     - Role: `teacher` (or `student`/`admin`)
   - Click "Sign Up"
   - ✅ Should redirect to teacher home page

2. **Navigate to Messages**
   - On the home page, click "Messages" in the sidebar
   - ✅ Should show OAuth loading screen
   - ✅ Should redirect to OAuth authorization endpoint
   - ✅ Should complete OAuth flow silently
   - ✅ Should return to messages with Rocket.Chat interface

3. **Verify OAuth Integration**
   - Check browser console for OAuth flow logs
   - Verify user info is displayed correctly
   - Test user search functionality

### Expected Behavior

- **No duplicate signup required** ✅
- **Seamless OAuth flow** ✅
- **User role correctly mapped** ✅
- **Rocket.Chat interface loads** ✅

### Troubleshooting

If OAuth flow fails:
1. Check OAuth server logs: Look for errors in terminal running `npm run dev:oauth`
2. Check browser console for JavaScript errors
3. Verify Supabase is running: `supabase status`
4. Test OAuth endpoints manually:
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3001/.well-known/openid-configuration
   ```

### OAuth Server Configuration

The OAuth server is configured with:
- **Client ID**: `rocketchat`
- **Client Secret**: `rocketchat-secret`
- **Callback URL**: `http://localhost:3000/_oauth/neptino`
- **Scopes**: `openid profile email`

### Rocket.Chat Configuration Needed

To complete the integration, configure Rocket.Chat with:
- **Authorization URL**: `http://localhost:3001/oauth/authorize`
- **Token URL**: `http://localhost:3001/oauth/token`
- **User Info URL**: `http://localhost:3001/oauth/userinfo`
- **Client ID**: `rocketchat`
- **Client Secret**: `rocketchat-secret`
- **Enable**: Auto register users
- **Roles/Groups field name**: `roles`

