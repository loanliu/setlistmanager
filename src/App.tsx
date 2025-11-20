import { useState } from 'react';
import { SongsView } from './components/SongsView';
import { SetlistList } from './components/SetlistList';
import { SetlistDetail } from './components/SetlistDetail';
import { SetlistForm } from './components/SetlistForm';
import { useApp } from './state/AppContext';
import type { Setlist } from './types';
import './App.css';

function App() {
  const { isLoading, error, clearError, setlists, addSetlist, deleteSetlist } = useApp();
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [showNewSetlistForm, setShowNewSetlistForm] = useState(false);
  const [addSongToSetlistCallback, setAddSongToSetlistCallback] = useState<((songId: string) => void) | null>(null);
  const [isSongInSetlistCallback, setIsSongInSetlistCallback] = useState<((songId: string) => boolean) | null>(null);
  const [currentSetlistSongIds, setCurrentSetlistSongIds] = useState<string[]>([]);

  const handleSelectSetlist = (setlist: Setlist) => {
    setSelectedSetlist(setlist);
    setShowNewSetlistForm(false);
    // Initialize the song IDs array with the setlist's current items
    setCurrentSetlistSongIds(setlist.items.map(item => item.songId));
  };

  const handleLoadEmptySetlist = () => {
    setSelectedSetlist(null);
    setShowNewSetlistForm(true);
  };

  const handleCreateSetlist = async (setlistData: Omit<Setlist, 'id' | 'items'>) => {
    try {
      await addSetlist(setlistData);
      setShowNewSetlistForm(false);
    } catch (error) {
      console.error('Failed to create setlist:', error);
    }
  };

  const handleBackFromDetail = () => {
    setSelectedSetlist(null);
    setAddSongToSetlistCallback(null);
  };

  // Get the latest version of the selected setlist from context
  const currentSetlist = selectedSetlist 
    ? setlists.find((s) => s.id === selectedSetlist.id) || selectedSetlist
    : null;

  return (
    <div className="app">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={clearError} className="error-close">×</button>
        </div>
      )}

      <main className="app-main three-column-layout">
        {isLoading ? (
          <div className="loading-state">Loading...</div>
        ) : (
          <>
            {/* Left Column: Previous Setlists */}
            <div className="column-left">
              <div className="column-header">
                <h2>Previous setlists</h2>
              </div>
              <button className="btn-primary btn-load-empty" onClick={handleLoadEmptySetlist}>
                Load empty setlist
              </button>
              <SetlistList
                setlists={setlists}
                onSelect={handleSelectSetlist}
                onDelete={deleteSetlist}
                selectedSetlistId={currentSetlist?.id}
              />
            </div>

            {/* Middle Column: Current Setlist */}
            <div className="column-middle">
              {showNewSetlistForm ? (
                <div className="column-content">
                  <div className="column-header">
                    <h2>New Setlist</h2>
                    <button className="btn-back" onClick={() => setShowNewSetlistForm(false)}>
                      Cancel
                    </button>
                  </div>
                  <SetlistForm onSubmit={handleCreateSetlist} onCancel={() => setShowNewSetlistForm(false)} />
                </div>
              ) : currentSetlist ? (
                <SetlistDetail 
                  setlist={currentSetlist} 
                  onBack={handleBackFromDetail}
                  onRegisterAddSong={(callback) => {
                    setAddSongToSetlistCallback(() => callback);
                  }}
                  onRegisterIsSongInSetlist={(callback) => {
                    setIsSongInSetlistCallback(() => callback);
                  }}
                  onSetlistItemsChange={(itemIds) => {
                    setCurrentSetlistSongIds(itemIds);
                  }}
                />
              ) : (
                <div className="column-content">
                  <div className="column-header">
                    <h2>Setlist</h2>
                  </div>
                  <div className="empty-state">
                    <p>Select a setlist from the left or create a new one to get started.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Songs */}
            <div className="column-right">
              <SongsView 
                selectedSetlist={currentSetlist}
                onAddToSetlist={addSongToSetlistCallback || undefined}
                isSongInSetlist={isSongInSetlistCallback || undefined}
                currentSetlistSongIds={currentSetlistSongIds}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
