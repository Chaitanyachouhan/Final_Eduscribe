"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSubjects, createSubject, deleteSubject } from "@/lib/api";

const COLORS = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#14b8a6"];

interface Subject { id: string; name: string; description: string; color: string; created_at: string; }

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await getSubjects();
    setSubjects(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createSubject(name.trim(), description.trim(), color);
    setName(""); setDescription(""); setColor(COLORS[0]); setShowModal(false);
    load();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this subject and all its lectures?")) return;
    await deleteSubject(id);
    load();
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold">EduScribe</h1>
            <p className="text-gray-500 mt-1 text-sm">Your lecture notes, organized by subject</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
          >
            + New Subject
          </button>
        </div>

        {/* Subjects grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-900 rounded-2xl animate-pulse" />)}
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-700">
            <p className="text-lg">No subjects yet</p>
            <p className="text-sm mt-1">Click "New Subject" to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((s) => (
              <div
                key={s.id}
                onClick={() => router.push(`/subject/${s.id}`)}
                className="relative bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl p-6 cursor-pointer transition-all group"
              >
                {/* Color bar */}
                <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center text-lg font-bold"
                  style={{ background: s.color + "33", color: s.color }}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="font-semibold text-white text-lg leading-tight">{s.name}</h2>
                {s.description && <p className="text-gray-500 text-sm mt-1 line-clamp-2">{s.description}</p>}
                <p className="text-gray-700 text-xs mt-3">
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, s.id)}
                  className="absolute top-4 right-4 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-lg"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-5">New Subject</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Subject name *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. Machine Learning"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description (optional)</label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Deep learning, neural networks..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-700 text-gray-400 py-2.5 rounded-xl text-sm hover:border-gray-500 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                Create Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}