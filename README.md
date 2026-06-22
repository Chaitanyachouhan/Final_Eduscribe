# EduScribe

EduScribe is a comprehensive application for processing live lecture recordings. It records audio, transcribes it in real-time, extracts key concepts, calculates an "importance score" based on speech tone and keywords, and generates structured, highly detailed academic notes using AI.

## Project Structure

- **`/backend`**: A Python-based REST API built with FastAPI. It handles audio processing (Whisper), importance scoring, database interactions (Supabase), and communicates with LLMs (Groq, Anthropic, Gemini) for generating notes.
- **`/frontend`**: A Next.js application (React) styled with Tailwind CSS, providing the user interface for recording lectures and viewing notes.

---

## Prerequisites

Before running this project locally, ensure you have the following installed on your machine:

1. **Python 3.9+**
2. **Node.js (v18+) and npm**
3. **FFmpeg**: Required for audio processing (`pydub` needs it to convert audio files). 
   - **Windows**: Download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) or install via winget (`winget install ffmpeg`).
   - **Mac**: `brew install ffmpeg`
   - **Linux**: `sudo apt install ffmpeg`

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/eduscribe.git
cd eduscribe
```

### 2. Backend Setup

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
```

**Step 2.1: Create and activate a Virtual Environment**
```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate
```

**Step 2.2: Install Dependencies**
```bash
pip install -r requirements.txt
```

**Step 2.3: Environment Variables**
Create a `.env` file in the `backend` directory with the following variables:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Add at least one of these LLM keys for the notes generation feature
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key
```

**Step 2.4: Run the Backend Server**
```bash
uvicorn main:app --reload
```
The backend API will be available at `http://localhost:8000`.

---

### 3. Frontend Setup

Open a *new* terminal window and navigate to the `frontend` directory:

```bash
cd frontend
```

**Step 3.1: Install Dependencies**
```bash
npm install
```

**Step 3.2: Environment Variables**
Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Step 3.3: Run the Development Server**
```bash
npm run dev
```
The frontend application will be available at `http://localhost:3000`.

---

## Usage

1. Start both the backend and frontend servers.
2. Open your browser and navigate to `http://localhost:3000`.
3. Create a Subject and add a Lecture. You can upload contextual documents (PPTX or PDF) to improve note accuracy.
4. Hit the "Record" button to start processing your live lecture!
