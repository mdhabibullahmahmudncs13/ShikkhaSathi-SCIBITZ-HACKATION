import React, { useState, useEffect, useRef } from 'react';
import { 
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  MessageSquare,
  PhoneOff,
  Hand,
  AlertCircle,
  Loader,
  Maximize,
  Minimize
} from 'lucide-react';
import webRTCService, { Participant, ChatMessage, WebRTCService } from '../../services/webRTCService';

interface StudentLiveClassInterfaceProps {
  classInfo: {
    id: string;
    name: string;
    subject: string;
    teacher_name: string;
  };
  onLeave: () => void;
}

const StudentLiveClassInterface: React.FC<StudentLiveClassInterfaceProps> = ({ classInfo, onLeave }) => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isClassJoined, setIsClassJoined] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Video refs for displaying streams
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Setup WebRTC event handlers
    webRTCService.setEventHandlers({
      onParticipantJoined: (participant: Participant) => {
        console.log('Participant joined:', participant.name);
        setParticipants(prev => [...prev.filter(p => p.id !== participant.id), participant]);
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
        console.error('WebRTC Error:', errorMessage);
      }
    });

    // Initialize camera preview
    const initCameraPreview = async () => {
      try {
        // Check if mediaDevices is available before trying to use it
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
          console.log('Camera preview not available: Media devices not supported or HTTPS required');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 }, 
          audio: false 
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(console.error);
          setLocalStream(stream);
        }
      } catch (error) {
        console.log('Camera preview not available:', error);
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

  const joinClass = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Check browser compatibility
      if (!WebRTCService.isSupported()) {
        const browserInfo = WebRTCService.getBrowserInfo();
        const errorMessage = `WebRTC is not supported in your browser.\n\n` +
          `Browser: ${browserInfo.browser}\n` +
          `Missing features: ${browserInfo.missingFeatures.join(', ')}\n` +
          `Context: ${browserInfo.context}\n\n` +
          `Please use Chrome, Firefox, or Safari with HTTPS for full functionality.`;
        throw new Error(errorMessage);
      }

      // Get user media first for preview
      try {
        const stream = await webRTCService.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(console.error);
          setLocalStream(stream);
        }
      } catch (mediaError) {
        console.error('Media access error:', mediaError);
        throw new Error('Could not access camera or microphone. Please check permissions and try again.');
      }

      // Initialize WebRTC service
      const result = await webRTCService.initialize({
        roomId: classInfo.id,
        userId: '1', // student ID
        userName: 'Student One',
        isTeacher: false,
        signalServerUrl: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8001`
      });

      if (!result.success) {
        throw new Error((result as any).error || 'Failed to join live class');
      }

      setIsClassJoined(true);
    } catch (error: any) {
      setError(error.message);
      console.error('Failed to join class:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const leaveClass = async () => {
    try {
      // Disconnect from WebRTC session
      webRTCService.disconnect();
      
      // Reset state
      setIsClassJoined(false);
      setParticipants([]);
      setChatMessages([]);
      setLocalStream(null);
      
      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      remoteVideoRefs.current.clear();
      
      // Call parent onLeave callback
      onLeave();
      
      console.log('Left class successfully');
    } catch (error) {
      console.error('Error leaving class:', error);
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

  const toggleHandRaise = () => {
    const newHandState = !isHandRaised;
    webRTCService.toggleHandRaise(newHandState);
    setIsHandRaised(newHandState);
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      webRTCService.sendChatMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
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
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setError(null);
                setIsClassJoined(false);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onLeave}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-join setup screen
  if (!isClassJoined) {
    return (
      <div className="text-center py-8">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Video className="w-12 h-12 text-blue-600" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Join Live Class?</h3>
        <p className="text-gray-600 mb-2">
          {classInfo.name} • {classInfo.subject}
        </p>
        <p className="text-gray-500 mb-6">
          Teacher: {classInfo.teacher_name}
        </p>
        
        {/* Camera Preview */}
        <div className="bg-gray-900 rounded-lg w-64 h-48 mx-auto mb-6 relative overflow-hidden">
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
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-6 max-w-md mx-auto">
          <h4 className="font-semibold text-gray-900 mb-4">Before Joining</h4>
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm text-gray-700">Camera and microphone ready</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm text-gray-700">Internet connection stable</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <Hand className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm text-gray-700">Raise hand to ask questions</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 justify-center mb-6">
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-lg transition-colors ${
              isVideoOn 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
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
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={onLeave}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={joinClass}
            disabled={isConnecting}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Video className="w-5 h-5" />
                Join Class
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Main live class interface for students
  return (
    <div ref={containerRef} className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-[600px]'} bg-gray-900 rounded-lg overflow-hidden relative`}>
      {/* Main Video Area */}
      <div className="h-full relative">
        {/* Teacher's Main Video (or screen share) */}
        <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center relative">
          {/* Find teacher's video stream */}
          {participants.find(p => p.role === 'teacher') ? (
            <video
              ref={(el) => {
                const teacher = participants.find(p => p.role === 'teacher');
                if (el && teacher) {
                  remoteVideoRefs.current.set(teacher.id, el);
                }
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Waiting for teacher...</p>
              <p className="text-gray-500 text-sm mt-2">Class: {classInfo.name}</p>
            </div>
          )}
          
          {/* Student's Self Video (Picture-in-Picture) - Improved positioning */}
          <div className="absolute bottom-4 right-4 w-36 h-28 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg z-10">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            
            {!isVideoOn && (
              <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                <div className="text-center">
                  <VideoOff className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-gray-400 text-xs">You</p>
                </div>
              </div>
            )}
            
            {/* Audio indicator */}
            <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 rounded p-1">
              {isAudioOn ? (
                <Mic className="w-3 h-3 text-green-400" />
              ) : (
                <MicOff className="w-3 h-3 text-red-400" />
              )}
            </div>
            
            {/* Hand raised indicator */}
            {isHandRaised && (
              <div className="absolute top-1 right-1 bg-yellow-500 rounded-full p-1">
                <Hand className="w-3 h-3 text-white" />
              </div>
            )}
            
            {/* Self label */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 text-center">
              You
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm z-10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              {participants.length + 1} participants
            </div>
          </div>
          
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-colors z-10"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-lg transition-colors ${
                isVideoOn 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-lg transition-colors ${
                isAudioOn 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            
            <button
              onClick={toggleHandRaise}
              className={`p-3 rounded-lg transition-colors ${
                isHandRaised 
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
              title={isHandRaised ? 'Lower hand' : 'Raise hand'}
            >
              <Hand className="w-5 h-5" />
            </button>
          </div>
          
          {/* Center Info */}
          <div className="text-center hidden md:block">
            <p className="text-white font-semibold">{classInfo.name}</p>
            <p className="text-gray-300 text-sm">
              {participants.length + 1} participants • Live
            </p>
          </div>
          
          {/* Right Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="p-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              title="View participants"
            >
              <Users className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              title="Open chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            
            <button
              onClick={leaveClass}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              title="Leave class"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Chat Panel */}
      {showChat && (
        <div className="absolute top-0 right-0 w-80 h-full bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Class Chat</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-medium ${msg.isTeacher ? 'text-blue-600' : 'text-gray-900'}`}>
                    {msg.senderName}
                  </span>
                  <span className="text-gray-500 text-xs">{msg.timestamp.toLocaleTimeString()}</span>
                </div>
                <p className="text-gray-700">{msg.message}</p>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Participants Panel */}
      {showParticipants && (
        <div className="absolute top-0 right-0 w-80 h-full bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              Participants ({participants.length + 1})
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Teacher */}
            {participants.filter(p => p.role === 'teacher').map((teacher) => (
              <div key={teacher.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">T</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {teacher.name}
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Teacher
                      </span>
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  {teacher.isVideoEnabled ? (
                    <Video className="w-4 h-4 text-green-600" />
                  ) : (
                    <VideoOff className="w-4 h-4 text-gray-400" />
                  )}
                  
                  {teacher.isAudioEnabled ? (
                    <Mic className="w-4 h-4 text-green-600" />
                  ) : (
                    <MicOff className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
            
            {/* Self */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">Me</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    You
                    {isHandRaised && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Hand Raised
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-1">
                {isVideoOn ? (
                  <Video className="w-4 h-4 text-green-600" />
                ) : (
                  <VideoOff className="w-4 h-4 text-gray-400" />
                )}
                
                {isAudioOn ? (
                  <Mic className="w-4 h-4 text-green-600" />
                ) : (
                  <MicOff className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
            
            {/* Other Students */}
            {participants.filter(p => p.role === 'student').map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {participant.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {participant.name}
                      {participant.isHandRaised && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Hand Raised
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  {participant.isVideoEnabled ? (
                    <Video className="w-4 h-4 text-green-600" />
                  ) : (
                    <VideoOff className="w-4 h-4 text-gray-400" />
                  )}
                  
                  {participant.isAudioEnabled ? (
                    <Mic className="w-4 h-4 text-green-600" />
                  ) : (
                    <MicOff className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLiveClassInterface;