interface NoteCardProps {
  content: string;
}

export default function NoteCard({ content }: NoteCardProps) {
  return (
    <div className="flex gap-2 bg-[#fbf3db] border border-[#f1e5bc] rounded-md px-2.5 py-2 text-[11px] text-[#8b6914] leading-relaxed">
      <span className="shrink-0">💡</span>
      <span className="whitespace-pre-line">{content}</span>
    </div>
  );
}
