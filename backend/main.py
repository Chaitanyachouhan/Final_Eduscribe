from ppt_parser import extract_ppt_text
from pyq_parser import extract_pyq_text
from database import (
    get_all_subjects, create_subject, delete_subject,
    get_lectures_by_subject, create_lecture, update_lecture_notes,
    get_lecture, delete_lecture, save_session, get_session
)
from fastapi import FastAPI, UploadFile, File,Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil, os, uuid, httpx
from dotenv import load_dotenv
load_dotenv()

from stt import transcribe_audio
from text_cleaner import clean_transcript
from importance_scorer import score_text_importance, score_audio_importance
from summarizer import summarize_chunk
from database import save_session, get_session

app = FastAPI(title="EduScribe API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def root():
    return {"status": "EduScribe backend running"}

@app.post("/process-chunk")
async def process_chunk(audio: UploadFile = File(...)):
    chunk_id = str(uuid.uuid4())
    raw_path = f"{UPLOAD_DIR}/{chunk_id}.webm"
    wav_path = f"{UPLOAD_DIR}/{chunk_id}.wav"

    with open(raw_path, "wb") as f:
        shutil.copyfileobj(audio.file, f)

    if os.path.getsize(raw_path) < 1000:
        os.remove(raw_path)
        return {"transcript": "", "importance_score": 0.0, "summary": ""}

    try:
        from pydub import AudioSegment
        audio_seg = AudioSegment.from_file(raw_path, format="webm")
        audio_seg.export(wav_path, format="wav")
    except Exception as e:
        os.remove(raw_path)
        return {"transcript": "", "importance_score": 0.0, "summary": f"Audio conversion failed: {str(e)}"}

    try:
        transcript = transcribe_audio(wav_path)
        cleaned = clean_transcript(transcript)
        text_score = score_text_importance(cleaned)
        audio_score = score_audio_importance(wav_path)
        combined_score = round((text_score + audio_score) / 2, 2)
        summary = summarize_chunk(cleaned) if cleaned.strip() else ""
    finally:
        if os.path.exists(raw_path): os.remove(raw_path)
        if os.path.exists(wav_path): os.remove(wav_path)

    return {
        "transcript": cleaned,
        "importance_score": combined_score,
        "summary": summary
    }

@app.post("/generate-notes")
async def generate_notes(data: dict):
    summaries = data.get("summaries", [])
    transcripts = data.get("transcripts", [])

    if not summaries:
        return {"notes": "", "session_id": ""}

    numbered = "\n".join([
        f"{i+1}. {s.strip()}"
        for i, s in enumerate(summaries)
        if s.strip()
    ])
    ppt_context = data.get("ppt_text", "")
    pyq_context = data.get("pyq_text", "")

    extra_context = ""
    if ppt_context:
        extra_context += f"\n\nSLIDE CONTENT FROM PPT:\n{ppt_context[:1500]}"
    if pyq_context:
        extra_context += f"\n\nPREVIOUS YEAR EXAM QUESTIONS:\n{pyq_context[:1000]}"

    prompt = f"""You are an expert academic note-taker for university students. Below are sequential summaries extracted from a live lecture recording. Convert them into comprehensive, well-structured study notes.

LECTURE SUMMARIES (chronological order):
{numbered}
{extra_context}
Write detailed academic study notes using this EXACT structure in markdown:

# [Detect and write the actual main topic of this lecture]

## Overview
2-3 sentences describing what this lecture covers and why it matters to students.

## Core Concepts

For EACH distinct concept found in the summaries, write:

### [Concept Name]
**Definition:** Clear, precise definition.
**Explanation:** 3-5 sentences explaining how it works, a student can understand and memorize.
**Example:** Concrete example. Use one from the lecture if present.

## Key Relationships
How do the concepts connect or build on each other? Explain in bullet points.

## Important Facts to Remember
- Every specific fact, number, formula, named item, or technical term mentioned
- Each bullet is a standalone fact worth memorizing
- Include all named algorithms, methods, or models mentioned

## Exam Focus
4-6 likely exam questions based on this content, with brief answers.

## Summary
4-5 sentence paragraph tying everything together. A student reading only this should understand the full lecture scope.

STRICT RULES:
- Only use content present in the summaries. Never invent or hallucinate facts.
- Be thorough and detailed — students will study exclusively from these notes.
- If a concept appears across multiple summaries, combine all mentions into one rich section.
- Always fill in actual content — never write placeholder text like [concept name].
- Use proper academic English throughout."""

    notes = ""

    # Try Groq (free, Llama 3.3 70B)
    groq_key = os.getenv("GROQ_API_KEY", "")
    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=3000,
            )
            notes = response.choices[0].message.content
            print(f"[Notes] Generated via Groq llama-3.1-8b-instant — {len(notes)} chars")
        except Exception as e:
            print(f"[Notes] Groq error: {e}")

    # Try Anthropic if Groq fails
    if not notes:
        anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
        if anthropic_key:
            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    response = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "Content-Type": "application/json",
                            "x-api-key": anthropic_key,
                            "anthropic-version": "2023-06-01"
                        },
                        json={
                            "model": "claude-haiku-4-5-20251001",
                            "max_tokens": 3000,
                            "messages": [{"role": "user", "content": prompt}]
                        }
                    )
                    if response.status_code == 200:
                        notes = response.json()["content"][0]["text"]
                        print(f"[Notes] Generated via Anthropic — {len(notes)} chars")
                    else:
                        print(f"[Notes] Anthropic error: {response.status_code}")
            except Exception as e:
                print(f"[Notes] Anthropic error: {e}")

    # Try Gemini as third option
    if not notes:
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        if gemini_key:
            try:
                from google import genai as google_genai
                gclient = google_genai.Client(api_key=gemini_key)
                response = gclient.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt
                )
                notes = response.text
                print(f"[Notes] Generated via Gemini — {len(notes)} chars")
            except Exception as e:
                print(f"[Notes] Gemini error: {e}")

    # Last resort local model
    if not notes:
        print("[Notes] All APIs failed, using local fallback")
        combined = ". ".join(summaries[:6])
        from summarizer import _generate
        notes = _generate(
            f"List the main topics and key facts from: {combined}",
            max_new_tokens=300
        )

    session_id = save_session(summaries, notes)
    return {"notes": notes, "session_id": session_id}

