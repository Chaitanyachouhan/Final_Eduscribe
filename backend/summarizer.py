from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

MODEL_NAME = "google/flan-t5-small"

print("Loading summarizer model...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
model.eval()
print("Summarizer model loaded.")

def _generate(prompt: str, max_new_tokens: int = 200) -> str:
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            num_beams=4,
            repetition_penalty=2.5,
            length_penalty=1.0,
            early_stopping=True
        )
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

def summarize_chunk(text: str) -> str:
    prompt = f"Extract key facts and concepts from this lecture segment: {text}"
    return _generate(prompt, max_new_tokens=150)

def generate_structured_notes(summaries: list, topic_hint: str = "") -> str:
    # This is now handled by the Anthropic API in main.py
    # This function is kept as fallback only
    combined = " | ".join(summaries)
    prompt = f"List the main topics and definitions from: {combined}"
    return _generate(prompt, max_new_tokens=300)