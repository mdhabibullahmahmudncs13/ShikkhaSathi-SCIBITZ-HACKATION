#!/bin/bash

# Setup HTTPS for Development - ShikkhaSathi
# This script generates self-signed certificates for local HTTPS development

echo "🔐 Setting up HTTPS for ShikkhaSathi development..."

# Create certs directory
mkdir -p frontend/certs

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout frontend/certs/key.pem -out frontend/certs/cert.pem -days 365 -nodes -subj "/C=BD/ST=Dhaka/L=Dhaka/O=ShikkhaSathi/OU=Development/CN=localhost/subjectAltName=DNS:localhost,DNS:*.local,IP:127.0.0.1,IP:192.168.0.109"

# Set appropriate permissions
chmod 600 frontend/certs/key.pem
chmod 644 frontend/certs/cert.pem

echo "✅ HTTPS certificates generated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Run: npm run dev (in frontend directory)"
echo "2. Access via: https://localhost:5173 or https://192.168.0.109:5173"
echo "3. Accept the self-signed certificate warning in your browser"
echo "4. Camera and microphone should now work properly!"
echo ""
echo "🔧 For production, replace these certificates with proper SSL certificates"
echo ""
echo "📱 To test on mobile devices:"
echo "1. Connect to the same WiFi network"
echo "2. Visit: https://192.168.0.109:5173"
echo "3. Accept certificate warning"
echo "4. Grant camera/microphone permissions"