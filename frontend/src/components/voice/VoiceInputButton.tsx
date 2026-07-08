import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';

interface VoiceInputButtonProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  onAudioReady: (audioBlob: Blob) => void;
  isEnabled: boolean;
  isProcessing?: boolean;
  className?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onStartRecording,
  onStopRecording,
  onAudioReady,
  isEnabled,
  isProcessing = false,
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopRecording();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;

      // Set up audio analysis for visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        onAudioReady(audioBlob);
        cleanup();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      onStartRecording();
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start audio level monitoring
      monitorAudioLevel();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onStopRecording();
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioLevel(0);
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current || !isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average / 255); // Normalize to 0-1
      
      animationRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  };

  const handleClick = () => {
    if (!isEnabled || isProcessing) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getButtonColor = () => {
    if (!isEnabled || isProcessing) return 'bg-gray-400';
    if (isRecording) return 'bg-red-500 hover:bg-red-600';
    return 'bg-blue-500 hover:bg-blue-600';
  };

  const getIcon = () => {
    if (isProcessing) return <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />;
    if (isRecording) return <Square className="w-5 h-5" />;
    return isEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={handleClick}
        disabled={!isEnabled || isProcessing}
        className={`
          relative p-3 rounded-full text-white transition-all duration-200
          ${getButtonColor()}
          ${isRecording ? 'animate-pulse' : ''}
          disabled:cursor-not-allowed
        `}
        title={
          !isEnabled ? 'Voice input disabled' :
          isProcessing ? 'Processing...' :
          isRecording ? 'Stop recording' : 'Start recording'
        }
      >
        {getIcon()}
        
        {/* Audio level indicator */}
        {isRecording && (
          <div 
            className="absolute inset-0 rounded-full border-4 border-white opacity-50"
            style={{
              transform: `scale(${1 + audioLevel * 0.3})`,
              transition: 'transform 0.1s ease-out'
            }}
          />
        )}
      </button>
      
      {/* Recording timer */}
      {isRecording && (
        <div className="flex items-center space-x-1 text-sm text-gray-600">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span>{formatTime(recordingTime)}</span>
        </div>
      )}
      
      {/* Processing indicator */}
      {isProcessing && (
        <div className="text-sm text-gray-600">
          Processing...
        </div>
      )}
    </div>
  );
};