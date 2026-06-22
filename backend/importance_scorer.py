import re
from collections import Counter

IMPORTANCE_KEYWORDS = ["important", "remember", "note this", "exam", "key concept", "definition", "formula"]

def score_text_importance(text: str) -> float:
    score = 0.0
    text_lower = text.lower()
    
    for kw in IMPORTANCE_KEYWORDS:
        if kw in text_lower:
            score += 1.5
    
    words = re.findall(r'\b\w+\b', text_lower)
    word_freq = Counter(words)
    repetition_bonus = sum(1 for count in word_freq.values() if count > 2)
    score += repetition_bonus * 0.3
    
    return min(score, 10.0)  # cap at 10


import librosa
import numpy as np

def score_audio_importance(audio_path: str) -> float:
    y, sr = librosa.load(audio_path, sr=None)
    rms = librosa.feature.rms(y=y)[0]
    avg_loudness = np.mean(rms)
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
    pitch_variance = np.var(pitches[pitches > 0]) if np.any(pitches > 0) else 0
    score = float(avg_loudness * 10 + pitch_variance * 0.001)
    return min(score, 10.0)