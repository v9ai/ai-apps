import React, { useRef, useEffect, useCallback } from "react";

interface AudioPlayerProps {
  /** URL of the audio file */
  src: string;
  /** Title shown on lock-screen controls (defaults to document title) */
  title?: string;
  /** Artist shown on lock-screen controls */
  artist?: string;
}

/**
 * Audio player with Media Session API support.
 * Registers lock-screen controls so playback continues on mobile
 * even when the screen is off or the browser is backgrounded.
 */
export default function AudioPlayer({
  src,
  title,
  artist = "vadim.blog",
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const setupMediaSession = useCallback(() => {
    if (!("mediaSession" in navigator)) return;

    const mediaTitle =
      title ?? document?.title?.replace(" | Vadim's blog", "") ?? "Article";

    navigator.mediaSession.metadata = new MediaMetadata({
      title: mediaTitle,
      artist,
    });

    const audio = audioRef.current;
    if (!audio) return;

    const seekBy = (delta: number) => {
      audio.currentTime = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 0));
    };

    navigator.mediaSession.setActionHandler("play", () => audio.play());
    navigator.mediaSession.setActionHandler("pause", () => audio.pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => seekBy(-10));
    navigator.mediaSession.setActionHandler("seekforward", () => seekBy(30));
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime != null) {
        audio.currentTime = details.seekTime;
      }
    });
  }, [title, artist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set up media session on first play so the OS treats this as active media
    const onPlay = () => setupMediaSession();
    audio.addEventListener("play", onPlay);
    return () => audio.removeEventListener("play", onPlay);
  }, [setupMediaSession]);

  return (
    <audio
      ref={audioRef}
      controls
      preload="none"
      style={{ width: "100%", marginBottom: "1.5rem" }}
    >
      <source src={src} type="audio/wav" />
    </audio>
  );
}
