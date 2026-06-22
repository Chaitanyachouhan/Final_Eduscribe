interface Chunk {
  transcript: string;
  importance_score: number;
  summary: string;
}

export default function ChunkLog({ chunks }: { chunks: Chunk[] }) {
  return (
    <div className="space-y-3">
      {[...chunks].reverse().map((chunk, i) => (
        <div key={i} className="border border-gray-800 rounded-xl p-4 bg-gray-900">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-600">Chunk {chunks.length - i}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              chunk.importance_score > 5
                ? "bg-red-900 text-red-300"
                : chunk.importance_score > 2
                ? "bg-yellow-900 text-yellow-300"
                : "bg-gray-800 text-gray-500"
            }`}>
              Score: {chunk.importance_score}
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-1">Transcript</p>
          <p className="text-xs text-gray-400 italic mb-2 leading-relaxed">"{chunk.transcript}"</p>
          <p className="text-xs text-gray-600 mb-1">Summary</p>
          <p className="text-sm text-gray-200 leading-relaxed">{chunk.summary}</p>
        </div>
      ))}
    </div>
  );
}