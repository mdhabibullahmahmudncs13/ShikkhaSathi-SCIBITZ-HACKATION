# Video Display Debug Fix

## Issue Identified
Camera is working (camera light is on), but video feed is not displaying in the UI. The video area shows a purple/dark background instead of the camera feed.

## Debugging Steps Applied

### 1. Added Video Element Event Listeners
Added comprehensive logging to track video element state:
```typescript
onLoadedMetadata={() => {
  console.log('📹 Video element metadata loaded');
  if (localVideoRef.current) {
    console.log('📹 Video dimensions:', localVideoRef.current.videoWidth, 'x', localVideoRef.current.videoHeight);
    console.log('📹 Video ready state:', localVideoRef.current.readyState);
  }
}}
onCanPlay={() => console.log('📹 Video can play'); }}
onPlay={() => console.log('📹 Video started playing'); }}
onError={(e) => console.error('📹 Video element error:', e); }}
```

### 2. Improved Video Stream Connection
Enhanced the camera initialization to ensure proper video playback:
```typescript
// Wait for video to be ready and force play
localVideoRef.current.onloadedmetadata = () => {
  console.log('📹 Video metadata loaded, starting playback...');
  if (localVideoRef.current) {
    localVideoRef.current.play()
      .then(() => console.log('✅ Video playback started successfully'))
      .catch((error) => {
        console.error('❌ Video playback failed:', error);
        // Retry after short delay
        setTimeout(() => {
          localVideoRef.current?.play().catch(console.error);
        }, 100);
      });
  }
};

// Also try to play immediately if metadata is already loaded
if (localVideoRef.current.readyState >= 1) {
  localVideoRef.current.play().catch(console.error);
}
```

### 3. Added Visual Status Indicator
Added a green indicator when camera stream is active:
```typescript
{localStream && (
  <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
    📹 Camera Active
  </div>
)}
```

## Common Causes of Video Display Issues

### 1. **Stream Not Connected**
- Camera permission granted but stream not assigned to video element
- Check: `localVideoRef.current.srcObject` should contain MediaStream

### 2. **Video Element Not Playing**
- Stream connected but video element not started
- Check: Video element `play()` method called successfully

### 3. **CSS Display Issues**
- Video element hidden by CSS or z-index issues
- Check: Video element has proper dimensions and visibility

### 4. **Browser Autoplay Restrictions**
- Browser blocking video autoplay
- Solution: User interaction required or muted video

## Debugging Console Commands

### Check Video Element State:
```javascript
// In browser console
const video = document.querySelector('video');
console.log('Video element:', video);
console.log('Video srcObject:', video?.srcObject);
console.log('Video readyState:', video?.readyState);
console.log('Video paused:', video?.paused);
console.log('Video dimensions:', video?.videoWidth, 'x', video?.videoHeight);
```

### Check MediaStream:
```javascript
// Check if stream has video tracks
const stream = video?.srcObject;
console.log('Stream:', stream);
console.log('Video tracks:', stream?.getVideoTracks());
console.log('Track enabled:', stream?.getVideoTracks()[0]?.enabled);
console.log('Track ready state:', stream?.getVideoTracks()[0]?.readyState);
```

### Force Video Play:
```javascript
// Try to manually start video
video?.play().then(() => {
  console.log('✅ Video playing');
}).catch(error => {
  console.error('❌ Video play failed:', error);
});
```

## Expected Console Output

### When Working Correctly:
```
🎥 Initializing camera preview...
📷 Camera permission status: granted
✅ Camera stream obtained: MediaStream
📹 Video tracks: [MediaStreamTrack]
📹 Video metadata loaded, starting playback...
📹 Video element metadata loaded
📹 Video dimensions: 640 x 480
📹 Video ready state: 4
📹 Video can play
📹 Video started playing
✅ Video playback started successfully
✅ Camera preview initialized successfully
```

### When Not Working:
Look for missing logs or error messages in the sequence above.

## Next Steps for User

1. **Refresh the page** and try starting the live class again
2. **Check browser console** for the new debug logs
3. **Look for the green "📹 Camera Active" indicator** in the top-left of the video area
4. **If still not working**, run the console debugging commands above

## Files Modified
- `frontend/src/components/teacher/EnhancedLiveClassInterface.tsx` - Added video debugging and improved stream handling

The enhanced debugging should help identify exactly where the video display is failing.