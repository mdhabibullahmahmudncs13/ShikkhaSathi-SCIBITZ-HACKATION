#!/bin/bash

# Reset Chrome Permissions Script
echo "🔄 Resetting Chrome permissions for camera access..."

# Method 1: Clear site-specific data
echo "1. Clearing site-specific permissions..."
echo "   Go to: chrome://settings/content/all"
echo "   Search for: 192.168.0.109"
echo "   Delete any entries found"
echo ""

# Method 2: Reset all camera permissions
echo "2. Reset all camera permissions:"
echo "   Go to: chrome://settings/content/camera"
echo "   Click 'Delete all' for blocked sites"
echo ""

# Method 3: Hard reset (nuclear option)
echo "3. Complete Chrome reset (if needed):"
echo "   Close Chrome completely"
echo "   Delete: ~/.config/google-chrome/Default/Preferences"
echo "   Restart Chrome"
echo ""

echo "📋 Manual steps to try:"
echo "1. Open Chrome incognito mode (Ctrl+Shift+N)"
echo "2. Go to: https://192.168.0.109:5174"
echo "3. Accept certificate warning"
echo "4. Test camera access"
echo ""

echo "🎯 If camera works in incognito:"
echo "   The issue is with saved permissions in normal mode"
echo "   Clear Chrome data or use incognito for now"
echo ""

echo "❌ If camera doesn't work in incognito:"
echo "   The issue is system-level or hardware-related"
echo "   Check if other apps can use the camera"