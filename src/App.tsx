import { useState } from 'react';
import { SongsView } from './components/SongsView';
import { SetlistsView } from './components/SetlistsView';
import './App.css';

type View = 'songs' | 'setlists';

function App() {
  const [currentView, setCurrentView] = useState<View>('songs');

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Setlist Manager</h1>
        <nav className="app-nav">
          <button
            className={`nav-button ${currentView === 'songs' ? 'active' : ''}`}
            onClick={() => setCurrentView('songs')}
          >
            Songs
          </button>
          <button
            className={`nav-button ${currentView === 'setlists' ? 'active' : ''}`}
            onClick={() => setCurrentView('setlists')}
          >
            Setlists
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'songs' && <SongsView />}
        {currentView === 'setlists' && <SetlistsView />}
      </main>
    </div>
  );
}

export default App;
