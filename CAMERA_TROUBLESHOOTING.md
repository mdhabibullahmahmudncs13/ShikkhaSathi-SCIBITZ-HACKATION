# Camera Not Showing - Troubleshooting Guide 📹

## Quick Fixes to Try:

### 1. **Check Browser Permissions** 🔒
- Look for a camera icon in your browser's address bar
- Click on it and select "Allow" for camera access
- If you see "Blocked" or "Denied", click and change to "Allow"
- Refresh the page after changing permissions

### 2. **Check if Camera is Being Used** 📱
- Close other applications that might be using your camera:
  - Zoom, Teams, Skype, Discord
  - Other browser tabs with video calls
  - Camera apps, OBS, or streaming software
- Try refreshing the page after closing other apps

### 3. **Browser-Specific Solutions** 🌐

#### **Chrome:**
1. Click the lock icon next to the URL
2. Set Camera to "Allow"
3. Refresh the page

#### **Firefox:**
1. Click the shield icon in the address bar
2. Turn off "Enhanced Tracking Protection" for this site
3. Allow camera access when prompted

#### **Safari:**
1. Go to Safari > Preferences > Websites > Camera
2. Set the site to "Allow"
3. Refresh the page

### 4. **System-Level Checks** 💻

#### **Windows:**
1. Press Windows + I → Privacy & Security → Camera
2. Make sure "Camera access" is turned on
3. Allow desktop apps to access camera

#### **macOS:**
1. Apple Menu → System Preferences → Security & Privacy → Camera
2. Check the box next to your browser
3. Restart the browser

#### **Linux:**
1. Check if camera is detected: `lsusb | grep -i camera`
2. Test camera: `cheese` or `guvcview`
3. Check browser permissions

### 5. **Hardware Checks** 🔧
- Make sure your camera is properly connected
- Try unplugging and reconnecting USB cameras
- Check if camera works in other applications
- Ensure camera drivers are installed and updated

### 6. **Browser Console Debugging** 🛠️
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Look for camera-related error messages:
   - `NotAllowedError`: Permission denied
   - `NotFoundError`: No camera detected
   - `NotReadableError`: Camera in use by another app

## What You Should See:

### **Working Camera:**
- Video preview in the live class interface
- Console messages: "✅ Camera stream obtained"
- Camera controls (on/off) working properly

### **Camera Issues:**
- Black screen or gradient background
- "Camera Not Available" message
- Console errors about camera access

## Still Not Working?

### **Try These Advanced Steps:**
1. **Clear browser cache and cookies**
2. **Disable browser extensions** (especially privacy/security ones)
3. **Try incognito/private browsing mode**
4. **Update your browser** to the latest version
5. **Restart your computer**

### **Alternative Browsers:**
If camera doesn't work in your current browser, try:
- Chrome (recommended for WebRTC)
- Firefox
- Edge
- Safari (on macOS)

## Common Error Messages:

| Error | Meaning | Solution |
|-------|---------|----------|
| `NotAllowedError` | Permission denied | Allow camera access in browser |
| `NotFoundError` | No camera detected | Check camera connection |
| `NotReadableError` | Camera in use | Close other apps using camera |
| `OverconstrainedError` | Camera doesn't support requested format | Try different browser |

## Need More Help?

1. **Check browser console** (F12) for specific error messages
2. **Try the "Try Again" button** in the camera troubleshooting overlay
3. **Refresh the page** and allow permissions when prompted
4. **Test camera** in other websites (e.g., webcamtests.com)

---

**Most Common Solution:** Allow camera permissions in your browser and refresh the page! 🎯