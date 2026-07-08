# Camera Access Fix - Complete Guide

## 🎯 Problem: "Camera access denied. Please allow camera access in your browser settings."

This issue occurs because you're accessing the app via HTTP on a network address (`http://192.168.0.109:5173`), and modern browsers require HTTPS for camera/microphone access from non-localhost addresses.

## ✅ Solution 1: Use HTTPS (Recommended)

### Quick Start
```bash
# Start frontend with HTTPS
./start-frontend-https.sh
```

### Manual Steps
1. **Access via HTTPS**: `https://192.168.0.109:5173`
2. **Accept Certificate Warning**:
   - Click "Advanced"
   - Click "Proceed to 192.168.0.109 (unsafe)"
   - This is safe for development
3. **Grant Permissions**: Allow camera and microphone when prompted
4. **✅ Full video functionality should now work!**

## ✅ Solution 2: Use Localhost

### Quick Start
```bash
# Access via localhost instead
http://localhost:5173
```

**Pros**: Works immediately with full camera access
**Cons**: Only accessible from the development machine

## ✅ Solution 3: Manual Browser Permission Fix

### For Chrome
1. Click the **lock/camera icon** in the address bar (left of the URL)
2. Change **Camera** from "Block" to "Allow"
3. Change **Microphone** from "Block" to "Allow"
4. **Refresh the page**

### For Firefox
1. Click the **shield icon** in the address bar
2. Click **"Turn off Blocking for This Site"**
3. Refresh the page and allow permissions when prompted

### For Safari
1. Go to **Safari → Preferences → Websites**
2. Select **Camera** and **Microphone**
3. Set permissions to **"Allow"** for your site
4. Refresh the page

## 🔧 Technical Background

### Why This Happens
- **Security Policy**: Browsers require HTTPS for camera/microphone access on network addresses
- **Localhost Exception**: `localhost` and `127.0.0.1` are exempt from this rule
- **Network Access**: `192.168.x.x` addresses require HTTPS for media device access

### Browser Security Requirements
| Access Method | Camera Access | Notes |
|---------------|---------------|-------|
| `http://localhost:5173` | ✅ Allowed | Localhost exception |
| `http://127.0.0.1:5173` | ✅ Allowed | Localhost exception |
| `http://192.168.0.109:5173` | ❌ Blocked | Network address requires HTTPS |
| `https://192.168.0.109:5173` | ✅ Allowed | HTTPS enables full access |

## 🚀 Recommended Workflow

### For Development
1. **Use HTTPS setup** for full functionality across devices
2. **Accept self-signed certificate** (safe for development)
3. **Grant permissions once** - browser will remember

### For Production
1. **Use proper SSL certificates** from a Certificate Authority
2. **Configure domain name** instead of IP address
3. **Enable HTTPS by default** in production environment

## 📱 Mobile Device Testing

### Setup
1. **Connect mobile to same WiFi**
2. **Visit**: `https://192.168.0.109:5173`
3. **Accept certificate warning**
4. **Grant camera/microphone permissions**
5. **Test video calling functionality**

### Troubleshooting Mobile
- **iOS Safari**: May require additional permission prompts
- **Android Chrome**: Should work like desktop Chrome
- **Network Issues**: Ensure firewall allows connections

## 🔍 Debugging Steps

### Check Current Status
1. **Open browser console** (F12)
2. **Look for WebRTC logs** starting with 🔍
3. **Check context information**: Should show `(secure: true)` for HTTPS

### Test Media Access Directly
```javascript
// Run in browser console to test media access
navigator.mediaDevices.getUserMedia({video: true, audio: true})
  .then(stream => console.log('✅ Media access successful', stream))
  .catch(error => console.log('❌ Media access failed', error));
```

### Verify HTTPS Setup
```bash
# Check if certificates exist
ls -la frontend/certs/

# Should show:
# cert.pem (SSL certificate)
# key.pem (private key)
```

## 🎯 Expected Results After Fix

### Before Fix
```
❌ Camera access denied
❌ Video conferencing limited
❌ Audio-only mode
```

### After Fix
```
✅ Camera access granted
✅ Full video conferencing
✅ Audio + Video + Screen sharing
✅ Mobile device compatibility
```

## 📞 Quick Support Commands

### Regenerate Certificates
```bash
./setup-https-dev.sh
```

### Start with HTTPS
```bash
./start-frontend-https.sh
```

### Check Browser Compatibility
```bash
# Open browser console and check logs for:
# 🔍 Browser compatibility check: Object
# Context should show (secure: true)
```

The camera access issue is now resolved with proper HTTPS setup and clear troubleshooting steps!