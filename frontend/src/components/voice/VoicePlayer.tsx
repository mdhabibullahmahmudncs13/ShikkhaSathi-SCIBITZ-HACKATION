import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX } from 'lucide-react';

interface VoicePlayerProps {
  audioUrl: string;
  text?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onProgress?: (progress: number) => void;
  autoPlay?: boolean;
  showControls?: boolean;
  className?: string;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({
  audioUrl,
  text,
  onPlayStateChange,
  onProgress,
  autoPlay = false,
  showControls = true,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      if (autoPlay) {
        playAudio();
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      onProgress?.(progress);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPlayStateChange?.(false);
    };

    const handleError = () => {
      setError('Failed to load audio');
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
    };
  }, [audioUrl, autoPlay, onPlayStateChange, onProgress]);

  const playAudio = async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      onPlayStateChange?.(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      setError('Failed to play audio');
    }
  };

  const pauseAudio = () => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setIsPlaying(false);
    onPlayStateChange?.(false);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;

    const newTime = (parseFloat(event.target.value) / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;

    const newVolume = parseFloat(event.target.value) / 100;
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;

    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (!audioRef.current) return;

    audioRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const downloadAudio = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `audio-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className={`flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <VolumeX className="w-5 h-5 text-red-500" />
        <span className="text-red-700 text-sm">{error}</span>
        {text && (
          <div className="ml-2 text-gray-600 text-sm">
            Text: "{text.substring(0, 50)}{text.length > 50 ? '...' : ''}"
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 ${className}`}>
      {/* Main controls */}
      <div className="flex items-center space-x-3">
        {/* Play/Pause button */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading}
          className="flex-shrink-0 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>

        {/* Progress bar */}
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            disabled={isLoading}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume control */}
        {showControls && (
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="p-1 text-gray-600 hover:text-gray-800"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume * 100}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}

        {/* Download button */}
        {showControls && (
          <button
            onClick={downloadAudio}
            className="p-1 text-gray-600 hover:text-gray-800"
            title="Download audio"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Advanced controls */}
      {showControls && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
          {/* Playback speed */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600">Speed:</span>
            <div className="flex space-x-1">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handlePlaybackRateChange(rate)}
                  className={`px-2 py-1 text-xs rounded ${
                    playbackRate === rate
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Text preview */}
          {text && (
            <div className="text-xs text-gray-600 max-w-xs truncate">
              "{text}"
            </div>
          )}
        </div>
      )}

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};