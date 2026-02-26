import { Apartment, DistrictNote, District, MemoMap, FolderMap } from '@/types';
import { CustomNote } from '@/lib/note-storage';
import ApartmentCard from './ApartmentCard';
import NoteCard from './NoteCard';
import MemoEditor from './MemoEditor';
import FolderDropdown from './FolderDropdown';

interface DistrictGridProps {
  apartments: Apartment[];
  notes: DistrictNote[];
  memos: MemoMap;
  folders: FolderMap;
  onSaveMemo: (apartmentId: string, content: string) => void;
  onDeleteMemo: (apartmentId: string) => void;
  onAddToFolder: (folderId: string, apartmentId: string) => void;
  onRemoveFromFolder: (folderId: string, apartmentId: string) => void;
  onQuickToggleFolder?: (folderId: string, apartmentId: string, isAdding: boolean) => void;
  isManageMode?: boolean;
  overlayChangedIds?: Set<string>;
  customAddedIds?: Set<string>;
  onOverlayChange?: () => void;
  highlightedApartmentId?: string | null;
  showProximity?: boolean;
  onSaveNote?: (noteId: string, content: string) => void;
  onDeleteNote?: (noteId: string) => void;
  customNotes?: CustomNote[];
  onAddNote?: (district: string) => void;
  newNoteId?: string | null; // 방금 추가된 커스텀 노트 ID (자동 편집모드용)
}

export default function DistrictGrid({
  apartments, notes, memos, folders,
  onSaveMemo, onDeleteMemo, onAddToFolder, onRemoveFromFolder, onQuickToggleFolder,
  isManageMode, overlayChangedIds, customAddedIds, onOverlayChange, highlightedApartmentId, showProximity,
  onSaveNote, onDeleteNote,
  customNotes, onAddNote, newNoteId,
}: DistrictGridProps) {
  const grouped = apartments.reduce<Record<string, Apartment[]>>((acc, apt) => {
    if (!acc[apt.district]) acc[apt.district] = [];
    acc[apt.district].push(apt);
    return acc;
  }, {});

  const districts = Object.keys(grouped) as District[];

  if (districts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-[#b4b4b0] text-sm">
        이 티어에 해당하는 아파트가 없습니다.
      </div>
    );
  }

  const hasFolders = Object.keys(folders).length > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {districts.map((district) => {
        const districtApts = grouped[district];
        const districtNotes = notes.filter(
          (n) => n.district === district && !n.apartmentId
        );
        const aptNotes = notes.filter(
          (n) => n.apartmentId && districtApts.some((a) => a.id === n.apartmentId)
        );
        const districtCustomNotes = (customNotes ?? []).filter(
          (n) => n.district === district
        );

        return (
          <div key={district} className="rounded-lg border border-[#e8e5e0] bg-white">
            <div className="px-3 py-2.5 border-b border-[#e8e5e0] bg-[#f7f7f5]">
              <h3 className="text-sm font-semibold text-[#37352f]">
                {district}
                <span className="ml-2 text-[11px] font-normal text-[#b4b4b0]">
                  {districtApts.length}개
                </span>
              </h3>
            </div>
            <div className="p-2 flex flex-col gap-1.5">
              {districtNotes.map((note, idx) => (
                <NoteCard
                  key={`dn-${idx}`}
                  content={note.content}
                  noteId={note.noteId}
                  onSave={onSaveNote}
                  onDelete={onDeleteNote}
                />
              ))}
              {districtCustomNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  content={note.content}
                  noteId={note.id}
                  onSave={onSaveNote}
                  onDelete={onDeleteNote}
                  isCustom={true}
                  isNew={note.id === newNoteId}
                />
              ))}
              {onAddNote && (
                <button
                  onClick={() => onAddNote(district)}
                  className="flex items-center gap-1 text-[11px] text-[#c4a03a] hover:text-[#8b6914] border border-dashed border-[#f1e5bc] hover:bg-[#fbf3db]/50 rounded-md px-2.5 py-1.5 opacity-50 hover:opacity-100 transition-all w-full"
                >
                  <span>💡</span>
                  <span>노트 추가</span>
                </button>
              )}
              {districtApts.map((apt) => {
                const aptNote = aptNotes.find((n) => n.apartmentId === apt.id);
                const hasMemo = !!memos[apt.id];
                return (
                  <div key={apt.id}>
                    <div className={hasMemo ? 'rounded-lg border border-[#e8e5e0] bg-white overflow-hidden' : ''}>
                      <ApartmentCard
                        apartment={apt}
                        folders={folders}
                        onQuickToggleFolder={onQuickToggleFolder}
                        folderSlot={hasFolders ? (
                          <FolderDropdown
                            apartmentId={apt.id}
                            folders={folders}
                            onAddToFolder={onAddToFolder}
                            onRemoveFromFolder={onRemoveFromFolder}
                          />
                        ) : undefined}
                        isManageMode={isManageMode}
                        isOverlayChanged={overlayChangedIds?.has(apt.id)}
                        isCustomAdded={customAddedIds?.has(apt.id)}
                        onOverlayChange={onOverlayChange}
                        isHighlighted={highlightedApartmentId === apt.id}
                        showProximity={showProximity}
                      />
                      {hasMemo && (
                        <div className="border-t border-dashed border-[#e8e5e0]">
                          <MemoEditor
                            apartmentId={apt.id}
                            initialMemo={memos[apt.id]}
                            onSave={onSaveMemo}
                            onDelete={onDeleteMemo}
                            inline
                          />
                        </div>
                      )}
                    </div>
                    {aptNote && (
                      <div className="mt-1 ml-2">
                        <NoteCard
                          content={aptNote.content}
                          noteId={aptNote.noteId}
                          onSave={onSaveNote}
                          onDelete={onDeleteNote}
                        />
                      </div>
                    )}
                    {!hasMemo && (
                      <MemoEditor
                        apartmentId={apt.id}
                        initialMemo={memos[apt.id]}
                        onSave={onSaveMemo}
                        onDelete={onDeleteMemo}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
