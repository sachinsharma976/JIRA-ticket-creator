"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The Web Speech API isn't part of TypeScript's standard DOM lib — these are
// the minimal shapes this component actually uses.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function SpeechToTextButton({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  // Must start as `false` on both the server and the client's first render
  // (the server has no `window` at all) and only flip after mount — a lazy
  // useState initializer would compute `true` on the client's very first
  // render whenever the browser supports this API, mismatching the
  // server-rendered HTML and triggering a hydration error.
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    // Intentional: syncing with a browser API that doesn't exist during SSR (see comment above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    setError(null);
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
      }
      if (finalText.trim()) onTranscript(finalText.trim());
    };
    recognition.onerror = (event) => {
      setError(event.error === "not-allowed" ? "Microphone access denied." : "Speech recognition failed.");
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  if (!supported) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant={listening ? "destructive" : "ghost"}
        size="icon-sm"
        onClick={toggleListening}
        disabled={disabled}
        aria-label={listening ? "Stop dictation" : "Start dictation"}
        title={listening ? "Stop dictation" : "Dictate with your microphone"}
      >
        {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      </Button>
      {listening && (
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={cn("h-1.5 w-1.5 rounded-full bg-destructive animate-pulse")} />
          Listening…
        </span>
      )}
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </div>
  );
}
