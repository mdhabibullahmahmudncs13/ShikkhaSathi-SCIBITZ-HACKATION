# ShikkhaSathi Network Access Guide

## 🌐 Access from Other Devices on Your Network

ShikkhaSathi is now configured to be accessible from other devices on your local network!

### 📱 **Access URLs for Other Devices**

**Your Network IP:** `192.168.0.109`

| Service | URL for Other Devices | Description |
|---------|----------------------|-------------|
| **Frontend App** | http://192.168.0.109:5173 | Main ShikkhaSathi application |
| **Backend API** | http://192.168.0.109:8000 | API server |
| **API Documentation** | http://192.168.0.109:8000/docs | Interactive API docs |
| **WebSocket Server** | ws://192.168.0.109:8001 | Live class signaling |

### 📋 **How to Access from Other Devices**

#### **Step 1: Connect to Same Network**
- Ensure your other device (phone, tablet, laptop) is connected to the same WiFi network
- Both devices must be on the same local network (same router)

#### **Step 2: Open Browser on Other Device**
- Open any modern web browser (Chrome, Firefox, Safari, Edge)
- Navigate to: **http://192.168.0.109:5173**

#### **Step 3: Login and Use**
- Use the same test accounts:
  - **Teacher**: `teacher1@example.com` / `password123`
  - **Student**: `student1@example.com` / `password123`
  - **Parent**: `parent1@example.com` / `password123`
  - **Admin**: `admin@example.com` / `password123`

### 🎥 **Live Class Testing Across Devices**

**Perfect for testing the live class system:**

1. **Device 1 (Teacher)**: 
   - Go to http://192.168.0.109:5173
   - Login as teacher
   - Start a live class

2. **Device 2 (Student)**:
   - Go to http://192.168.0.109:5173
   - Login as student
   - Join the live class

3. **Test Real-time Features**:
   - Video/audio streaming between devices
   - Real-time chat
   - Hand raising
   - Screen sharing (teacher)

### 🔧 **Technical Configuration**

**Services Running:**
- **Backend**: Bound to `0.0.0.0:8000` (accepts all network connections)
- **Frontend**: Vite dev server with `--host 0.0.0.0` (network accessible)
- **WebSocket**: Bound to `0.0.0.0:8001` (accepts all network connections)

**CORS Configuration:**
- Configured to allow connections from network IPs
- Supports cross-origin requests from other devices

**WebRTC Configuration:**
- Updated to use network IP for signaling server
- Supports peer-to-peer connections across devices

### 📱 **Mobile Device Access**

**Works great on mobile devices:**
- **iOS Safari**: Full support for video conferencing
- **Android Chrome**: Complete functionality
- **Mobile browsers**: Responsive design adapts to screen size

**PWA Features:**
- Can be installed as an app on mobile devices
- Offline functionality when network is unavailable
- Native app-like experience

### 🛡️ **Security Notes**

**Development Mode:**
- This configuration is for development/testing only
- CORS is set to allow all origins (`*`) for easy testing
- Not recommended for production use

**Network Security:**
- Only accessible within your local network
- External internet users cannot access the application
- Firewall should block external access to these ports

### 🔍 **Troubleshooting**

**If you can't access from other devices:**

1. **Check Network Connection**:
   - Ensure both devices are on same WiFi network
   - Try pinging: `ping 192.168.0.109`

2. **Check Firewall**:
   - Temporarily disable firewall on host computer
   - Or add exceptions for ports 5173, 8000, 8001

3. **Verify Services**:
   - Check that all services are running
   - Look for "Network:" URLs in terminal output

4. **Try Alternative IP**:
   - If you see multiple network IPs, try: http://192.168.0.107:5173

### 🎯 **Use Cases**

**Perfect for:**
- **Multi-device testing**: Test teacher and student interfaces simultaneously
- **Live class demos**: Show real video conferencing between devices
- **Mobile testing**: Test responsive design on phones/tablets
- **Family sharing**: Multiple family members can access on their devices
- **Classroom simulation**: Multiple students joining from different devices

### 📞 **Support**

**If you need help:**
- Check the terminal output for any error messages
- Ensure all three services are running (Backend, Frontend, WebSocket)
- Verify your network IP hasn't changed: `hostname -I`

---

**🎉 Enjoy using ShikkhaSathi across all your devices!**

The complete live class system with real-time video conferencing is now accessible from any device on your network.