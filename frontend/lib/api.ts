const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Subjects
export async function getSubjects() {
  const r = await fetch(`${API}/subjects`);
  return r.json();
}
export async function createSubject(name: string, description: string, color: string) {
  const r = await fetch(`${API}/subjects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, color }),
  });
  return r.json();
}
export async function deleteSubject(id: string) {
  await fetch(`${API}/subjects/${id}`, { method: "DELETE" });
}

// Lectures
export async function getLectures(subjectId: string) {
  const r = await fetch(`${API}/subjects/${subjectId}/lectures`);
  return r.json();
}
export async function createLecture(subjectId: string, title: string, pptFile?: File, pyqFile?: File) {
  const form = new FormData();
  form.append("title", title);
  if (pptFile) form.append("ppt_file", pptFile);
  if (pyqFile) form.append("pyq_file", pyqFile);
  const r = await fetch(`${API}/subjects/${subjectId}/lectures`, {
    method: "POST", body: form,
  });
  return r.json();
}
export async function getLecture(lectureId: string) {
  const r = await fetch(`${API}/lectures/${lectureId}`);
  return r.json();
}
export async function deleteLecture(id: string) {
  await fetch(`${API}/lectures/${id}`, { method: "DELETE" });
}
export async function saveLecture(lectureId: string, summaries: string[], notes: string, duration: number) {
  await fetch(`${API}/lectures/${lectureId}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summaries, notes, duration }),
  });
}

// Audio processing
export async function processChunk(audioBlob: Blob) {
  const form = new FormData();
  form.append("audio", audioBlob, "chunk.webm");
  const r = await fetch(`${API}/process-chunk`, { method: "POST", body: form });
  if (!r.ok) throw new Error("Chunk failed");
  return r.json() as Promise<{ transcript: string; importance_score: number; summary: string }>;
}
export async function generateNotes(summaries: string[], transcripts: string[], pptText = "", pyqText = "") {
  const r = await fetch(`${API}/generate-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summaries, transcripts, ppt_text: pptText, pyq_text: pyqText }),
  });
  if (!r.ok) throw new Error("Notes failed");
  return r.json() as Promise<{ notes: string; session_id: string }>;
}