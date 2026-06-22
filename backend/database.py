from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# ── Subjects ──────────────────────────────────────────
def get_all_subjects():
    r = supabase.table("subjects").select("*").order("created_at", desc=False).execute()
    return r.data

def create_subject(name: str, description: str = "", color: str = "#6366f1"):
    r = supabase.table("subjects").insert({
        "name": name, "description": description, "color": color
    }).execute()
    return r.data[0]

def delete_subject(subject_id: str):
    supabase.table("subjects").delete().eq("id", subject_id).execute()

# ── Lectures ──────────────────────────────────────────
def get_lectures_by_subject(subject_id: str):
    r = supabase.table("lectures").select("*").eq("subject_id", subject_id).order("created_at", desc=True).execute()
    return r.data

def create_lecture(subject_id: str, title: str, ppt_text: str = "", pyq_text: str = ""):
    r = supabase.table("lectures").insert({
        "subject_id": subject_id,
        "title": title,
        "ppt_text": ppt_text,
        "pyq_text": pyq_text,
        "summaries": [],
        "notes": ""
    }).execute()
    return r.data[0]

def update_lecture_notes(lecture_id: str, summaries: list, notes: str, duration: int = 0):
    supabase.table("lectures").update({
        "summaries": summaries,
        "notes": notes,
        "duration_seconds": duration
    }).eq("id", lecture_id).execute()

def get_lecture(lecture_id: str):
    r = supabase.table("lectures").select("*").eq("id", lecture_id).execute()
    return r.data[0] if r.data else None

def delete_lecture(lecture_id: str):
    supabase.table("lectures").delete().eq("id", lecture_id).execute()

# Keep old save_session for backward compat
def save_session(summaries: list, notes: str) -> str:
    r = supabase.table("lectures").insert({
        "subject_id": None,
        "title": "Untitled Session",
        "summaries": summaries,
        "notes": notes
    }).execute()
    return r.data[0]["id"]

def get_session(session_id: str):
    return get_lecture(session_id)