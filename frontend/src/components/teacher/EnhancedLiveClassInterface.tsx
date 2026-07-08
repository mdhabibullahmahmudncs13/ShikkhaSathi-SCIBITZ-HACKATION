import React, { useState, useEffect, useRef } from 'react';
import { 
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  MessageCircle,
  Monitor,
  MonitorSpeaker,
  PhoneOff,
  Send,
  Settings,
  MoreVertical,
  Info,
  Loader,
  AlertCircle,
  Hand
} from 'lucide-react';
import webRTCService, { Participant, ChatMessage, WebRTCService } from '../../services/webRTCService';

interface EnhancedLiveClassInterfaceProps {
  classInfo: {
    id: string;
    name: string;
    subject: string;
    student_count: number;
  };
}

const EnhancedLiveClassInterface: React.FC<EnhancedLiveClassInterfaceProps> = ({ classInfo }) => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isClassStarted, setIsClassStarted] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true); // New state for video capability
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  
  // Video refs for displaying streams
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Ensure video element gets the stream when localStream changes
  useEffect(() => {
    console.log('🔄 useEffect triggered - localStream changed:', !!localStream);
    
    if (localStream && localVideoRef.current) {
      // Check if video element already has the stream
      if (localVideoRef.current.srcObject !== localStream) {
        console.log('🔗 Reconnecting stream to video element via useEffect...');
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.muted = true;
        
        // Ensure video plays
        localVideoRef.current.play()
          .then(() => {
            console.log('✅ Video playing via useEffect');
            console.log('📹 Video dimensions via useEffect:', localVideoRef.current?.videoWidth, 'x', localVideoRef.current?.videoHeight);
          })
          .catch((error) => {
            console.error('❌ Video play failed via useEffect:', error);
          });
      } else {
        console.log('✅ Video element already has the correct stream');
      }
    } else if (!localStream && localVideoRef.current?.srcObject) {
      console.log('⚠️ localStream is null but video element still has stream');
    }
  }, [localStream]);

  // Periodic check to ensure video stream stays connected
  useEffect(() => {
    if (!localStream) return;

    const checkVideoConnection = () => {
      if (localStream && localVideoRef.current) {
        if (!localVideoRef.current.srcObject) {
          console.log('🚨 Video stream disconnected! Reconnecting...');
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.muted = true;
          localVideoRef.current.play().catch(console.error);
        }
      }
    };

    // Check every 2 seconds
    const interval = setInterval(checkVideoConnection, 2000);
    
    return () => clearInterval(interval);
  }, [localStream]);

  // Check camera permissions
  const checkCameraPermissions = async () => {
    try {
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log('📷 Camera permission status:', permissions.state);
      return permissions.state;
    } catch (error) {
      console.log('📷 Camera permissions API not supported');
      return 'unknown';
    }
  };

  useEffect(() => {
    // Setup WebRTC event handlers
    webRTCService.setEventHandlers({
      onParticipantJoined: (participant: Participant) => {
        console.log('Participant joined:', participant.name);
        setParticipants(prev => [...prev.filter(p => p.id !== participant.id), participant]);
        setConnectionStatus('connected');
      },
      onParticipantLeft: (participantId: string) => {
        console.log('Participant left:', participantId);
        setParticipants(prev => prev.filter(p => p.id !== participantId));
        // Clean up video element
        const videoElement = remoteVideoRefs.current.get(participantId);
        if (videoElement) {
          videoElement.srcObject = null;
          remoteVideoRefs.current.delete(participantId);
        }
      },
      onStreamReceived: (participantId: string, stream: MediaStream) => {
        console.log('Stream received from:', participantId);
        // Display remote stream in video element
        const videoElement = remoteVideoRefs.current.get(participantId);
        if (videoElement) {
          videoElement.srcObject = stream;
          videoElement.play().catch(console.error);
        }
      },
      onChatMessage: (message: ChatMessage) => {
        setChatMessages(prev => [...prev, message]);
      },
      onError: (errorMessage: string) => {
        setError(errorMessage);
        setConnectionStatus('disconnected');
        console.error('WebRTC Error:', errorMessage);
      }
    });

    // Initialize camera preview
    const initCameraPreview = async () => {
      try {
        console.log('🎥 Initializing camera preview...');
        
        // Check camera permissions first
        const permissionStatus = await checkCameraPermissions();
        console.log('📷 Permission status:', permissionStatus);
        
        if (permissionStatus === 'denied') {
          setError('Camera access denied. Please allow camera access in your browser settings.');
          return;
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: 'user'
          }, 
          audio: false 
        });
        
        console.log('✅ Camera stream obtained:', stream);
        console.log('📹 Video tracks:', stream.getVideoTracks());
        
        // Set the stream to state first
        setLocalStream(stream);
        console.log('🔗 Stream set to state, now connecting to video element...');
        
        if (localVideoRef.current) {
          console.log('🎯 Video element found, connecting stream...');
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true; // Ensure muted for local video
          
          // Log the connection
          console.log('📺 Video srcObject set:', localVideoRef.current.srcObject);
          
          // Wait for video to be ready and force play
          localVideoRef.current.onloadedmetadata = () => {
            console.log('📹 Video metadata loaded, starting playback...');
            if (localVideoRef.current) {
              console.log('📹 Video ready state:', localVideoRef.current.readyState);
              localVideoRef.current.play()
                .then(() => {
                  console.log('✅ Video playback started successfully');
                  console.log('📹 Final video dimensions:', localVideoRef.current?.videoWidth, 'x', localVideoRef.current?.videoHeight);
                })
                .catch((error) => {
                  console.error('❌ Video playback failed:', error);
                  // Try to play again after a short delay
                  setTimeout(() => {
                    localVideoRef.current?.play().catch(console.error);
                  }, 100);
                });
            }
          };
          
          // Also try to play immediately if metadata is already loaded
          if (localVideoRef.current.readyState >= 1) {
            console.log('📹 Metadata already loaded, playing immediately...');
            localVideoRef.current.play().catch(console.error);
          }
          
          console.log('✅ Camera preview initialized successfully');
        } else {
          console.warn('⚠️ Local video ref not available');
        }
      } catch (error) {
        console.error('❌ Camera preview error:', error);
        let errorMessage = 'Camera access failed';
        
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            errorMessage = 'Camera access denied. Please allow camera access and refresh the page.';
          } else if (error.name === 'NotFoundError') {
            errorMessage = 'No camera found. Please connect a camera and try again.';
          } else if (error.name === 'NotReadableError') {
            errorMessage = 'Camera is being used by another application. Please close other apps and try again.';
          } else {
            errorMessage = `Camera error: ${error.message}`;
          }
        }
        
        setError(errorMessage);
      }
    };

    initCameraPreview();

    return () => {
      // Cleanup on unmount
      webRTCService.disconnect();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startClass = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setConnectionStatus('connecting');

      // Check browser compatibility with detailed reporting
      const browserInfo = WebRTCService.getBrowserInfo();
      console.log('🔍 Browser compatibility info:', browserInfo);
      
      if (!browserInfo.isSupported) {
        // Check if this is a development environment issue
        const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        const hasMediaIssues = browserInfo.missingFeatures.includes('mediaDevices') || browserInfo.missingFeatures.includes('getUserMedia');
        
        if (isDevelopment && hasMediaIssues) {
          console.warn('⚠️ Media devices not available - this might be due to:');
          console.warn('1. Browser permissions not granted');
          console.warn('2. HTTPS required for media access');
          console.warn('3. Secure context requirements');
          console.warn('Context:', browserInfo.context);
          
          // Try to continue anyway in development
          setError(`⚠️ Camera/microphone access limited in development.\nContext: ${browserInfo.context}\nTrying to continue...`);
          
          // Continue with limited functionality
          setIsVideoEnabled(false);
          setConnectionStatus('connected');
          setIsConnecting(false);
          return;
        }
        
        const errorMessage = `Video conferencing is not fully supported in your browser (${browserInfo.browser}).\n\n` +
          `Missing features: ${browserInfo.missingFeatures.join(', ')}\n` +
          `Context: ${browserInfo.context}\n\n` +
          `For best experience, please use:\n` +
          `• Chrome (recommended)\n` +
          `• Firefox\n` +
          `• Safari\n` +
          `• Edge\n\n` +
          `You can still use the class without video features.`;
        
        // Show warning but allow continuing without video
        console.warn(errorMessage);
        setError(errorMessage);
        
        // Continue with class setup but disable video features
        setIsVideoEnabled(false);
        setConnectionStatus('connected');
        setIsConnecting(false);
        return;
      }

      // Get user media first for preview
      try {
        console.log('🎥 Attempting to access camera and microphone...');
        const stream = await webRTCService.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(console.error);
          setLocalStream(stream);
        }
        console.log('✅ Media access successful');
      } catch (mediaError: any) {
        console.error('❌ Media access error:', mediaError);
        
        // Provide specific guidance based on error type
        let errorMessage = 'Could not access camera or microphone. ';
        
        if (mediaError.name === 'NotAllowedError') {
          errorMessage += 'Please allow camera and microphone permissions in your browser and try again.';
        } else if (mediaError.name === 'NotFoundError') {
          errorMessage += 'No camera or microphone found. Please connect a camera/microphone and try again.';
        } else if (mediaError.name === 'NotSupportedError') {
          errorMessage += 'Your browser does not support camera/microphone access.';
        } else if (mediaError.name === 'NotReadableError') {
          errorMessage += 'Camera or microphone is already in use by another application.';
        } else {
          errorMessage += `Error: ${mediaError.message || 'Unknown error'}`;
        }
        
        // In development, provide additional context
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
          errorMessage += '\n\n🔧 Development Tips:\n';
          errorMessage += '• Make sure you\'re using HTTPS or localhost\n';
          errorMessage += '• Check browser permissions (click the camera icon in address bar)\n';
          errorMessage += '• Try refreshing the page\n';
          errorMessage += '• Check if another tab is using the camera';
        }
        
        throw new Error(errorMessage);
      }

      // Initialize WebRTC service
      const result = await webRTCService.initialize({
        roomId: classInfo.id,
        userId: '2', // teacher ID
        userName: 'Teacher One',
        isTeacher: true,
        signalServerUrl: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8001`
      });

      if (!result.success) {
        throw new Error((result as any).error || 'Failed to initialize video conferencing');
      }

      setIsClassStarted(true);
      setConnectionStatus('connected');
    } catch (error: any) {
      setError(error.message);
      setConnectionStatus('disconnected');
      console.error('Failed to start class:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const endClass = async () => {
    try {
      console.log('🛑 Ending class - clearing video streams...');
      
      // Disconnect from WebRTC session
      webRTCService.disconnect();
      
      // Reset state
      setIsClassStarted(false);
      setParticipants([]);
      setChatMessages([]);
      setLocalStream(null);
      
      // Clear video elements
      if (localVideoRef.current) {
        console.log('🧹 Clearing local video srcObject');
        localVideoRef.current.srcObject = null;
      }
      remoteVideoRefs.current.clear();
      
      console.log('Class ended successfully');
    } catch (error) {
      console.error('Error ending class:', error);
    }
  };

  const toggleVideo = () => {
    const newVideoState = webRTCService.toggleVideo();
    setIsVideoOn(newVideoState);
  };

  const toggleAudio = () => {
    const newAudioState = webRTCService.toggleAudio();
    setIsAudioOn(newAudioState);
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await webRTCService.startScreenShare();
        if (screenStream) {
          setIsScreenSharing(true);
          // Update local video to show screen share
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = screenStream;
          }
        }
      } else {
        await webRTCService.stopScreenShare();
        setIsScreenSharing(false);
        // Restore camera stream
        const cameraStream = webRTCService.getLocalStream();
        if (cameraStream && localVideoRef.current) {
          localVideoRef.current.srcObject = cameraStream;
        }
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      setError('Failed to share screen. Please try again.');
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      webRTCService.sendChatMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  // Error display component
  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Connection Error</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsClassStarted(false);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Pre-class setup screen
  if (!isClassStarted) {
    return (
      <div className="text-center py-8">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Video className="w-12 h-12 text-green-600" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Start Live Class?</h3>
        <p className="text-gray-600 mb-6">
          {classInfo.name} • {classInfo.subject}
        </p>
        
        {/* Camera Preview or Fallback */}
        <div className="bg-gray-900 rounded-lg w-64 h-48 mx-auto mb-6 relative overflow-hidden">
          {isVideoEnabled ? (
            <>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {!localStream && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Camera Preview</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl font-bold">
                    {classInfo.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-white text-sm">Audio-Only Mode</p>
                <p className="text-gray-400 text-xs">Video not available</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-6 max-w-md mx-auto">
          <h4 className="font-semibold text-gray-900 mb-4">System Status</h4>
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                isVideoEnabled ? 'bg-green-500' : 'bg-yellow-500'
              }`}>
                <span className="text-white text-xs">
                  {isVideoEnabled ? '✓' : '!'}
                </span>
              </div>
              <span className="text-sm text-gray-700">
                {isVideoEnabled ? 'Video conferencing supported' : 'Audio-only mode (video not supported)'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm text-gray-700">Internet connection stable</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm text-gray-700">Class interface ready</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 justify-center mb-6">
          <button
            onClick={toggleVideo}
            disabled={!isVideoEnabled}
            className={`p-3 rounded-lg transition-colors ${
              !isVideoEnabled 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : isVideoOn 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            title={!isVideoEnabled ? 'Video not available in this browser' : isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-lg transition-colors ${
              isAudioOn 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
        </div>
        
        <button
          onClick={startClass}
          disabled={isConnecting}
          className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Video className="w-5 h-5" />
              Start Live Class
            </>
          )}
        </button>
      </div>
    );
  }

  // Main live class interface - Google Meet style
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h1 className="text-white text-lg font-medium">{classInfo?.name || 'Live Class'}</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-400 text-sm font-medium">LIVE</span>
            <span className="text-gray-400 text-sm">• {participants.length + 1} participants</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
            connectionStatus === 'connected' ? 'bg-green-900 text-green-300' :
            connectionStatus === 'connecting' ? 'bg-yellow-900 text-yellow-300' :
            'bg-red-900 text-red-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-400' :
              connectionStatus === 'connecting' ? 'bg-yellow-400' :
              'bg-red-400'
            }`}></div>
            {connectionStatus === 'connected' ? 'Connected' :
             connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </div>
          
          {/* Meeting Info */}
          <button className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors">
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Video Grid Area */}
        <div className="flex-1 p-4">
          <div className="h-full grid grid-cols-1 gap-4">
            {/* Main Speaker View */}
            <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                onLoadedMetadata={() => {
                  console.log('📹 Video element metadata loaded');
                  if (localVideoRef.current) {
                    console.log('📹 Video dimensions:', localVideoRef.current.videoWidth, 'x', localVideoRef.current.videoHeight);
                    console.log('📹 Video ready state:', localVideoRef.current.readyState);
                  }
                }}
                onCanPlay={() => {
                  console.log('📹 Video can play');
                }}
                onPlay={() => {
                  console.log('📹 Video started playing');
                }}
                onError={(e) => {
                  console.error('📹 Video element error:', e);
                }}
              />
              
              {/* Video Overlay Info */}
              <div className="absolute bottom-4 left-4 flex items-center gap-3">
                <div className="bg-black bg-opacity-60 backdrop-blur-sm px-3 py-2 rounded-lg">
                  <span className="text-white text-sm font-medium">You</span>
                </div>
                {localStream && (
                  <div className="bg-green-500 bg-opacity-90 px-2 py-1 rounded text-xs text-white font-medium">
                    Camera Active
                  </div>
                )}
              </div>

              {/* Audio/Video Status Indicators */}
              <div className="absolute top-4 right-4 flex gap-2">
                {!isVideoOn && (
                  <div className="bg-red-500 p-2 rounded-full">
                    <VideoOff className="w-4 h-4 text-white" />
                  </div>
                )}
                {!isAudioOn && (
                  <div className="bg-red-500 p-2 rounded-full">
                    <MicOff className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              
              {/* Camera Troubleshooting Overlay */}
              {!localStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <VideoOff className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-white text-xl font-semibold mb-2">Camera not available</h3>
                    <p className="text-gray-400 text-sm mb-6 max-w-sm">
                      Please allow camera access or check if your camera is being used by another application
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          const stream = await navigator.mediaDevices.getUserMedia({ 
                            video: { facingMode: 'user' }, 
                            audio: false 
                          });
                          if (localVideoRef.current) {
                            localVideoRef.current.srcObject = stream;
                            localVideoRef.current.play().catch(console.error);
                            setLocalStream(stream);
                          }
                        } catch (error) {
                          console.error('Camera access failed:', error);
                          setError(`Camera access failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Enable Camera
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Participants Grid */}
            {participants.length > 0 && (
              <div className="grid grid-cols-4 gap-3 max-h-32">
                {participants.map((participant) => (
                  <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                    <video
                      ref={(el) => {
                        if (el) {
                          remoteVideoRefs.current.set(participant.id, el);
                        }
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                      {participant.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Chat/Participants */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-gray-700">
            <button 
              onClick={() => setShowChat(true)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                showChat 
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-750' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Chat
            </button>
            <button 
              onClick={() => setShowChat(false)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                !showChat 
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-750' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              People ({participants.length + 1})
            </button>
          </div>

          {/* Chat Messages */}
          {showChat ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((message, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {message.senderName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-sm font-medium">{message.senderName}</span>
                        <span className="text-gray-400 text-xs">{message.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{message.message}</p>
                    </div>
                  </div>
                ))}
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No messages yet</p>
                    <p className="text-gray-500 text-xs">Start the conversation!</p>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Send a message..."
                    className="flex-1 bg-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newMessage.trim()) {
                        sendMessage();
                      }
                    }}
                  />
                  <button 
                    onClick={sendMessage}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Participants List */
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Teacher (self) */}
              <div className="flex items-center justify-between p-3 bg-blue-900 bg-opacity-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">T</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      You (Host)
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  {isVideoOn ? (
                    <Video className="w-4 h-4 text-green-400" />
                  ) : (
                    <VideoOff className="w-4 h-4 text-gray-400" />
                  )}
                  
                  {isAudioOn ? (
                    <Mic className="w-4 h-4 text-green-400" />
                  ) : (
                    <MicOff className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
              
              {/* Students */}
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {participant.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {participant.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {participant.isHandRaised && (
                      <div className="p-1 text-yellow-400">
                        <Hand className="w-4 h-4" />
                      </div>
                    )}
                    
                    <div className="flex gap-1">
                      {participant.isVideoEnabled ? (
                        <Video className="w-4 h-4 text-green-400" />
                      ) : (
                        <VideoOff className="w-4 h-4 text-gray-400" />
                      )}
                      
                      {participant.isAudioEnabled ? (
                        <Mic className="w-4 h-4 text-green-400" />
                      ) : (
                        <MicOff className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {participants.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No students joined yet</p>
                  <p className="text-gray-500 text-xs">Waiting for participants...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Center Controls */}
          <div className="flex items-center gap-3">
            {/* Microphone */}
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full transition-all duration-200 ${
                isAudioOn 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Camera */}
            <button
              onClick={toggleVideo}
              disabled={!isVideoEnabled}
              className={`p-4 rounded-full transition-all duration-200 ${
                !isVideoEnabled 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : isVideoOn 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              title={!isVideoEnabled ? 'Camera not available' : isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* Screen Share */}
            <button
              onClick={toggleScreenShare}
              className={`p-4 rounded-full transition-all duration-200 ${
                isScreenSharing 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              {isScreenSharing ? <MonitorSpeaker className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </button>

            {/* End Call */}
            <button
              onClick={endClass}
              className="p-4 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all duration-200"
              title="End class"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedLiveClassInterface;