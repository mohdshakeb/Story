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

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (!hasPlayed) {
      setHasPlayed(true);
      // Give the recipient a moment to process before advancing
      setTimeout(() => onAnswer("played"), 800);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center gap-4 py-4"
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={config.audio_url}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={hasPlayed && !isPlaying}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-40"
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
  );
}
