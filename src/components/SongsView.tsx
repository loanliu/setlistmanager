import { useState, useMemo } from 'react';
import { useApp } from '../state/AppContext';
import type { Song, Setlist } from '../types';
import { SongTable } from './SongTable';
import { SongModal } from './SongModal';

interface SongsViewProps {
  selectedSetlist?: Setlist | null;
  onAddToSetlist?: (songId: string) => void;
  isSongInSetlist?: (songId: string) => boolean;
  currentSetlistSongIds?: string[];
}

export function SongsView({ selectedSetlist, onAddToSetlist, isSongInSetlist, currentSetlistSongIds }: SongsViewProps = {}) {
  const { songs, addSong, updateSong, deleteSong } = useApp();
  const [editingSong, setEditingSong] = useState<Song | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKey, setFilterKey] = useState<string>('all');
  const [filterSinger, setFilterSinger] = useState<string>('all');

  const handleAdd = () => {
    setEditingSong(undefined);
    setShowModal(true);
  };

  const handleEdit = (song: Song) => {
    setEditingSong(song);
    setShowModal(true);
  };

  const handleSubmit = async (songData: Omit<Song, 'id'>) => {
    try {
      if (editingSong) {
        await updateSong(editingSong.id, songData);
      } else {
        await addSong(songData);
      }
      // Close modal after successful save
      setShowModal(false);
      setEditingSong(undefined);
    } catch (error) {
      // Error is already handled in context, just keep modal open
      console.error('Failed to save song:', error);
      // Don't close modal on error so user can try again
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingSong(undefined);
  };

  // Get unique keys and singers for filter dropdowns
  const uniqueKeys = useMemo(() => {
    const keys = new Set<string>();
    songs.forEach((song) => {
      if (song.key) keys.add(song.key);
    });
    return Array.from(keys).sort();
  }, [songs]);

  const uniqueSingers = useMemo(() => {
    const singers = new Set<string>();
    songs.forEach((song) => {
      if (song.singer) singers.add(song.singer);
    });
    return Array.from(singers).sort();
  }, [songs]);

  // Filter songs based on search and filters
  const filteredSongs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    return songs.filter((song) => {
      // Search filter (title, artist, singer)
      if (query) {
        const matchesTitle = song.title.toLowerCase().includes(query);
        const matchesArtist = song.artist?.toLowerCase().includes(query) || false;
        const matchesSinger = song.singer?.toLowerCase().includes(query) || false;
        if (!matchesTitle && !matchesArtist && !matchesSinger) {
          return false;
        }
      }

      // Key filter
      if (filterKey !== 'all' && song.key !== filterKey) {
        return false;
      }

      // Singer filter
      if (filterSinger !== 'all' && song.singer !== filterSinger) {
        return false;
      }

      return true;
    });
  }, [songs, searchQuery, filterKey, filterSinger]);

  return (
    <div className="column-content">
      <div className="column-header">
        <h2>Songs</h2>
        <button className="btn-primary" onClick={handleAdd}>
          New song
        </button>
      </div>

      <div className="songs-filters">
        <div className="filter-group">
          <input
            type="text"
            className="search-input"
            placeholder="Search by title, artist, or singer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select
            className="filter-select"
            value={filterKey}
            onChange={(e) => setFilterKey(e.target.value)}
          >
            <option value="all">All Keys</option>
            {uniqueKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <select
            className="filter-select"
            value={filterSinger}
            onChange={(e) => setFilterSinger(e.target.value)}
          >
            <option value="all">All Singers</option>
            {uniqueSingers.map((singer) => (
              <option key={singer} value={singer}>
                {singer}
              </option>
            ))}
          </select>
        </div>
        {(searchQuery || filterKey !== 'all' || filterSinger !== 'all') && (
          <button
            className="btn-clear-filters"
            onClick={() => {
              setSearchQuery('');
              setFilterKey('all');
              setFilterSinger('all');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <SongTable 
        songs={filteredSongs} 
        onEdit={handleEdit} 
        onDelete={deleteSong}
        selectedSetlist={selectedSetlist}
        onAddToSetlist={onAddToSetlist}
        isSongInSetlist={isSongInSetlist}
        currentSetlistSongIds={currentSetlistSongIds}
      />

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

