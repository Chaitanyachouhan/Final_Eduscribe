from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer("all-MiniLM-L6-v2")

def align_with_context(transcript_chunk: str, context_texts: list[str]) -> float:
    if not context_texts:
        return 0.0
    chunk_emb = model.encode(transcript_chunk, convert_to_tensor=True)
    ctx_emb = model.encode(context_texts, convert_to_tensor=True)
    scores = util.cos_sim(chunk_emb, ctx_emb)
    return float(scores.max().item())