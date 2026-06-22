import re

FILLER_WORDS = {"uh", "um", "okay", "so", "like", "right", "you know", "alright"}

def clean_transcript(text: str) -> str:
    text = re.sub(r'\b(' + '|'.join(FILLER_WORDS) + r')\b', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

