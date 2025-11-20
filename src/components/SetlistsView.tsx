import { useState } from 'react';
import { useApp } from '../state/AppContext';
import type { Setlist } from '../types';
import { SetlistList } from './SetlistList';
import { SetlistDetail } from './SetlistDetail';
import { SetlistForm } from './SetlistForm';

export function SetlistsView() {
  const { setlists, addSetlist, deleteSetlist } = useApp();
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleCreate = () => {
    setShowForm(true);
  };

  const handleSubmit = async (setlistData: Omit<Setlist, 'id' | 'items'>) => {
    try {
      await addSetlist(setlistData);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create setlist:', error);
    }
  };

  const handleSelect = (setlist: Setlist) => {
    setSelectedSetlist(setlist);
  };

  const handleBack = () => {
    setSelectedSetlist(null);
  };

  // Get the latest version of the selected setlist from context
  const currentSetlist = selectedSetlist 
    ? setlists.find((s) => s.id === selectedSetlist.id) || selectedSetlist
    : null;

  if (currentSetlist) {
    return <SetlistDetail setlist={currentSetlist} onBack={handleBack} />;
  }

  if (showForm) {
    return (
      <div className="view-container">
        <div className="view-header">
          <h1>New Setlist</h1>
          <button onClick={() => setShowForm(false)}>Cancel</button>
        </div>
        <SetlistForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1>Setlists</h1>
        <button className="btn-primary" onClick={handleCreate}>
          + New Setlist
        </button>
      </div>

      <SetlistList
        setlists={setlists}
        onSelect={handleSelect}
        onDelete={deleteSetlist}
      />
    </div>
  );
}

