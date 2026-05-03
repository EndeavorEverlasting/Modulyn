import { useState, useEffect, useCallback, useRef } from "react";

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI: typeof SpeechRecognition | undefined =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let current = "";
      for (let i = 0; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      setTranscript(current);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = rec;
    return () => {
      rec.abort();
    };
  }, []);

  const startRecording = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec && !isRecording) {
      setTranscript("");
      rec.start();
      setIsRecording(true);
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec && isRecording) {
      rec.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    transcript,
    isSupported,
    startRecording,
    stopRecording,
    toggleRecording,
    setTranscript,
  };
}
