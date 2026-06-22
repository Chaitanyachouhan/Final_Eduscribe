"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLectures, createLecture, deleteLecture, getSubjects } from "@/lib/api";

interface Lecture { id: string; title: string; notes: string; created_at: string; duration_seconds: number; }
interface Subject { id: string; name: string; color: string; description: string; }

export default function SubjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [pptFile, setPptFile] = useState<File | null>(null);
  const [pyqFile, setPyqFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    const [subs, lecs] = await Promise.all([getSubjects(), getLectures(id)]);
    setSubject(subs.find((s: Subject) => s.id === id) || null);
    setLectures(lecs);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    const lecture = await createLecture(id, title.trim(), pptFile || undefined, pyqFile || undefined);
    setCreating(false);
    setShowModal(false);
    setTitle(""); setPptFile(null); setPyqFile(null);
    router.push(`/lecture/${lecture.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, lectureId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this lecture?")) return;
    await deleteLecture(lectureId);
    load();
  };

  const formatDuration = (s: number) => {
    if (!s) return "";
    const m = Math.floor(s / 60);
    return `${m} min`;
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Back + header */}
        <button onClick={() => router.push("/")}
          className="text-gray-600 hover:text-gray-400 text-sm mb-6 flex items-center gap-1">
          ← All Subjects
        </button>

        {subject && (
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold"
              style={{ background: subject.color + "33", color: subject.color }}>
              {subject.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{subject.name}</h1>
              {subject.description && <p className="text-gray-500 text-sm">{subject.description}</p>}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              + New Lecture
            </button>
          </div>
        )}

        {/* Lectures list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-20 bg-gray-900 rounded-xl animate-pulse" />)}
          </div>
        ) : lectures.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-700 text-sm">
            <p>No lectures yet</p>
            <p className="text-xs mt-1">Click "New Lecture" to record your first one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lectures.map((l) => (
              <div key={l.id}
                onClick={() => router.push(`/lecture/${l.id}`)}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl px-5 py-4 cursor-pointer transition-all group flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white">{l.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-600">{new Date(l.created_at).toLocaleDateString()}</span>
                    {l.duration_seconds > 0 && (
                      <span className="text-xs text-gray-700">{formatDuration(l.duration_seconds)}</span>
                    )}
                    {l.notes ? (
                      <span className="text-xs text-green-700">✓ Notes saved</span>
                    ) : (
                      <span className="text-xs text-yellow-800">No notes yet</span>
                    )}
                  </div>
                  {l.notes && (
                    <p className="text-xs text-gray-600 mt-1.5 line-clamp-1">
                      {l.notes.replace(/[#*]/g, "").slice(0, 100)}...
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => handleDelete(e, l.id)}
                  className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xl ml-4">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New lecture modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-5">New Lecture</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Lecture title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. Introduction to Neural Networks"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Upload slides (optional)</label>
                <label className="flex items-center gap-3 bg-gray-800 border border-gray-700 border-dashed rounded-xl px-4 py-3 cursor-pointer hover:border-gray-500 transition-colors">
                  <span className="text-gray-600 text-sm">{pptFile ? pptFile.name : "Choose .pptx file"}</span>
                  <input type="file" accept=".pptx" className="hidden" onChange={e => setPptFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Upload PYQs (optional)</label>
                <label className="flex items-center gap-3 bg-gray-800 border border-gray-700 border-dashed rounded-xl px-4 py-3 cursor-pointer hover:border-gray-500 transition-colors">
                  <span className="text-gray-600 text-sm">{pyqFile ? pyqFile.name : "Choose .pdf file"}</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={e => setPyqFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              {(pptFile || pyqFile) && (
                <p className="text-xs text-indigo-400">
                  ✓ Uploaded files will be used to enhance note generation
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setTitle(""); setPptFile(null); setPyqFile(null); }}
                className="flex-1 border border-gray-700 text-gray-400 py-2.5 rounded-xl text-sm hover:border-gray-500 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating || !title.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                {creating ? "Processing..." : "Start Lecture →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}