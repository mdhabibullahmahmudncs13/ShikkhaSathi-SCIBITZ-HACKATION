import React, { useState, useEffect, useRef } from 'react';
import { 
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  MessageSquare,
  Share,
  Monitor,
  Phone,
  PhoneOff,
  Settings,
  Hand,
  Maximize,
  Minimize,
  Volume2,
  VolumeX
} from 'lucide-react';
import webRTCService, { Participant, ChatMessage, WebRTCService } from '../../services/webRTCService';

interface LiveClassInterfaceProps {
  classInfo: {
    id: string;
    name: string;
    subject: string;
    student_count: number;
  };
}

const LiveClassInterface: React.FC<LiveClassInterfaceProps> = ({ classInfo }) => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isClassStarted, setIsClassStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    // Check WebRTC support
    if (!WebRTCService.isSupported()) {
      const browserInfo = WebRTCService.getBrowserInfo();
      const errorMessage = `WebRTC is not supported in your browser.\n\n` +
        `Browser: ${browserInfo.browser}\n` +
        `Missing features: ${browserInfo.missingFeatures.join(', ')}\n` +
        `Context: ${browserInfo.context}\n\n` +
        `Please use Chrome, Firefox, or Safari with HTTPS for full functionality.`;
      setConnectionError(errorMessage);
      return;
    }

    // Setup WebRTC event handlers
    webRTCService.setEventHandlers({
      onParticipantJoined: handleParticipantJoined,
      onParticipantLeft: handleParticipantLeft,
      onStreamReceived: handleStreamReceived,
      onChatMessage: handleChatMessage,
      onError: handleWebRTCError
    });

    return () => {
      // Cleanup on unmount
      webRTCService.disconnect();
    };
  }, []);

  useEffect(() => {
    // Update local video element when stream changes
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleParticipantJoined = (participant: Participant) => {
    setParticipants(prev => [...prev.filter(p => p.id !== participant.id), participant]);
  };

  const handleParticipantLeft = (participantId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.delete(participantId);
      return newStreams;
    });
  };

  const handleStreamReceived = (participantId: string, stream: MediaStream) => {
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.set(participantId, stream);
      return newStreams;
    });

    // Update video element
    const videoElement = remoteVideoRefs.current.get(participantId);
    if (videoElement) {
      videoElement.srcObject = stream;
    }
  };

  const handleChatMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  };

  const handleWebRTCError = (error: string) => {
    setConnectionError(error);
    setIsConnecting(false);
  };

  const startClass = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Initialize WebRTC service
      const result = await webRTCService.initialize({
        roomId: classInfo.id,
        userId: '2', // Teacher ID
        userName: 'Teacher One',
        isTeacher: true,
        signalServerUrl: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8001/ws`
      });

      if (result.success) {
        const stream = webRTCService.getLocalStream();
        setLocalStream(stream);
        setIsClassStarted(true);
        setIsConnecting(false);
      } else {
        throw new Error(result.error || 'Failed to start class');
      }
    } catch (error) {
      console.error('Failed to start class:', error);
      setConnectionError(`Failed to start class: ${error}`);
      setIsConnecting(false);
    }
  };

  const endClass = () => {
    webRTCService.disconnect();
    setIsClassStarted(false);
    setLocalStream(null);
    setRemoteStreams(new Map());
    setParticipants([]);
    setChatMessages([]);
  };

  const toggleVideo = () => {
    const enabled = webRTCService.toggleVideo();
    setIsVideoOn(enabled);
  };

  const toggleAudio = () => {
    const enabled = webRTCService.toggleAudio();
    setIsAudioOn(enabled);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await webRTCService.stopScreenShare();
      setIsScreenSharing(false);
    } else {
      const screenStream = await webRTCService.startScreenShare();
      if (screenStream) {
        setIsScreenSharing(true);
        
        // Handle screen share end
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          webRTCService.stopScreenShare();
        });
      }
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      webRTCService.sendChatMessage(newMessage);
      setNewMessage('');
    }
  };

  // Connection error display
  if (connectionError) {
    return (
      <div className="text-center py-8">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Phone className="w-12 h-12 text-red-600" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h3>
        <p className="text-red-600 mb-6 max-w-md mx-auto">
          {connectionError}
        </p>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              setConnectionError(null);
              startClass();
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => setConnectionError(null)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Pre-class setup
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
        
        <div className="bg-gray-50 rounded-lg p-6 mb-6 max-w-md mx-auto">
          <h4 className="font-semibold text-gray-900 mb-4">Pre-class Checklist</h4>
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm text-gray-700">WebRTC supported</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-sm text-gray-700">Signaling server ready</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">i</span>
              </div>
              <span className="text-sm text-gray-700">Camera and microphone will be requested</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={startClass}
          disabled={isConnecting}
          className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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

  return (
    <div className="h-[600px] bg-gray-900 rounded-lg overflow-hidden relative">
      {/* Main Video Area */}
      <div className="h-full relative">
        {/* Teacher's Main Video */}
        <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center relative">
          {localStream && isVideoOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-4xl font-bold">T</span>
              </div>
              <p className="text-white text-lg">Teacher One (You)</p>
              <p className="text-blue-200 text-sm">Teaching: {classInfo.subject}</p>
            </div>
          )}
          
          {/* Screen Share Indicator */}
          {isScreenSharing && (
            <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Screen Sharing
            </div>
          )}
        </div>
        
        {/* Student Video Grid */}
        <div className="absolute top-4 right-4 grid grid-cols-2 gap-2">
          {participants.filter(p => p.role === 'student').slice(0, 4).map((participant) => {
            const stream = remoteStreams.get(participant.id);
            return (
              <div key={participant.id} className="w-24 h-18 bg-gray-800 rounded-lg relative overflow-hidden">
                {stream && participant.isVideoEnabled ? (
                  <video
                    ref={(el) => {
                      if (el) {
                        remoteVideoRefs.current.set(participant.id, el);
                        el.srcObject = stream;
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {participant.name.charAt(0)}
                    </span>
                  </div>
                )}
                
                {/* Audio indicator */}
                <div className="absolute bottom-1 left-1">
                  {participant.isAudioEnabled ? (
                    <Mic className="w-3 h-3 text-green-400" />
                  ) : (
                    <MicOff className="w-3 h-3 text-red-400" />
                  )}
                </div>
                
                {/* Hand raised indicator */}
                {participant.isHandRaised && (
                  <div className="absolute top-1 right-1">
                    <Hand className="w-3 h-3 text-yellow-400" />
                  </div>
                )}
                
                {/* Name */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                  {participant.name.split(' ')[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-lg transition-colors ${
                isVideoOn 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
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
            >
              {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            
            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-lg transition-colors ${
                isScreenSharing 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              <Monitor className="w-5 h-5" />
            </button>
          </div>
          
          {/* Center Info */}
          <div className="text-center">
            <p className="text-white font-semibold">{classInfo.name}</p>
            <p className="text-gray-300 text-sm">
              {participants.length} participants • Live
            </p>
          </div>
          
          {/* Right Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="p-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors relative"
            >
              <Users className="w-5 h-5" />
              {participants.filter(p => p.isHandRaised).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-black text-xs rounded-full flex items-center justify-center">
                  {participants.filter(p => p.isHandRaised).length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            
            <button
              onClick={endClass}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              End Class
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
                    {msg.sender}
                  </span>
                  <span className="text-gray-500 text-xs">{msg.timestamp}</span>
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
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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
              Participants ({participants.length})
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {participant.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {participant.name}
                      {participant.role === 'teacher' && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Teacher
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {participant.isHandRaised && (
                    <button
                      onClick={() => handleHandRaise(participant.id)}
                      className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                    >
                      <Hand className="w-4 h-4" />
                    </button>
                  )}
                  
                  <div className="flex gap-1">
                    {participant.isVideoOn ? (
                      <Video className="w-4 h-4 text-green-600" />
                    ) : (
                      <VideoOff className="w-4 h-4 text-gray-400" />
                    )}
                    
                    {participant.isAudioOn ? (
                      <Mic className="w-4 h-4 text-green-600" />
                    ) : (
                      <MicOff className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveClassInterface;