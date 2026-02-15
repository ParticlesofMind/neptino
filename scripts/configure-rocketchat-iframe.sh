#!/bin/bash

# Rocket.Chat Iframe Configuration Script
# Run this AFTER completing the Rocket.Chat setup wizard

set -e

echo "🚀 Rocket.Chat Iframe Configuration Script"
echo "==========================================="
echo ""

# Check if Rocket.Chat is running
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/home | grep -q "200"; then
    echo "❌ Error: Rocket.Chat is not running at http://localhost:3100"
    echo "   Please start it with: docker compose up -d"
    exit 1
fi

echo "✅ Rocket.Chat is running"
echo ""

# Prompt for admin credentials
echo "Please provide your Rocket.Chat admin credentials:"
read -p "Admin Username: " ADMIN_USER
read -sp "Admin Password: " ADMIN_PASSWORD
echo ""
echo ""

# Login and get auth token
echo "🔐 Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3100/api/v1/login \
    -H "Content-Type: application/json" \
    -d "{\"user\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASSWORD\"}")

AUTH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.authToken' 2>/dev/null)
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.userId' 2>/dev/null)

if [ "$AUTH_TOKEN" == "null" ] || [ -z "$AUTH_TOKEN" ]; then
    echo "❌ Authentication failed. Please check your credentials."
    exit 1
fi

echo "✅ Authentication successful"
echo ""

# Configure iframe settings
echo "⚙️  Configuring iframe integration settings..."

# Enable iframe integration
curl -s -X POST http://localhost:3100/api/v1/settings/Iframe_Integration_send_enable \
    -H "X-Auth-Token: $AUTH_TOKEN" \
    -H "X-User-Id: $USER_ID" \
    -H "Content-Type: application/json" \
    -d '{"value": true}' > /dev/null

curl -s -X POST http://localhost:3100/api/v1/settings/Iframe_Integration_send_target_origin \
    -H "X-Auth-Token: $AUTH_TOKEN" \
    -H "X-User-Id: $USER_ID" \
    -H "Content-Type: application/json" \
    -d '{"value": "http://localhost:3000"}' > /dev/null

curl -s -X POST http://localhost:3100/api/v1/settings/Iframe_Integration_receive_enable \
    -H "X-Auth-Token: $AUTH_TOKEN" \
    -H "X-User-Id: $USER_ID" \
    -H "Content-Type: application/json" \
    -d '{"value": true}' > /dev/null

curl -s -X POST http://localhost:3100/api/v1/settings/Iframe_Integration_receive_origin \
    -H "X-Auth-Token: $AUTH_TOKEN" \
    -H "X-User-Id: $USER_ID" \
    -H "Content-Type: application/json" \
    -d '{"value": "http://localhost:3000"}' > /dev/null

# Disable X-Frame-Options (allow all origins)
curl -s -X POST http://localhost:3100/api/v1/settings/X_Frame_Options \
    -H "X-Auth-Token: $AUTH_TOKEN" \
    -H "X-User-Id: $USER_ID" \
    -H "Content-Type: application/json" \
    -d '{"value": ""}' > /dev/null

echo "✅ Iframe integration configured"
echo ""

# Save credentials to .env.local
echo "💾 Saving admin credentials to .env.local..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    exit 1
fi

# Update or add the credentials
if grep -q "VITE_ROCKETCHAT_ADMIN_TOKEN" .env.local; then
    # Update existing entries
    sed -i.bak "s|^VITE_ROCKETCHAT_ADMIN_TOKEN=.*|VITE_ROCKETCHAT_ADMIN_TOKEN=$AUTH_TOKEN|" .env.local
    sed -i.bak "s|^VITE_ROCKETCHAT_ADMIN_USER_ID=.*|VITE_ROCKETCHAT_ADMIN_USER_ID=$USER_ID|" .env.local
    rm .env.local.bak 2>/dev/null || true
else
    # Append new entries
    echo "" >> .env.local
    echo "# Rocket.Chat Admin Credentials (auto-generated)" >> .env.local
    echo "VITE_ROCKETCHAT_ADMIN_TOKEN=$AUTH_TOKEN" >> .env.local
    echo "VITE_ROCKETCHAT_ADMIN_USER_ID=$USER_ID" >> .env.local
fi

echo "✅ Credentials saved to .env.local"
echo ""

echo "🎉 Configuration Complete!"
echo ""
echo "Next steps:"
echo "1. Restart your Vite dev server: npm run dev"
echo "2. Open http://localhost:3000/teacher/home"
echo "3. Navigate to the Messages section"
echo "4. The Rocket.Chat iframe should now load successfully"
echo ""
echo "Your admin credentials:"
echo "  Auth Token: $AUTH_TOKEN"
echo "  User ID: $USER_ID"
echo ""
