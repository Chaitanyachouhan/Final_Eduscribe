# EduScribe Backend - Context Analysis

This document provides a detailed architectural and functional analysis of the `d:\eduscribe\backend` folder. It is intended to serve as context for an LLM to understand the backend's structure, components, and data flow.

## 1. Overview
The backend is a Python-based REST API built using **FastAPI**. It provides services for an application called "EduScribe," which appears to be a tool for processing lecture recordings, extracting transcriptions, calculating importance scores, summarizing the content, and generating structured study notes using multiple LLMs. It also manages subjects and lectures via a **Supabase** database.

## 2. Core Technologies
- **Web Framework**: FastAPI
- **Database**: Supabase (via `supabase-py` client)
- **Audio Processing**: `pydub`, `librosa` (for audio features like RMS and pitch)
- **Speech-to-Text (STT)**: `faster_whisper` (running locally on CPU)
- **Machine Learning / NLP**: 
  - HuggingFace `transformers` (`google/flan-t5-small` for local summarization)
  - `sentence-transformers` (`all-MiniLM-L6-v2` for semantic alignment)
- **Document Parsing**: `python-pptx` (for PowerPoint), `PyMuPDF` / `fitz` (for PDF)
- **External LLM APIs**: Groq, Anthropic, Google Gemini (used for generating detailed notes)

## 3. Module Breakdown

### `main.py`
The entry point of the application. It configures the FastAPI app, sets up CORS (allowing `http://localhost:3000`), and defines all the API routes:
- **Audio Processing Route (`POST /process-chunk`)**: 
  - Accepts a `webm` audio chunk from the frontend.
  - Converts it to `wav` using `pydub`.
  - Transcribes audio (`stt.py`).
  - Cleans the transcript (`text_cleaner.py`).
  - Calculates combined text and audio importance scores (`importance_scorer.py`).
  - Generates a local short summary (`summarizer.py`).
  - Returns the cleaned transcript, importance score, and summary.
- **Notes Generation Route (`POST /generate-notes`)**:
  - Accepts a collection of chunk summaries and transcripts.
  - Injects contextual data (PowerPoint text and Previous Year Question text).
  - Constructs a highly detailed prompt to generate structured academic notes.
  - Uses a waterfall pattern for LLM generation:
    1. **Groq** (`llama-3.1-8b-instant`)
    2. **Anthropic** (`claude-haiku-4-5-20251001` via `httpx`)
    3. **Google Gemini** (`gemini-2.0-flash` via `google-genai`)
    4. **Local Fallback** (`flan-t5-small` via `summarizer.py`)
- **Database Routes**:
  - `Subjects`: CRUD operations (`/subjects`).
  - `Lectures`: CRUD operations under subjects (`/subjects/{subject_id}/lectures`), which also handles uploading `.pptx` and `.pdf` files to extract text context. Endpoint `/lectures/{lecture_id}/save` saves the final summaries and notes to the DB.

### `database.py`
Handles all interactions with Supabase. 
- Loads `SUPABASE_URL` and `SUPABASE_KEY` from `.env`.
- Contains functions to create, read, update, and delete records in the `subjects` and `lectures` tables.
- The `lectures` table stores metadata like `ppt_text`, `pyq_text`, `summaries` (list), and `notes` (string).

### Machine Learning & Data Processing Modules
- **`stt.py`**: Initializes a local `faster_whisper` `base` model. Exposes `transcribe_audio(audio_path)` to perform speech recognition.
- **`summarizer.py`**: Loads `google/flan-t5-small` using HuggingFace `transformers`. Exposes `summarize_chunk()` for quick, local generation of brief facts from a transcript chunk.
- **`importance_scorer.py`**: 
  - `score_text_importance()`: Uses a rule-based approach, giving points for specific keywords (e.g., "important", "exam") and word repetition.
  - `score_audio_importance()`: Uses `librosa` to analyze the audio file, scoring based on average loudness (RMS) and pitch variance.
- **`aligner.py`**: Uses `sentence_transformers` to calculate cosine similarity between a transcript chunk and context texts. (Useful for determining if the speaker is talking about content present in a PPT/PDF).
- **`text_cleaner.py`**: Uses regex to remove common filler words ("uh", "um", "like", etc.) from the transcript.

### Document Parsers
- **`ppt_parser.py`**: Uses `pptx.Presentation` to extract all text from PowerPoint slides.
- **`pyq_parser.py`**: Uses `fitz` (PyMuPDF) to extract text from PDF files (Previous Year Questions).

## 4. Key Workflows

### 1. Live Lecture Processing (Chunking)
1. Frontend records audio in chunks and sends them to `POST /process-chunk`.
2. Backend receives `.webm`, converts to `.wav`.
3. Backend runs Whisper STT -> Cleans text -> Computes Importance Score -> Summarizes the chunk locally.
4. Returns the chunk data to the frontend for real-time display.

### 2. Post-Lecture Notes Generation
1. Once the lecture ends, the frontend sends all accumulated summaries to `POST /generate-notes`.
2. Backend gathers any existing PPT or PYQ context linked to the lecture.
3. Backend pings Groq (or Anthropic/Gemini) to generate comprehensive, structured markdown notes based on the chunk summaries.
4. The final notes are saved to the Supabase database via `POST /lectures/{lecture_id}/save`.

## 5. Environment Requirements
- API keys required in `.env`: `SUPABASE_URL`, `SUPABASE_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`.
- Python dependencies (from `requirements.txt`): `fastapi`, `uvicorn`, `python-multipart`, `librosa`, `soundfile`, `numpy`, `sentence-transformers`, `transformers`, `pydub`, `python-dotenv`, `supabase`, `PyMuPDF`, `python-pptx`, `httpx`. (Note: `faster-whisper` is used in the code but may need to be explicitly installed as it's missing from `requirements.txt`).
