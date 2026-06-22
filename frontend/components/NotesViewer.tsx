import ReactMarkdown from "react-markdown";

interface Props {
  notes: string;
  sessionId: string;
  isUpdating?: boolean;
}

export default function NotesViewer({ notes, sessionId, isUpdating }: Props) {
  return (
    <div className={`transition-opacity duration-300 ${isUpdating ? "opacity-50" : "opacity-100"}`}>
      <div className="prose prose-invert prose-sm max-w-none
        prose-headings:font-semibold
        prose-h1:text-xl prose-h1:text-white prose-h1:border-b prose-h1:border-gray-700 prose-h1:pb-2 prose-h1:mb-4
        prose-h2:text-base prose-h2:text-gray-200 prose-h2:mt-6 prose-h2:mb-3
        prose-h3:text-sm prose-h3:text-gray-300 prose-h3:mt-4 prose-h3:mb-2
        prose-p:text-gray-400 prose-p:leading-relaxed prose-p:text-sm
        prose-strong:text-gray-200 prose-strong:font-medium
        prose-li:text-gray-400 prose-li:text-sm
        prose-ul:my-2 prose-li:my-0.5
        prose-hr:border-gray-800">
        <ReactMarkdown>{notes}</ReactMarkdown>
      </div>
      {sessionId && (
        <p className="text-xs text-gray-800 mt-6">Session {sessionId.slice(0, 8)}</p>
      )}
    </div>
  );
}