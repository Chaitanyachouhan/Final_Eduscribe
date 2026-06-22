"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AudioRecorder from "@/components/AudioRecorder";
import ChunkLog from "@/components/ChunkLog";
import NotesViewer from "@/components/NotesViewer";
import { processChunk, generateNotes, getLecture, saveLecture } from "@/lib/api";

interface Chunk { transcript: string; importance_score: number; summary: string; }
interface Lecture { id: string; title: string; notes: string; ppt_text: string; pyq_text: string; summaries: string[]; subject_id: string; }

export default function LecturePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "recording" | "processing">("idle");
  const [notesStatus, setNotesStatus] = useState<"idle" | "generating" | "ready">("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");
  const [nextUpdateIn, setNextUpdateIn] = useState(90);
  const [startTime] = useState(Date.now());

  const chunksRef = useRef<Chunk[]>([]);
  const notesRef = useRef("");
  const notesIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartedRef = useRef(false);

  useEffect(() => { chunksRef.current = chunks; }, [chunks]);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  useEffect(() => {
    getLecture(id).then(l => {
      setLecture(l);
      // If lecture already has notes, show them
      if (l.notes) { setNotes(l.notes); setNotesStatus("ready"); setIsSaved(true); }
    });
  }, [id]);

  const triggerNotesGeneration = useCallback(async () => {
    const current = chunksRef.current;
    if (current.length === 0) return;
    setNotesStatus("generating");
    try {
      const summaries = current.map(c => c.summary).filter(Boolean);
      const transcripts = current.map(c => c.transcript).filter(Boolean);
      const pptText = lecture?.ppt_text || "";
      const pyqText = lecture?.pyq_text || "";
      const result = await generateNotes(summaries, transcripts, pptText, pyqText);
      if (result.notes?.length > 20) {
        setNotes(result.notes);
        setNotesStatus("ready");
        setIsSaved(false);
      } else {
        setNotesStatus("idle");
      }
    } catch {
      setNotesStatus("idle");
    }
  }, [lecture]);

  const clearTimers = () => {
    if (notesIntervalRef.current) { clearInterval(notesIntervalRef.current); notesIntervalRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  };

  const startSession = () => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    setIsRecording(true);
    clearTimers();
    setNextUpdateIn(90);
    notesIntervalRef.current = setInterval(() => {
      triggerNotesGeneration();
      setNextUpdateIn(90);
    }, 90000);
    countdownRef.current = setInterval(() => {
      setNextUpdateIn(p => p > 1 ? p - 1 : 90);
    }, 1000);
  };

  const endSession = () => {
    if (!sessionStartedRef.current) return;
    sessionStartedRef.current = false;
    setIsRecording(false);
    clearTimers();
  };

  const handleStatusChange = (s: "idle" | "recording" | "processing") => {
    setStatus(s);
    if (s === "recording") startSession();
    if (s === "idle") endSession();
  };

  const handleChunk = async (blob: Blob) => {
    try {
      const result = await processChunk(blob);
      if (result.transcript?.trim()) setChunks(prev => [...prev, result]);
      setError("");
    } catch { setError("Chunk processing failed."); }
  };

  const handleEndLecture = async () => {
    endSession();
    setStatus("idle");
    await triggerNotesGeneration();
  };

  const handleSave = async () => {
    if (!notesRef.current || !lecture) return;
    const summaries = chunksRef.current.map(c => c.summary);
    const duration = Math.floor((Date.now() - startTime) / 1000);
    await saveLecture(id, summaries, notesRef.current, duration);
    setIsSaved(true);
  };

  const handleDownloadPDF = () => {
    const content = notesRef.current;
    if (!content) return;
    // Create printable HTML and trigger print-to-PDF
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${lecture?.title || "Lecture Notes"}</title>
          <style>
            body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a1a1a; line-height: 1.7; }
            h1 { font-size: 28px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { font-size: 20px; margin-top: 30px; color: #222; }
            h3 { font-size: 16px; color: #333; margin-top: 20px; }
            strong { color: #111; }
            ul { padding-left: 20px; }
            li { margin: 4px 0; }
            hr { border: none; border-top: 1px solid #ddd; margin: 30px 0; }
            p { margin: 8px 0; }
          </style>
        </head>
        <body>
          <p style="color:#888;font-size:12px;font-family:sans-serif">Generated by EduScribe • ${new Date().toLocaleDateString()}</p>
          ${markdownToHtml(content)}
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  // Simple markdown to HTML converter for PDF
  const markdownToHtml = (md: string) => {
  return md
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hul])/gm, "<p>")
    .replace(/(?<![>])$/gm, "</p>");
};

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(lecture?.subject_id ? `/subject/${lecture.subject_id}` : "/")}
            className="text-gray-600 hover:text-gray-400 text-sm">← Back</button>
          <div>
            <span className="font-semibold text-sm">{lecture?.title || "Loading..."}</span>
            {isRecording && (
              <span className="ml-3 text-xs text-gray-600">
                Next notes in <span className="text-gray-400 font-mono">{nextUpdateIn}s</span>
              </span>
            )}
          </div>
          {lecture?.ppt_text && <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">PPT loaded</span>}
          {lecture?.pyq_text && <span className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full">PYQs loaded</span>}
        </div>

        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-400">{error}</span>}
          {notes && !isRecording && (
            <>
              <button onClick={handleDownloadPDF}
                className="text-xs border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                ↓ Download PDF
              </button>
              <button onClick={handleSave}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  isSaved
                    ? "bg-green-900 text-green-400 border border-green-800"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}>
                {isSaved ? "✓ Saved" : "Save Notes"}
              </button>
            </>
          )}
          {isRecording && (
            <button onClick={handleEndLecture}
              className="bg-orange-600 hover:bg-orange-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
              End Lecture →
            </button>
          )}
          <AudioRecorder onChunkReady={handleChunk} onStatusChange={handleStatusChange} />
        </div>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-2/5 border-r border-gray-800 overflow-y-auto p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Live Chunks</span>
            <span className="text-xs text-gray-700">
              {status === "recording" && "🔴 live"}
              {status === "processing" && "⚙️ processing"}
              {status === "idle" && chunks.length > 0 && `${chunks.length} chunks`}
            </span>
          </div>
          {chunks.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-700 text-sm text-center px-4">
              {isSaved ? "This lecture already has saved notes. Start recording to add more." : "Start recording to see live chunks"}
            </div>
          ) : <ChunkLog chunks={chunks} />}
        </div>

        <div className="w-3/5 overflow-y-auto p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Structured Notes</span>
            <div className="flex items-center gap-3">
              {notesStatus === "generating" && <span className="text-xs text-blue-400 animate-pulse">✨ Generating...</span>}
              {notes && notesStatus !== "generating" && (
                <button onClick={() => navigator.clipboard.writeText(notes)}
                  className="text-xs text-gray-600 hover:text-gray-400 underline">Copy</button>
              )}
              {!isRecording && chunks.length > 0 && notesStatus !== "generating" && (
                <button onClick={triggerNotesGeneration}
                  className="text-xs border border-gray-700 hover:border-gray-500 text-gray-500 hover:text-gray-300 px-3 py-1 rounded-lg transition-colors">
                  {notes ? "Regenerate" : "Generate Now"}
                </button>
              )}
            </div>
          </div>

          {!notes && notesStatus === "idle" && (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-700 text-sm gap-2">
              <p>Notes auto-generate every 90 seconds</p>
              <p className="text-xs text-gray-800">Click "End Lecture" for final generation</p>
            </div>
          )}
          {notesStatus === "generating" && !notes && (
            <div className="flex flex-col gap-4 mt-4">
              {[80,95,70,60,88,75].map((w,i) => (
                <div key={i} className="h-3 bg-gray-800 rounded animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
          {notes && <NotesViewer notes={notes} sessionId={id} isUpdating={notesStatus === "generating"} />}
        </div>
      </div>
    </main>
  );
}