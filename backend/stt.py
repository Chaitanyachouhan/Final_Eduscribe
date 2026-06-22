from faster_whisper import WhisperModel

model = WhisperModel("base", device="cpu", compute_type="int8")

def transcribe_audio(audio_path: str) -> str:
    segments, _ = model.transcribe(audio_path, beam_size=5)
    transcript = " ".join([seg.text for seg in segments])
    return transcript.strip()


if __name__ == "__main__":
    audio_file = "test.mp3"   # or test.wav
    result = transcribe_audio(audio_file)
    print("Transcript:")
    print(result)