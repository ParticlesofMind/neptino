#!/bin/bash

echo "🔍 Checking API Keys Configuration..."
echo "======================================"

# Function to check if a variable is set and not a placeholder
check_env_var() {
    local var_name=$1
    local var_value=$(grep "^$var_name=" .env 2>/dev/null | cut -d'=' -f2-)
    
    if [ -z "$var_value" ]; then
        echo "❌ $var_name: Not found in .env"
        return 1
    elif [[ "$var_value" == *"your_"*"_here" ]] || [[ "$var_value" == "YOUR_"* ]]; then
        echo "⚠️  $var_name: Placeholder value (needs real API key)"
        return 1
    else
        echo "✅ $var_name: Configured"
        return 0
    fi
}

echo ""
echo "Required API Keys:"
echo "=================="

# Check each required API key
configured_count=0
total_count=0

# Image Services
echo ""
echo "📸 Image Services:"
check_env_var "VITE_UNSPLASH_KEY" && ((configured_count++))
((total_count++))
check_env_var "VITE_PIXABAY_KEY" && ((configured_count++))
((total_count++))
check_env_var "VITE_PEXELS_KEY" && ((configured_count++))
((total_count++))

# Audio Services
echo ""
echo "🔊 Audio Services:"
check_env_var "VITE_FREESOUND_KEY" && ((configured_count++))
((total_count++))

# Cloud Storage
echo ""
echo "☁️  Cloud Storage:"
check_env_var "VITE_GOOGLE_DRIVE_KEY" && ((configured_count++))
((total_count++))
check_env_var "VITE_GOOGLE_DRIVE_CLIENT_ID" && ((configured_count++))
((total_count++))
check_env_var "VITE_DROPBOX_KEY" && ((configured_count++))
((total_count++))
check_env_var "VITE_DROPBOX_CLIENT_ID" && ((configured_count++))
((total_count++))

echo ""
echo "======================================"
echo "📊 Summary: $configured_count/$total_count API keys configured"

if [ $configured_count -eq 0 ]; then
    echo "🚨 No API keys configured! Your media features won't work."
    echo "📖 See docs/api-keys-setup.md for setup instructions."
elif [ $configured_count -lt 3 ]; then
    echo "⚠️  Minimal setup. Consider adding more API keys for better media options."
    echo "📖 See docs/api-keys-setup.md for setup instructions."
elif [ $configured_count -eq $total_count ]; then
    echo "🎉 All API keys configured! Your application is ready."
else
    echo "✨ Good setup! You have most API keys configured."
fi

echo ""
echo "Next steps:"
echo "1. 📖 Read docs/api-keys-setup.md for detailed setup instructions"
echo "2. 🧪 Test your APIs: npm run dev, then visit /api-test.html"
echo "3. 🔧 Configure missing keys as needed"
echo ""
