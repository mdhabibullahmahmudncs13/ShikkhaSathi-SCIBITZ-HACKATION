# Camera Permission Reset Guide

## 🎯 Problem: Browser not asking for camera permission

When the browser doesn't show a permission prompt, it usually means permissions were previously denied and the browser is remembering that decision.

## 🔧 Step-by-Step Fix

### Step 1: Test Camera Access Independently

1. **Open the camera test page**:
   ```bash
   # Open this file in your browser
   file:///path/to/ShikkhaSathi/test-camera.html
   ```
   Or simply double-click `test-camera.html` to open it in your browser.

2. **Click "Test Camera"** and see what happens:
   - ✅ **Permission prompt appears**: Camera works, issue is with the app
   - ❌ **No prompt, immediate error**: Browser permissions are blocked
   - ❌ **"NotFoundError"**: No camera detected
   - ❌ **"NotAllowedError"**: Permissions denied

### Step 2: Reset Browser Permissions

#### For Chrome:
1. **Method 1 - Site Settings**:
   - Click the **lock icon** (🔒) in address bar
   - Click **"Site settings"**
   - Set Camera and Microphone to **"Allow"**
   - Refresh the page

2. **Method 2 - Chrome Settings**:
   - Go to `chrome://settings/content/camera`
   - Find your site in the "Block" list
   - Click the **trash icon** to remove it
   - Go to `chrome://settings/content/microphone`
   - Remove your site from "Block" list
   - Refresh the page

3. **Method 3 - Clear Site Data**:
   - Press `F12` to open DevTools
   - Right-click the **refresh button**
   - Select **"Empty Cache and Hard Reload"**
   - Or go to `chrome://settings/content/all` and find your site

#### For Firefox:
1. **Address Bar Method**:
   - Click the **shield icon** in address bar
   - Click **"Turn off Blocking for This Site"**
   - Refresh the page

2. **Firefox Settings**:
   - Go to `about:preferences#privacy`
   - Scroll to **"Permissions"**
   - Click **"Settings"** next to Camera/Microphone
   - Remove your site from the list
   - Refresh the page

#### For Safari:
1. **Safari Preferences**:
   - Go to **Safari → Preferences → Websites**
   - Select **Camera** and **Microphone**
   - Set permissions to **"Ask"** or **"Allow"**
   - Refresh the page

### Step 3: Check for Conflicting Applications

**Close applications that might be using the camera**:
- Zoom, Teams, Skype, Discord
- OBS, Streamlabs, or streaming software
- Other browser tabs with camera access
- Video recording software

**On Windows**:
```cmd
# Check which processes are using the camera
tasklist /fi "imagename eq chrome.exe"
tasklist /fi "imagename eq zoom.exe"
```

**On Linux**:
```bash
# Check camera usage
lsof /dev/video0
# Or check running processes
ps aux | grep -E "(zoom|teams|chrome)"
```

**On macOS**:
```bash
# Check camera usage
lsof | grep -i camera
```

### Step 4: Test Different Access Methods

1. **Try localhost**:
   ```
   http://localhost:5173
   ```

2. **Try HTTPS**:
   ```bash
   ./start-frontend-https.sh
   # Then access: https://192.168.0.109:5173
   ```

3. **Try incognito/private mode**:
   - Open browser in incognito/private mode
   - This bypasses saved permissions
   - Test camera access

### Step 5: Advanced Troubleshooting

#### Check Browser Console
1. Press `F12` to open DevTools
2. Go to **Console** tab
3. Look for error messages when trying to access camera
4. Common errors:
   - `NotAllowedError`: Permission denied
   - `NotFoundError`: No camera found
   - `NotReadableError`: Camera in use by another app
   - `OverconstrainedError`: Camera doesn't support requested settings

#### Test with Different Constraints
```javascript
// Test in browser console
navigator.mediaDevices.getUserMedia({
  video: { width: 640, height: 480 },
  audio: true
}).then(stream => {
  console.log('Success:', stream);
}).catch(error => {
  console.log('Error:', error.name, error.message);
});
```

#### Check Available Devices
```javascript
// Test in browser console
navigator.mediaDevices.enumerateDevices().then(devices => {
  console.log('Available devices:', devices);
  devices.forEach(device => {
    console.log(device.kind, device.label);
  });
});
```

## 🚀 Quick Reset Commands

### Complete Browser Reset (Chrome)
```bash
# Close Chrome completely
pkill chrome

# Clear Chrome data (Linux)
rm -rf ~/.config/google-chrome/Default/Preferences

# Restart Chrome
google-chrome
```

### Test Camera System-Wide (Linux)
```bash
# Test camera with system tools
cheese  # Camera app
# or
ffplay /dev/video0  # Direct camera test
```

## 📋 Troubleshooting Checklist

- [ ] Camera test page shows permission prompt
- [ ] No other applications using camera
- [ ] Browser permissions reset for the site
- [ ] Tried incognito/private mode
- [ ] Tested with localhost
- [ ] Tested with HTTPS
- [ ] Browser console shows no errors
- [ ] Camera works in other applications

## 🎯 Expected Results After Fix

### Before Fix:
```
❌ No permission prompt
❌ "Camera access denied" message
❌ Browser console shows NotAllowedError
```

### After Fix:
```
✅ Permission prompt appears
✅ Camera access granted
✅ Video preview shows in interface
✅ Full WebRTC functionality works
```

## 📞 If Nothing Works

1. **Try a different browser** (Firefox, Edge, Safari)
2. **Update your browser** to the latest version
3. **Check system camera permissions** (Windows/macOS)
4. **Test with a different camera** (USB webcam)
5. **Restart your computer** (clears camera locks)

The camera permission issue should be resolved after following these steps!