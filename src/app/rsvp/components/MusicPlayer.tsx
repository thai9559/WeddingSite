"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";

// Link nhạc đám cưới - có thể thay đổi hoặc lấy từ env/config
const DEFAULT_MUSIC_URL =
  process.env.NEXT_PUBLIC_WEDDING_MUSIC_URL || "/music/wedding_song.mp3";

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lấy preference từ localStorage
  useEffect(() => {
    const savedMuted = localStorage.getItem("wedding-music-muted");
    if (savedMuted === "true") {
      setIsMuted(true);
    }
  }, []);

  // Handle user interaction để enable autoplay
  const handleInteraction = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  }, [hasInteracted]);

  // Tự động phát nhạc khi user tương tác với trang (để tránh autoplay policy)
  useEffect(() => {
    if (!hasInteracted || !audioRef.current) return;

    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          if (isMuted) {
            audioRef.current?.pause();
            setIsPlaying(false);
          }
        })
        .catch((error) => {
          console.log("Autoplay prevented:", error);
        });
    }
  }, [hasInteracted, isMuted]);

  // Toggle mute
  const toggleMute = () => {
    if (!audioRef.current) return;

    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    audioRef.current.muted = newMutedState;
    localStorage.setItem("wedding-music-muted", String(newMutedState));

    // Nếu đang mute và đang phát, thì pause
    if (newMutedState && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    // Nếu unmute và đã có interaction, thì play
    else if (!newMutedState && hasInteracted && !isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.log("Play failed:", error);
          });
      }
    }
  };

  // Lắng nghe sự kiện click/scroll để enable autoplay
  useEffect(() => {
    const enableInteraction = () => {
      handleInteraction();
    };

    window.addEventListener("click", enableInteraction, { once: true });
    window.addEventListener("scroll", enableInteraction, { once: true });
    window.addEventListener("touchstart", enableInteraction, { once: true });

    return () => {
      window.removeEventListener("click", enableInteraction);
      window.removeEventListener("scroll", enableInteraction);
      window.removeEventListener("touchstart", enableInteraction);
    };
  }, [handleInteraction]);

  return (
    <>
      <audio
        ref={audioRef}
        src={DEFAULT_MUSIC_URL}
        loop
        preload="auto"
        muted={isMuted}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* Floating music control button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={toggleMute}
          onMouseDown={handleInteraction}
          onTouchStart={handleInteraction}
          className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
          aria-label={isMuted ? "Bật nhạc" : "Tắt nhạc"}
        >
          {/* Icon */}
          <div className="relative">
            {isMuted ? (
              <VolumeX className="h-6 w-6 text-white" />
            ) : (
              <Volume2 className="h-6 w-6 text-white" />
            )}
          </div>

          {/* Ripple effect khi đang phát */}
          {!isMuted && isPlaying && (
            <div className="absolute inset-0 rounded-full bg-rose-400/30 animate-ping" />
          )}

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {isMuted ? "Bật nhạc" : "Tắt nhạc"}
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-900" />
          </div>
        </button>
      </div>
    </>
  );
}
