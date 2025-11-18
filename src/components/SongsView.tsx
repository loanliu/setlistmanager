import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { Song } from '../types';
import { SongTable } from './SongTable';
import { SongModal } from './SongModal';

export function SongsView() {
  const { songs, addSong, updateSong, deleteSong } = useApp();
  const [editingSong, setEditingSong] = useState<Song | undefined>();
  const [showModal, setShowModal] = useState(false);

  const handleAdd = () => {
    setEditingSong(undefined);
    setShowModal(true);
  };

  const handleEdit = (song: Song) => {
    setEditingSong(song);
    setShowModal(true);
  };

  const handleSubmit = (songData: Omit<Song, 'id'>) => {
    if (editingSong) {
      updateSong(editingSong.id, songData);
    } else {
      addSong(songData);
    }
    setShowModal(false);
    setEditingSong(undefined);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingSong(undefined);
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h1>Songs</h1>
        <button className="btn-primary" onClick={handleAdd}>
          + Add Song
        </button>
      </div>

      <SongTable songs={songs} onEdit={handleEdit} onDelete={deleteSong} />

      {showModal && (
        <SongModal
          song={editingSong}
          onClose={handleClose}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

