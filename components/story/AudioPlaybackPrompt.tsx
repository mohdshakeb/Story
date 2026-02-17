"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Play, Pause, CheckCircle2 } from "lucide-react";
import type { AudioPlaybackConfig } from "@/lib/types/story";

interface AudioPlaybackPromptProps {
  config: AudioPlaybackConfig;
  onAnswer: (answer: string) => void;
}

export function AudioPlaybackPrompt({
  config,
  onAnswer,
}: AudioPlaybackPromptProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Stop any other audio elements currently playing in the page
      document.querySelectorAll("audio").forEach((el) => {
        if (el !== audio && !el.paused) el.pause();
      });
      audio.play();
      setIsPlaying(true);
      if (!hasStarted) {
        setHasStarted(true);
        // Unlock advancement as soon as the user presses play — listening fully is optional
        onAnswer("played");
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setHasPlayed(true);
  };

  return (
    <>
      {/* Audio element rendered as first sibling — not nested — so React never
          unmounts it when the UI re-renders (keeps playback alive across state changes) */}
      <audio
        ref={audioRef}
        src={config.audio_url}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-4 py-4"
      >
        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-95"
        >
          {isPlaying ? (
            <Pause className="h-7 w-7" />
          ) : hasPlayed ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : (
            <Play className="ml-0.5 h-7 w-7" />
          )}
        </button>

        <p className="font-serif text-sm text-muted-foreground">
          {hasPlayed
            ? "Listened"
            : isPlaying
              ? "Playing…"
              : config.button_text || "Play to hear…"}
        </p>
      </motion.div>
    </>
  );
}
