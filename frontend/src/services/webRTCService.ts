// WebRTC Service for Real-time Video Conferencing
import { getWebSocketUrl } from '../utils/apiUrl';

export interface MediaDevices {
  video: boolean;
  audio: boolean;
}

export interface Participant {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  stream?: MediaStream;
  peerConnection?: RTCPeerConnection;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isHandRaised: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  isTeacher: boolean;
}

class WebRTCService {
  private localStream: MediaStream | null = null;
  private participants: Map<string, Participant> = new Map();
  private socket: WebSocket | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  private isTeacher: boolean = false;
  private signalServerUrl: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  // Event callbacks
  private onParticipantJoined?: (participant: Participant) => void;
  private onParticipantLeft?: (participantId: string) => void;
  private onStreamReceived?: (participantId: string, stream: MediaStream) => void;
  private onChatMessage?: (message: ChatMessage) => void;
  private onError?: (error: string) => void;

  // ICE servers configuration (STUN/TURN servers)
  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN servers for production
    // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
  ];

  constructor() {
    this.setupEventHandlers();
  }

  // Initialize WebRTC service
  async initialize(config: {
    roomId: string;
    userId: string;
    userName: string;
    isTeacher: boolean;
    signalServerUrl?: string;
  }) {
    this.roomId = config.roomId;
    this.userId = config.userId;
    this.userName = config.userName;
    this.isTeacher = config.isTeacher;
    
    // Use dynamic WebSocket URL based on current host
    this.signalServerUrl = config.signalServerUrl || getWebSocketUrl();

    try {
      // Connect to signaling server (WebSocket)
      await this.connectToSignalingServer(this.signalServerUrl);
      
      // Get user media (camera and microphone)
      await this.getUserMedia({ video: true, audio: true });
      
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      this.onError?.(`Failed to initialize: ${error}`);
      return { success: false, error: error };
    }
  }

  // Get user media (camera and microphone)
  async getUserMedia(constraints: MediaDevices): Promise<MediaStream> {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices) {
        throw new Error('Media devices not available. This usually means you need HTTPS or localhost access.');
      }

      if (typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('getUserMedia not supported. Please use a modern browser with HTTPS.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints.video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: constraints.audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      });

      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Provide specific error messages based on the error type
      if (!navigator.mediaDevices) {
        throw new Error('Camera and microphone access requires HTTPS or localhost. Please use https://192.168.0.109:5174 instead.');
      }
      
      throw new Error('Could not access camera or microphone. Please check permissions.');
    }
  }

  // Connect to signaling server
  private async connectToSignalingServer(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Ensure the URL has the correct WebSocket path
        const wsUrl = url.includes('/ws') ? url : `${url}/ws`;
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('Connected to signaling server');
          // Join room
          this.sendSignalingMessage({
            type: 'join-room',
            roomId: this.roomId,
            userId: this.userId,
            userName: this.userName,
            isTeacher: this.isTeacher
          });
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleSignalingMessage(JSON.parse(event.data));
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('Failed to connect to signaling server'));
        };

        this.socket.onclose = (event) => {
          console.log('Disconnected from signaling server', event.code, event.reason);
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            // Attempt to reconnect
            this.attemptReconnect();
          } else if (event.code !== 1000) {
            this.onError?.('Connection to signaling server lost. Please refresh the page.');
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // Handle signaling messages
  private async handleSignalingMessage(message: any) {
    switch (message.type) {
      case 'user-joined':
        await this.handleUserJoined(message);
        break;
      case 'user-left':
        this.handleUserLeft(message);
        break;
      case 'offer':
        await this.handleOffer(message);
        break;
      case 'answer':
        await this.handleAnswer(message);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(message);
        break;
      case 'chat-message':
        this.handleChatMessage(message);
        break;
      case 'media-toggle':
        this.handleMediaToggle(message);
        break;
      case 'hand-raise':
        this.handleHandRaise(message);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  // Create peer connection for a participant
  private createPeerConnection(participantId: string): RTCPeerConnection {
    const peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.onStreamReceived?.(participantId, remoteStream);
      
      // Update participant with stream
      const participant = this.participants.get(participantId);
      if (participant) {
        participant.stream = remoteStream;
        this.participants.set(participantId, participant);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
          targetUserId: participantId
        });
      }
    };

    return peerConnection;
  }

  // Handle user joined
  private async handleUserJoined(message: any) {
    const participant: Participant = {
      id: message.userId,
      name: message.userName,
      role: message.isTeacher ? 'teacher' : 'student',
      isVideoEnabled: true,
      isAudioEnabled: true,
      isHandRaised: false
    };

    this.participants.set(message.userId, participant);
    this.onParticipantJoined?.(participant);

    // Create peer connection and send offer (if we're the initiator)
    if (this.isTeacher || message.userId > this.userId!) {
      const peerConnection = this.createPeerConnection(message.userId);
      participant.peerConnection = peerConnection;
      
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        this.sendSignalingMessage({
          type: 'offer',
          offer: offer,
          targetUserId: message.userId
        });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    }
  }

  // Handle user left
  private handleUserLeft(message: any) {
    const participant = this.participants.get(message.userId);
    if (participant) {
      participant.peerConnection?.close();
      this.participants.delete(message.userId);
      this.onParticipantLeft?.(message.userId);
    }
  }

  // Handle WebRTC offer
  private async handleOffer(message: any) {
    const participant = this.participants.get(message.fromUserId);
    if (!participant) return;

    try {
      const peerConnection = this.createPeerConnection(message.fromUserId);
      participant.peerConnection = peerConnection;

      await peerConnection.setRemoteDescription(message.offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.sendSignalingMessage({
        type: 'answer',
        answer: answer,
        targetUserId: message.fromUserId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  // Handle WebRTC answer
  private async handleAnswer(message: any) {
    const participant = this.participants.get(message.fromUserId);
    if (participant?.peerConnection) {
      try {
        await participant.peerConnection.setRemoteDescription(message.answer);
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  }

  // Handle ICE candidate
  private async handleIceCandidate(message: any) {
    const participant = this.participants.get(message.fromUserId);
    if (participant?.peerConnection) {
      try {
        await participant.peerConnection.addIceCandidate(message.candidate);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }

  // Handle chat message
  private handleChatMessage(message: any) {
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: message.fromUserId,
      senderName: message.senderName,
      message: message.message,
      timestamp: new Date(message.timestamp),
      isTeacher: message.isTeacher
    };
    this.onChatMessage?.(chatMessage);
  }

  // Handle media toggle
  private handleMediaToggle(message: any) {
    const participant = this.participants.get(message.fromUserId);
    if (participant) {
      if (message.mediaType === 'video') {
        participant.isVideoEnabled = message.enabled;
      } else if (message.mediaType === 'audio') {
        participant.isAudioEnabled = message.enabled;
      }
      this.participants.set(message.fromUserId, participant);
    }
  }

  // Handle hand raise
  private handleHandRaise(message: any) {
    const participant = this.participants.get(message.fromUserId);
    if (participant) {
      participant.isHandRaised = message.isRaised;
      this.participants.set(message.fromUserId, participant);
    }
  }

  // Attempt to reconnect to signaling server
  private attemptReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000); // Exponential backoff, max 10s

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        if (this.signalServerUrl) {
          await this.connectToSignalingServer(this.signalServerUrl);
          this.reconnectAttempts = 0; // Reset on successful connection
          console.log('Successfully reconnected to signaling server');
        }
      } catch (error) {
        console.error('Reconnection failed:', error);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        } else {
          this.onError?.('Failed to reconnect to signaling server. Please refresh the page.');
        }
      }
    }, delay);
  }

  // Send signaling message
  private sendSignalingMessage(message: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        ...message,
        fromUserId: this.userId,
        roomId: this.roomId
      }));
    }
  }

  // Toggle video
  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        
        // Notify other participants
        this.sendSignalingMessage({
          type: 'media-toggle',
          mediaType: 'video',
          enabled: videoTrack.enabled
        });
        
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // Toggle audio
  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        
        // Notify other participants
        this.sendSignalingMessage({
          type: 'media-toggle',
          mediaType: 'audio',
          enabled: audioTrack.enabled
        });
        
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Send chat message
  sendChatMessage(message: string) {
    this.sendSignalingMessage({
      type: 'chat-message',
      message: message,
      senderName: this.userName,
      isTeacher: this.isTeacher,
      timestamp: new Date().toISOString()
    });
  }

  // Toggle hand raise
  toggleHandRaise(isRaised: boolean) {
    this.sendSignalingMessage({
      type: 'hand-raise',
      isRaised: isRaised
    });
  }

  // Start screen sharing
  async startScreenShare(): Promise<MediaStream | null> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      this.participants.forEach((participant) => {
        if (participant.peerConnection) {
          const sender = participant.peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        }
      });

      return screenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      return null;
    }
  }

  // Stop screen sharing
  async stopScreenShare() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      
      // Replace screen share track with camera track
      this.participants.forEach((participant) => {
        if (participant.peerConnection) {
          const sender = participant.peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        }
      });
    }
  }

  // Get local stream
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Get participants
  getParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }

  // Set event handlers
  setEventHandlers(handlers: {
    onParticipantJoined?: (participant: Participant) => void;
    onParticipantLeft?: (participantId: string) => void;
    onStreamReceived?: (participantId: string, stream: MediaStream) => void;
    onChatMessage?: (message: ChatMessage) => void;
    onError?: (error: string) => void;
  }) {
    this.onParticipantJoined = handlers.onParticipantJoined;
    this.onParticipantLeft = handlers.onParticipantLeft;
    this.onStreamReceived = handlers.onStreamReceived;
    this.onChatMessage = handlers.onChatMessage;
    this.onError = handlers.onError;
  }

  // Setup event handlers
  private setupEventHandlers() {
    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });
  }

  // Disconnect from the session
  disconnect() {
    // Close all peer connections
    this.participants.forEach((participant) => {
      participant.peerConnection?.close();
    });

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    // Close WebSocket connection
    if (this.socket) {
      this.socket.close();
    }

    // Clear data
    this.participants.clear();
    this.localStream = null;
    this.socket = null;
  }

  // Check browser compatibility with detailed error reporting
  static isSupported(): boolean {
    const checks = {
      mediaDevices: !!(navigator.mediaDevices),
      getUserMedia: !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'),
      RTCPeerConnection: !!(window.RTCPeerConnection),
      WebSocket: !!(window.WebSocket)
    };

    console.log('WebRTC Browser Compatibility Check:', checks);

    // For basic WebRTC functionality, we only need RTCPeerConnection and WebSocket
    // Media devices can fail due to permissions but still allow WebRTC to work
    const basicSupport = checks.RTCPeerConnection && checks.WebSocket;
    const fullSupport = Object.values(checks).every(check => check);
    
    if (!basicSupport) {
      const missing = Object.entries(checks)
        .filter(([key, supported]) => !supported && (key === 'RTCPeerConnection' || key === 'WebSocket'))
        .map(([feature, _]) => feature);
      console.warn('Missing critical WebRTC features:', missing);
      return false;
    }
    
    if (!fullSupport) {
      const missing = Object.entries(checks)
        .filter(([_, supported]) => !supported)
        .map(([feature, _]) => feature);
      console.warn('Missing WebRTC features (but basic support available):', missing);
    }

    // Return true if we have basic WebRTC support, even if media devices are not available
    return basicSupport;
  }

  // Get browser compatibility details
  static getBrowserInfo(): { browser: string; isSupported: boolean; missingFeatures: string[]; context: string; developmentNote: string } {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    // Check if we're in a secure context
    const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
    const context = `${location.protocol}//${location.hostname}:${location.port} (secure: ${isSecureContext})`;
    
    console.log('🔍 Browser compatibility check:', {
      browser,
      userAgent: userAgent.substring(0, 100),
      isSecureContext,
      location: context,
      mediaDevicesExists: !!(navigator.mediaDevices),
      getUserMediaExists: !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'),
      RTCPeerConnectionExists: !!(window.RTCPeerConnection),
      WebSocketExists: !!(window.WebSocket)
    });
    
    const checks = {
      mediaDevices: !!(navigator.mediaDevices),
      getUserMedia: !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'),
      RTCPeerConnection: !!(window.RTCPeerConnection),
      WebSocket: !!(window.WebSocket)
    };

    const missingFeatures = Object.entries(checks)
      .filter(([_, supported]) => !supported)
      .map(([feature, _]) => feature);

    // For development on localhost, be more lenient with media device checks
    const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const hasBasicWebRTC = checks.RTCPeerConnection && checks.WebSocket;
    
    // Enhanced support determination
    let isSupported = false;
    let developmentNote = '';
    
    if (isDevelopment) {
      // In development, allow WebRTC even if media devices fail due to permissions
      isSupported = hasBasicWebRTC;
      if (!checks.mediaDevices || !checks.getUserMedia) {
        developmentNote = 'Media devices limited - consider using HTTPS for full functionality';
      }
    } else {
      // In production/network access, require HTTPS for media devices
      if (!isSecureContext && (missingFeatures.includes('mediaDevices') || missingFeatures.includes('getUserMedia'))) {
        isSupported = false;
        developmentNote = 'HTTPS required for camera/microphone access on network';
      } else {
        isSupported = missingFeatures.length === 0;
      }
    }

    return {
      browser,
      isSupported,
      missingFeatures,
      context,
      developmentNote
    };
  }

  // Get available media devices
  static async getMediaDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        cameras: devices.filter(device => device.kind === 'videoinput'),
        microphones: devices.filter(device => device.kind === 'audioinput'),
        speakers: devices.filter(device => device.kind === 'audiooutput')
      };
    } catch (error) {
      console.error('Error getting media devices:', error);
      return { cameras: [], microphones: [], speakers: [] };
    }
  }
}

// Export both the class and the instance
export { WebRTCService };
export default new WebRTCService();