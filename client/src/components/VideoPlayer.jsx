import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Settings, SkipForward, SkipBack
} from 'lucide-react';
import './VideoPlayer.css';

export default function VideoPlayer({ src, poster }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const hideTimeout = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showBigPlay, setShowBigPlay] = useState(true);
  const [doubleTapSide, setDoubleTapSide] = useState(null); // 'left' | 'right'
  const [seekIndicator, setSeekIndicator] = useState(null);

  const formatTime = (s) => {
    if (isNaN(s) || s === 0) return '0:00';
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Play / Pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
      setShowBigPlay(false);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  // Mute
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Volume change
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    setVolume(val);
    if (val === 0) {
      video.muted = true;
      setIsMuted(true);
    } else {
      video.muted = false;
      setIsMuted(false);
    }
  };

  // Seek via progress bar
  const handleProgressClick = (e) => {
    const bar = progressRef.current;
    const video = videoRef.current;
    if (!bar || !video) return;
    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * duration;
  };

  // Skip forward/back
  const skip = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), duration);
    setSeekIndicator(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
    setTimeout(() => setSeekIndicator(null), 600);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Playback speed
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const changeSpeed = (speed) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSettings(false);
  };

  // Double tap to seek (mobile-like)
  const lastTap = useRef(0);
  const handleVideoAreaClick = (e) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double-tap
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      if (clickX < rect.width / 2) {
        skip(-10);
        setDoubleTapSide('left');
      } else {
        skip(10);
        setDoubleTapSide('right');
      }
      setTimeout(() => setDoubleTapSide(null), 500);
    } else {
      // Single tap → toggle play
      togglePlay();
    }
    lastTap.current = now;
  };

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    if (isPlaying) {
      hideTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = () => resetHideTimer();
    container.addEventListener('mousemove', handler);
    container.addEventListener('touchstart', handler);
    return () => {
      container.removeEventListener('mousemove', handler);
      container.removeEventListener('touchstart', handler);
    };
  }, [resetHideTimer]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onLoadedMetadata = () => setDuration(video.duration);
    const onEnded = () => { setIsPlaying(false); setShowControls(true); setShowBigPlay(true); };
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('ended', onEnded);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('ended', onEnded);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          skip(10);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay]);

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const bufferProgress = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`yt-player ${showControls ? 'show-controls' : ''} ${isFullscreen ? 'fullscreen' : ''}`}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        onClick={handleVideoAreaClick}
        className="yt-player-video"
      />

      {/* Big center play button */}
      {showBigPlay && !isPlaying && (
        <button className="yt-big-play" onClick={togglePlay}>
          <Play size={48} fill="white" />
        </button>
      )}

      {/* Double tap ripple */}
      {doubleTapSide && (
        <div className={`yt-seek-ripple ${doubleTapSide}`}>
          <span>{doubleTapSide === 'left' ? '⟪ 10s' : '10s ⟫'}</span>
        </div>
      )}

      {/* Seek indicator */}
      {seekIndicator && (
        <div className="yt-seek-indicator">{seekIndicator}</div>
      )}

      {/* Gradient overlay */}
      <div className="yt-gradient-bottom" />

      {/* Controls */}
      <div className="yt-controls">
        {/* Progress bar */}
        <div
          className="yt-progress-container"
          ref={progressRef}
          onClick={handleProgressClick}
          onMouseDown={() => setIsSeeking(true)}
          onMouseUp={() => setIsSeeking(false)}
        >
          <div className="yt-progress-bar">
            <div className="yt-progress-buffered" style={{ width: `${bufferProgress}%` }} />
            <div className="yt-progress-played" style={{ width: `${progress}%` }}>
              <div className="yt-progress-scrubber" />
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="yt-controls-row">
          {/* Left group */}
          <div className="yt-controls-left">
            <button className="yt-ctrl-btn" onClick={togglePlay} title={isPlaying ? 'Pause (k)' : 'Play (k)'}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} fill="white" />}
            </button>

            <button className="yt-ctrl-btn" onClick={() => skip(-10)} title="Rewind 10s (j)">
              <SkipBack size={18} />
            </button>

            <button className="yt-ctrl-btn" onClick={() => skip(10)} title="Forward 10s (l)">
              <SkipForward size={18} />
            </button>

            {/* Volume */}
            <div
              className="yt-volume-group"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button className="yt-ctrl-btn" onClick={toggleMute} title="Mute (m)">
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <div className={`yt-volume-slider-wrapper ${showVolumeSlider ? 'open' : ''}`}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="yt-volume-slider"
                />
              </div>
            </div>

            {/* Time */}
            <span className="yt-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right group */}
          <div className="yt-controls-right">
            {/* Settings */}
            <div className="yt-settings-wrapper">
              <button className="yt-ctrl-btn" onClick={() => setShowSettings(!showSettings)} title="Settings">
                <Settings size={18} className={showSettings ? 'spin' : ''} />
              </button>
              {showSettings && (
                <div className="yt-settings-menu">
                  <div className="yt-settings-title">Playback speed</div>
                  {speeds.map((s) => (
                    <button
                      key={s}
                      className={`yt-speed-option ${playbackRate === s ? 'active' : ''}`}
                      onClick={() => changeSpeed(s)}
                    >
                      {s === 1 ? 'Normal' : `${s}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button className="yt-ctrl-btn" onClick={toggleFullscreen} title="Fullscreen (f)">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}