@app.get("/session/{session_id}")
async def get_session_route(session_id: str):
    from fastapi import HTTPException
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# ── Subjects ──────────────────────────────────────────

@app.get("/subjects")
def list_subjects():
    return get_all_subjects()

@app.post("/subjects")
def add_subject(data: dict):
    return create_subject(
        data.get("name", "Untitled"),
        data.get("description", ""),
        data.get("color", "#6366f1")
    )

@app.delete("/subjects/{subject_id}")
def remove_subject(subject_id: str):
    delete_subject(subject_id)
    return {"ok": True}

# ── Lectures ──────────────────────────────────────────

@app.get("/subjects/{subject_id}/lectures")
def list_lectures(subject_id: str):
    return get_lectures_by_subject(subject_id)

@app.post("/subjects/{subject_id}/lectures")
async def add_lecture(
    subject_id: str,
    title: str = Form(...),
    ppt_file: UploadFile = File(None),
    pyq_file: UploadFile = File(None),
):
    ppt_text = ""
    pyq_text = ""

    if ppt_file and ppt_file.filename:
        ppt_path = f"uploads/ppt_{uuid.uuid4()}.pptx"
        with open(ppt_path, "wb") as f:
            shutil.copyfileobj(ppt_file.file, f)
        try:
            ppt_text = " ".join(extract_ppt_text(ppt_path))
        except Exception as e:
            print(f"PPT parse error: {e}")
        os.remove(ppt_path)

    if pyq_file and pyq_file.filename:
        pyq_path = f"uploads/pyq_{uuid.uuid4()}.pdf"
        with open(pyq_path, "wb") as f:
            shutil.copyfileobj(pyq_file.file, f)
        try:
            pyq_text = extract_pyq_text(pyq_path)
        except Exception as e:
            print(f"PYQ parse error: {e}")
        os.remove(pyq_path)

    lecture = create_lecture(subject_id, title, ppt_text, pyq_text)
    return lecture

@app.get("/lectures/{lecture_id}")
def get_lecture_route(lecture_id: str):
    from fastapi import HTTPException
    lecture = get_lecture(lecture_id)
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    return lecture

@app.delete("/lectures/{lecture_id}")
def remove_lecture(lecture_id: str):
    delete_lecture(lecture_id)
    return {"ok": True}

@app.post("/lectures/{lecture_id}/save")
async def save_lecture(lecture_id: str, data: dict):
    summaries = data.get("summaries", [])
    notes = data.get("notes", "")
    duration = data.get("duration", 0)
    update_lecture_notes(lecture_id, summaries, notes, duration)
    return {"ok": True}