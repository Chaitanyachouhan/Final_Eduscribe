"use client";
import { useState, useRef } from "react";

interface Props {
  onChunkReady: (blob: Blob) => void;
  onStatusChange: (status: "idle" | "recording" | "processing") => void;
}

export default function AudioRecorder({ onChunkReady, onStatusChange }: Props) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(); // NO timeslice — record continuously
      setRecording(true);
      onStatusChange("recording");

      // Every 12 seconds: stop current recorder, send full blob, start new one
      intervalRef.current = setInterval(() => {
        flushChunk(stream);
      }, 12000);

    } catch (err) {
      alert("Microphone access denied. Please allow mic access and try again.");
    }
  };

  const flushChunk = (stream: MediaStream) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.stop(); // this triggers onstop

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      if (blob.size > 500) {
        onStatusChange("processing");
        onChunkReady(blob);
      }

      // Start a fresh recorder on same stream
      const newRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = newRecorder;
      newRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      newRecorder.start();
      onStatusChange("recording");
    };
  };

  const stopRecording = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.stop();
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      if (blob.size > 500) {
        onStatusChange("processing");
        onChunkReady(blob);
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onStatusChange("idle");
    };

    setRecording(false);
  };

  return (
    <div className="flex gap-3 items-center">
      {!recording ? (
        <button
          onClick={startRecording}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          🎙 Start Recording
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-medium transition-colors animate-pulse"
        >
          ⏹ Stop Recording
        </button>
      )}
    </div>
  );
}