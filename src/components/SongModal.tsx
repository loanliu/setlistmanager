import { Song } from '../types';
import { SongForm } from './SongForm';

interface SongModalProps {
  song?: Song;
  onClose: () => void;
  onSubmit: (song: Omit<Song, 'id'>) => void;
}

export function SongModal({ song, onClose, onSubmit }: SongModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{song ? 'Edit Song' : 'Add New Song'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <SongForm song={song} onSubmit={onSubmit} onCancel={onClose} />
      </div>
    </div>
  );
}

