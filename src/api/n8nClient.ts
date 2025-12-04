/**
 * n8n API Client
 * 
 * This client communicates with n8n webhooks that interface with Google Sheets.
 * 
 * Expected JSON Formats:
 * 
 * GET /songs (VITE_N8N_GET_SONGS_URL)
 * Returns: { songs: Song[] }
 * Example:
 * {
 *   "songs": [
 *     {
 *       "id": "uuid-string",
 *       "title": "Song Title",
 *       "artist": "Artist Name",
 *       "singer": "Singer Name",
 *       "key": "C",
 *       "notes": "Optional notes"
 *     }
 *   ]
 * }
 * 
 * POST /songs (VITE_N8N_SAVE_SONG_URL)
 * Sends: { song: Song, mode: "create" | "update" }
 * Returns: { song: Song }
 * Example request (create):
 * {
 *   "song": {
 *     "title": "Song Title",
 *     "artist": "Artist Name",
 *     "singer": "Singer Name",
 *     "key": "C",
 *     "notes": "Optional notes"
 *   },
 *   "mode": "create"
 * }
 * Example request (update):
 * {
 *   "song": {
 *     "id": "uuid-string",
 *     "title": "Song Title",
 *     "artist": "Artist Name",
 *     "singer": "Singer Name",
 *     "key": "C",
 *     "notes": "Optional notes"
 *   },
 *   "mode": "update"
 * }
 * Example response:
 * {
 *   "song": {
 *     "id": "uuid-string",
 *     "title": "Song Title",
 *     "artist": "Artist Name",
 *     "singer": "Singer Name",
 *     "key": "C",
 *     "notes": "Optional notes"
 *   }
 * }
 * 
 * POST/DELETE /songs/:id (VITE_N8N_DELETE_SONG_URL)
 * Sends: { id: string }
 * Returns: { success: true } or empty response
 * 
 * GET /setlists (VITE_N8N_GET_SETLISTS_URL)
 * Returns: { setlists: SetlistWithItems[] }
 * Example:
 * {
 *   "setlists": [
 *     {
 *       "id": "uuid-string",
 *       "name": "Friday Night Gig",
 *       "venue": "The Blue Note",
 *       "city": "New York",
 *       "date": "2024-12-20",
 *       "notes": "First set starts at 9pm",
 *       "items": [
 *         {
 *           "id": "uuid-string",
 *           "songId": "song-uuid",
 *           "position": 0,
 *           "keyOverride": "D",
 *           "singerOverride": "John",
 *           "notes": "Optional item notes"
 *         }
 *       ]
 *     }
 *   ]
 * }
 * 
 * POST /setlists (VITE_N8N_SAVE_SETLIST_URL)
 * Sends: { setlist: SetlistTopLevel, mode: "create" | "update" }
 * Returns: { setlist: SetlistWithItems } or { success: true, setlist: {...} }
 * 
 * For updating top-level setlist fields only (not items):
 * Example request (update):
 * {
 *   "setlist": {
 *     "id": 1,
 *     "name": "Friday Night Gig",
 *     "venue": "The Blue Note",
 *     "city": "New York",
 *     "date": "2024-12-20",
 *     "notes": "First set starts at 9pm"
 *   },
 *   "mode": "update"
 * }
 * 
 * Example request (create):
 * {
 *   "setlist": {
 *     "name": "Friday Night Gig",
 *     "venue": "The Blue Note",
 *     "city": "New York",
 *     "date": "2024-12-20",
 *     "notes": "First set starts at 9pm"
 *   },
 *   "mode": "create"
 * }
 * 
 * Note: When updating top-level fields, items are NOT sent.
 * Example response:
 * {
 *   "setlist": {
 *     "id": "uuid-string",
 *     "name": "Friday Night Gig",
 *     "venue": "The Blue Note",
 *     "city": "New York",
 *     "date": "2024-12-20",
 *     "notes": "First set starts at 9pm",
 *     "items": [
 *       {
 *         "id": "uuid-string",
 *         "songId": "song-uuid",
 *         "position": 0,
 *         "keyOverride": "D",
 *         "singerOverride": "John",
 *         "notes": "Optional item notes"
 *       }
 *     ]
 *   }
 * }
 * 
 * POST/DELETE /setlists/:id (VITE_N8N_DELETE_SETLIST_URL)
 * Sends: { id: string }
 * Returns: { success: true } or empty response
 */

import type { Song, Setlist, SetlistItem } from '../types';

export type SongInput = Omit<Song, 'id'> & { id?: string };
export type SetlistWithItems = Setlist;
export type SetlistWithItemsInput = Omit<Setlist, 'id'> & { id?: string };

const getEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    console.warn(`Environment variable ${key} is not set. API calls will fail.`);
    console.warn(`Available env vars:`, Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
  } else {
    console.log(`✓ Loaded ${key}: ${value.substring(0, 50)}...`);
  }
  return value || '';
};

const API_BASE = {
  GET_SONGS: getEnvVar('VITE_N8N_GET_SONGS_URL'),
  SAVE_SONG: getEnvVar('VITE_N8N_SAVE_SONG_URL'),
  DELETE_SONG: getEnvVar('VITE_N8N_DELETE_SONG_URL'),
  GET_SETLISTS: getEnvVar('VITE_N8N_GET_SETLISTS_URL'),
  SAVE_SETLIST: getEnvVar('VITE_N8N_SAVE_SETLIST_URL'),
  SAVE_SETLIST_ITEM: getEnvVar('VITE_N8N_SAVE_SETLIST_ITEM_URL'),
  DELETE_SETLIST: getEnvVar('VITE_N8N_DELETE_SETLIST_URL'),
};

async function apiCall<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  if (!url) {
    throw new Error('API URL is not configured. Please set the environment variable.');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('API call failed:', {
      status: response.status,
      statusText: response.statusText,
      url,
      errorText
    });
    throw new Error(`API call failed: ${response.status} ${response.statusText}. ${errorText}`);
  }

  // Handle empty responses (e.g., DELETE operations)
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.log('Non-JSON response, returning empty object');
    return {} as T;
  }

  try {
    const jsonData = await response.json();
    console.log('API response:', jsonData);
    return jsonData;
  } catch (parseError) {
    console.error('Failed to parse JSON response:', parseError);
    throw new Error('Invalid JSON response from server');
  }
}

export async function fetchSongs(): Promise<Song[]> {
  try {
    const data = await apiCall<any>(API_BASE.GET_SONGS);
    
    console.log('Raw n8n response:', data);
    console.log('Response type:', Array.isArray(data) ? 'Array' : typeof data);
    
    // Handle different response formats from n8n
    let songs: any[] = [];
    
    // If response has a 'songs' property (expected format)
    if (data.songs && Array.isArray(data.songs)) {
      songs = data.songs;
      console.log(`Found ${songs.length} songs in data.songs`);
    }
    // If response is directly an array
    else if (Array.isArray(data)) {
      songs = data;
      console.log(`Found ${songs.length} songs in array response`);
    }
    // If response is a single object, wrap it in an array
    else if (data && typeof data === 'object') {
      // Check if it might be an object with array-like structure
      // Some n8n responses might be objects with numeric keys
      const keys = Object.keys(data);
      const numericKeys = keys.filter(k => !isNaN(Number(k)));
      if (numericKeys.length > 0) {
        // It's an object with numeric keys, convert to array
        songs = Object.values(data);
        console.log(`Found ${songs.length} songs in object with numeric keys`);
      } else {
        // Single object
        songs = [data];
        console.log('Single object response, wrapping in array');
      }
    }
    
    console.log(`Total songs to process: ${songs.length}`);
    
    // Map n8n response format to our Song type
    const mappedSongs = songs.map((item: any, index: number) => {
      // Handle database response format where 'songid' is the song identifier
      // and 'id' might be the database row ID
      // Prefer 'songid' if it exists, otherwise use 'id' or 'songId'
      const songId = item.songid !== undefined ? item.songid : (item.id || item.songId);
      
      const song = {
        id: String(songId || `temp-${index}-${Date.now()}`),
        title: item.title || '',
        artist: item.artist || undefined,
        singer: item.singer || undefined,
        key: item.key || undefined,
        tempoBmp: item.tempoBmp || undefined,
        notes: item.notes || undefined,
      };
      
      // Generate a proper UUID if we used a temp ID
      if (song.id.startsWith('temp-')) {
        song.id = crypto.randomUUID();
      }
      
      return song;
    });
    
    console.log(`Successfully mapped ${mappedSongs.length} songs`);
    return mappedSongs;
  } catch (error) {
    console.error('Failed to fetch songs:', error);
    throw error;
  }
}

export async function saveSong(song: SongInput, explicitMode?: 'create' | 'update'): Promise<Song> {
  try {
    // Use explicit mode if provided, otherwise determine from song.id
    const mode = explicitMode || (song.id ? 'update' : 'create');
    
    // Build the song payload - always include all fields
    const songPayload: any = {
      title: song.title || '',
      artist: song.artist || '',
      singer: song.singer || '',
      key: song.key || '',
      tempoBmp: song.tempoBmp || '',
      notes: song.notes || '',
    };
    
    // Only include id if it exists (for updates)
    if (song.id) {
      songPayload.id = song.id;
    }
    
    const requestBody = {
      song: songPayload,
      mode
    };
    
    console.log(`Saving song in ${mode} mode:`, JSON.stringify(requestBody, null, 2));
    console.log('Full request body:', requestBody);
    
    const data = await apiCall<any>(API_BASE.SAVE_SONG, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    console.log('Full API response:', data);
    console.log('Response type:', typeof data);
    console.log('Is array?', Array.isArray(data));
    
    // Handle different response formats from n8n
    let songData: any = null;
    
    // Handle null/undefined
    if (!data) {
      console.error('Response is null or undefined');
      throw new Error('Empty response from server');
    }
    
    // Check if n8n returned a "Workflow was started" message (async workflow)
    // In this case, we need to refetch the song to get the updated data
    if (data && typeof data === 'object' && data.message && 
        (data.message === 'Workflow was started' || data.message.includes('started'))) {
      console.log('Detected async workflow response. Refetching songs to get updated data...');
      
      // For async workflows, wait a bit and retry fetching the song
      // We'll try a few times since the database update might take a moment
      // For creates, we need a bit more time since it's a new record
      const maxRetries = mode === 'create' ? 5 : 3;
      const retryDelay = mode === 'create' ? 1000 : 800; // milliseconds - longer for creates
      let updatedSong: Song | undefined;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`Refetch attempt ${attempt}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        const allSongs = await fetchSongs();
        
        // Find the updated song by ID (for updates) or title (for creates)
        const songIdToFind = song.id || songPayload.id;
        
        if (mode === 'update' && songIdToFind) {
          // For updates, prioritize matching by ID
          updatedSong = allSongs.find(s => s.id === String(songIdToFind));
        }
        
        // For creates or if update didn't find by ID, search by title + artist
        // This is important for creates since the database might generate a different ID
        if (!updatedSong && song.title) {
          updatedSong = allSongs.find(s => {
            // Must match title exactly
            if (s.title !== song.title) {
              return false;
            }
            
            // For artist matching: 
            // - If both have artist, they must match
            // - If both missing artist, that's fine (match by title only)
            // - If one has artist and one doesn't, don't match (to avoid false positives)
            const songHasArtist = song.artist && song.artist.trim() !== '';
            const sHasArtist = s.artist && s.artist.trim() !== '';
            
            if (songHasArtist && sHasArtist) {
              return s.artist === song.artist; // Both have artist, must match
            } else if (!songHasArtist && !sHasArtist) {
              return true; // Both missing artist, match by title
            } else {
              return false; // One has artist, one doesn't - don't match
            }
          });
        }
        
        if (updatedSong) {
          console.log(`Found ${mode} song after refetch (attempt ${attempt}):`, updatedSong);
          // Return the found song directly
          return updatedSong;
        }
        
        console.log(`Song not found yet, will retry...`);
      }
      
      // If we still can't find it after retries, construct from input data
      console.warn('Could not find updated song after retries. Using input data as fallback.');
      const fallbackSong: Song = {
        id: String(song.id || songPayload.id || ''),
        title: song.title || '',
        artist: song.artist,
        singer: song.singer,
        key: song.key,
        tempoBmp: song.tempoBmp,
        notes: song.notes,
      };
      return fallbackSong;
    }
    
    // Check if response is an array (database response format)
    // This is the most common format: [{ songid: 49, ... }]
    if (Array.isArray(data)) {
      if (data.length === 0) {
        throw new Error('Empty response array from server');
      }
      // Take the first element from the array
      songData = data[0];
      console.log('Extracted song from array response:', songData);
    }
    // Check if response is wrapped in an object with array property
    // Some n8n workflows return { data: [...] } or { items: [...] }
    else if (data && typeof data === 'object') {
      // Check for common wrapper keys
      if (Array.isArray(data.data)) {
        songData = data.data[0];
        console.log('Extracted song from data array:', songData);
      }
      else if (Array.isArray(data.items)) {
        songData = data.items[0];
        console.log('Extracted song from items array:', songData);
      }
      else if (Array.isArray(data.result)) {
        songData = data.result[0];
        console.log('Extracted song from result array:', songData);
      }
      // Check if response has a nested 'song' property (old format)
      else if (data.song) {
        songData = data.song;
        console.log('Extracted song from nested response:', songData);
      }
      // Check if response is the song object directly (has required song fields)
      else if (data.id || data.songid || data.title) {
        songData = data;
        console.log('Using response as song object directly:', songData);
      }
      else {
        console.error('Unexpected response format. Data:', data);
        console.error('Data type:', typeof data);
        console.error('Data keys:', Object.keys(data));
        console.error('Full data stringified:', JSON.stringify(data, null, 2));
        throw new Error(`Invalid response format from server. Received: ${JSON.stringify(data)}`);
      }
    }
    else {
      console.error('Response is not an object or array. Type:', typeof data);
      throw new Error(`Invalid response format from server. Expected object/array, got ${typeof data}`);
    }
    
    // Final validation - ensure we have song data
    if (!songData || (typeof songData !== 'object')) {
      console.error('Failed to extract song data. songData:', songData);
      throw new Error('Could not extract song data from response');
    }
    
    // Map database fields to Song type
    // Handle both 'id' (database row ID) and 'songid' (song identifier)
    // Prefer 'songid' if it exists, otherwise use 'id'
    const songId = songData.songid !== undefined ? songData.songid : songData.id;
    
    // Ensure all fields are present
    const completeSong: Song = {
      id: String(songId || song.id || crypto.randomUUID()),
      title: songData.title || song.title || '',
      artist: songData.artist || song.artist,
      singer: songData.singer || song.singer,
      key: songData.key || song.key,
      tempoBmp: songData.tempoBmp || song.tempoBmp,
      notes: songData.notes || song.notes,
    };
    
    console.log(`Song ${mode} successful:`, completeSong);
    return completeSong;
  } catch (error) {
    console.error('Failed to save song:', error);
    throw error;
  }
}

export async function deleteSong(id: string): Promise<void> {
  try {
    // Use the same save-song URL but with mode: "delete"
    const requestBody = {
      song: { id },
      mode: 'delete'
    };
    
    console.log('Deleting song:', requestBody);
    
    await apiCall<{ success?: boolean }>(API_BASE.SAVE_SONG, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    console.log('Song deleted successfully');
  } catch (error) {
    console.error('Failed to delete song:', error);
    throw error;
  }
}

export async function fetchSetlists(): Promise<SetlistWithItems[]> {
  try {
    if (!API_BASE.GET_SETLISTS) {
      console.log('Setlists URL not configured, returning empty array');
      return [];
    }
    
    console.log('Fetching setlists from:', API_BASE.GET_SETLISTS);
    let data: any;
    try {
      data = await apiCall<any>(API_BASE.GET_SETLISTS);
    } catch (apiErr: any) {
      // Handle "No item to return" error - this means there are no setlists yet
      if (apiErr.message && apiErr.message.includes('No item to return')) {
        console.log('No setlists found (empty result), returning empty array');
        return [];
      }
      // Re-throw other errors
      throw apiErr;
    }
    
    console.log('Raw setlists response:', data);
    console.log('Response type:', Array.isArray(data) ? 'Array' : typeof data);
    
    // Handle different response formats from n8n
    let setlists: any[] = [];
    
    // New format: array of { success, setlists: [...] } objects
    if (Array.isArray(data)) {
      // Check if it's the new format with { success, setlists } objects
      if (data.length > 0 && data[0].setlists && Array.isArray(data[0].setlists)) {
        // Extract setlists from the first object's setlists array
        setlists = data[0].setlists;
        console.log(`Found ${setlists.length} setlists in array of {success, setlists} objects`);
      }
      // Check if it's the format with { success, setlist } objects (single setlist per object)
      else if (data.length > 0 && data[0].setlist) {
        setlists = data.map((item: any) => item.setlist);
        console.log(`Found ${setlists.length} setlists in array of {success, setlist} objects`);
      }
      // Old format: direct array of setlists
      else {
        setlists = data;
        console.log(`Found ${setlists.length} setlists in direct array response`);
      }
    }
    // If response has a 'setlists' property at root level
    else if (data.setlists && Array.isArray(data.setlists)) {
      setlists = data.setlists;
      console.log(`Found ${setlists.length} setlists in data.setlists`);
      // Debug: Log the first setlist to see its structure
      if (setlists.length > 0) {
        console.log('Sample setlist from data.setlists:', JSON.stringify(setlists[0], null, 2));
        console.log('First setlist keys:', Object.keys(setlists[0]));
      }
    }
    // If response is a single object
    else if (data && typeof data === 'object') {
      // Check if it might be an object with numeric keys
      const keys = Object.keys(data);
      const numericKeys = keys.filter(k => !isNaN(Number(k)));
      if (numericKeys.length > 0) {
        // It's an object with numeric keys, convert to array
        setlists = Object.values(data);
        console.log(`Found ${setlists.length} setlists in object with numeric keys`);
      } else if (data.setlist) {
        // Single { success, setlist } object
        setlists = [data.setlist];
        console.log('Single {success, setlist} object, extracting setlist');
      } else {
        // Single setlist object
        setlists = [data];
        console.log('Single object response, wrapping in array');
      }
    }
    
    console.log(`Total setlists to process: ${setlists.length}`);
    
    // Map n8n response format to our Setlist type
    const mappedSetlists = setlists.map((item: any, index: number) => {
      // Handle date format conversion if needed (n8n returns "12/02/2025", we need "2025-12-02")
      let formattedDate = item.date;
      if (item.date && item.date.includes('/')) {
        try {
          // Parse MM/DD/YYYY format
          const [month, day, year] = item.date.split('/');
          formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } catch (e) {
          console.warn('Failed to parse date:', item.date);
        }
      }
      
      // The database has both 'id' (database row ID) and 'setlistId' (actual setlist identifier)
      // SetlistItems table links to 'setlistId', not 'id'
      // We need to use setlistId for all operations, but we'll store it in the 'id' field
      // Check for setlistId in various possible field names using 'in' operator to catch all cases
      let setlistIdValue: any;
      if ('setlistId' in item) {
        setlistIdValue = item.setlistId;
      } else if ('setlist_id' in item) {
        setlistIdValue = item.setlist_id;
      } else if ('setlistID' in item) {
        setlistIdValue = item.setlistID;
      } else if ('SetlistId' in item) {
        setlistIdValue = item.SetlistId;
      } else {
        // Fall back to id if setlistId is not present
        setlistIdValue = item.id;
      }
      
      // Debug: Log all keys to see what fields are actually available
      if (setlistIdValue === item.id && !('setlistId' in item)) {
        console.log(`⚠️ setlistId not found in item. Available keys:`, Object.keys(item));
        console.log(`Raw item:`, JSON.stringify(item, null, 2));
        console.log(`Checking 'setlistId' in item:`, 'setlistId' in item);
        console.log(`item.setlistId value:`, item.setlistId);
      }
      
      const setlistIdDisplay = 'setlistId' in item ? item.setlistId : 
                               ('setlist_id' in item ? item.setlist_id : 
                               ('setlistID' in item ? item.setlistID : 'not found'));
      console.log(`Mapping setlist: raw item has id=${item.id}, setlistId=${setlistIdDisplay}, using setlistIdValue=${setlistIdValue}`);
      
      return {
        id: String(setlistIdValue || `temp-${index}-${Date.now()}`),
        name: item.name || '',
        venue: item.venue || undefined,
        city: item.city || undefined,
        date: formattedDate || undefined,
        notes: item.notes || undefined,
        items: Array.isArray(item.items) ? item.items
          .filter((it: any) => {
            // Filter out items without songId - they can't be matched to songs
            const songId = it.songId || it.song_id || it.songID || it.SongId;
            if (!songId) {
              console.warn('Skipping setlist item without songId. Item ID:', it.id, 'Available fields:', Object.keys(it));
            }
            return !!songId; // Only include items with a songId
          })
          .map((it: any) => {
            // Try multiple possible field names for songId
            const songId = it.songId || it.song_id || it.songID || it.SongId || '';
            
            return {
              id: String(it.id || crypto.randomUUID()),
              songId: String(songId),
              position: typeof it.position === 'number' ? it.position : parseInt(it.position, 10) || 0,
              keyOverride: it.keyOverride && it.keyOverride !== '' ? it.keyOverride : (it.keyOverride === null ? undefined : it.keyOverride),
              singerOverride: it.singerOverride && it.singerOverride !== '' ? it.singerOverride : (it.singerOverride === null ? undefined : it.singerOverride),
              notes: it.notes && it.notes !== '' ? it.notes : undefined,
            };
          }) : [],
      };
    });
    
    // Generate proper UUIDs for any temp IDs
    const finalSetlists = mappedSetlists.map((setlist) => {
      if (setlist.id.startsWith('temp-')) {
        return { ...setlist, id: crypto.randomUUID() };
      }
      return setlist;
    });
    
    console.log(`Successfully mapped ${finalSetlists.length} setlists`);
    return finalSetlists;
  } catch (error) {
    console.error('Failed to fetch setlists:', error);
    throw error;
  }
}

export async function addItemToSetlist(
  setlistId: string,
  item: SetlistItem
): Promise<void> {
  try {
    if (!API_BASE.SAVE_SETLIST_ITEM || API_BASE.SAVE_SETLIST_ITEM.includes('your-n8n-webhook-url')) {
      throw new Error('Setlist item save URL is not configured. Please set VITE_N8N_SAVE_SETLIST_ITEM_URL in your .env file');
    }
    
    const requestBody = {
      setlist: {
        setlistId: setlistId,  // Send setlistId for SetlistItems table linking
        id: setlistId,          // Keep id for backward compatibility if needed
      },
      item: {
        id: item.id,
        songId: item.songId,
        position: item.position,
        keyOverride: item.keyOverride || null,
        singerOverride: item.singerOverride || null,
        notes: item.notes || null,
      },
      mode: 'add_item'
    };
    
    console.log('Adding item to setlist:', JSON.stringify(requestBody, null, 2));
    console.log('Calling URL:', API_BASE.SAVE_SETLIST_ITEM);
    
    const response = await apiCall<any>(API_BASE.SAVE_SETLIST_ITEM, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    console.log('Item added successfully, response:', response);
  } catch (error) {
    console.error('Failed to add item to setlist:', error);
    console.error('URL that failed:', API_BASE.SAVE_SETLIST_ITEM);
    throw error;
  }
}

export async function syncSetlistItems(
  setlistId: string,
  items: SetlistItem[]
): Promise<void> {
  try {
    if (!API_BASE.SAVE_SETLIST_ITEM || API_BASE.SAVE_SETLIST_ITEM.includes('your-n8n-webhook-url')) {
      throw new Error('Setlist item save URL is not configured. Please set VITE_N8N_SAVE_SETLIST_ITEM_URL in your .env file');
    }
    
    // Ensure positions are sequential (0, 1, 2, ...)
    const itemsWithSequentialPositions = items.map((item, index) => ({
      ...item,
      position: index,
    }));
    
    const requestBody = {
      setlist: {
        setlistId: setlistId,  // Send setlistId for SetlistItems table linking
        id: setlistId,          // Keep id for backward compatibility if needed
      },
      items: itemsWithSequentialPositions.map((item) => ({
        id: item.id, // All items now have IDs (generated on frontend)
        songId: item.songId,
        position: item.position,
        keyOverride: item.keyOverride || null,
        singerOverride: item.singerOverride || null,
        notes: item.notes || null,
      })),
      mode: 'sync_items'
    };
    
    console.log('Syncing setlist items (replace all):', JSON.stringify(requestBody, null, 2));
    console.log('Calling URL:', API_BASE.SAVE_SETLIST_ITEM);
    console.log(`Sending ${items.length} items to replace all items for setlist ${setlistId}`);
    
    const response = await apiCall<any>(API_BASE.SAVE_SETLIST_ITEM, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    // Check if n8n returned a "Workflow was started" message (async workflow)
    if (response && typeof response === 'object' && response.message && 
        (response.message === 'Workflow was started' || response.message.includes('started'))) {
      console.log('Async workflow detected for setlist items sync. Database should update shortly.');
      // For async workflows, we don't get immediate confirmation, but the database should update
      // The calling code will refetch setlists to get the updated data
    }
    
    console.log('Items synced successfully, response:', response);
  } catch (error) {
    console.error('Failed to sync setlist items:', error);
    console.error('URL that failed:', API_BASE.SAVE_SETLIST_ITEM);
    throw error;
  }
}

export async function saveSetlist(
  payload: SetlistWithItemsInput,
  explicitMode?: 'create' | 'update',
  includeItems: boolean = false
): Promise<SetlistWithItems> {
  try {
    if (!API_BASE.SAVE_SETLIST || API_BASE.SAVE_SETLIST.includes('your-n8n-webhook-url')) {
      throw new Error('Setlist save URL is not configured. Please set VITE_N8N_SAVE_SETLIST_URL in your .env file');
    }
    
    // Use explicit mode if provided, otherwise determine from payload.id
    const mode = explicitMode || (payload.id ? 'update' : 'create');
    
    // Build setlist payload - only include top-level fields, exclude items unless explicitly requested
    const setlistPayload: any = {
      name: payload.name || '',
      venue: payload.venue || '',
      city: payload.city || '',
      date: payload.date || '',
      notes: payload.notes || '',
    };
    
    // Only include id if it exists (for updates)
    if (payload.id) {
      setlistPayload.id = payload.id;
    }
    
    // Only include items if explicitly requested (for future use when managing items separately)
    if (includeItems && Array.isArray(payload.items)) {
      setlistPayload.items = payload.items;
    }
    
    const requestBody = {
      setlist: setlistPayload,
      mode
    };
    
    console.log(`Saving setlist in ${mode} mode (top-level only):`, JSON.stringify(requestBody, null, 2));
    
    const data = await apiCall<any>(API_BASE.SAVE_SETLIST, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    console.log('Full API response:', data);
    
    // Check if n8n returned a "Workflow was started" message (async workflow)
    if (data && typeof data === 'object' && data.message && 
        (data.message === 'Workflow was started' || data.message.includes('started'))) {
      console.log('Async workflow detected for setlist save. Database should update shortly.');
      // For async workflows, we don't get immediate confirmation, but the database should update
      // The calling code will refetch setlists to get the updated data
      // Return a minimal setlist object with the ID we sent
      return {
        id: payload.id || '',
        name: payload.name || '',
        venue: payload.venue,
        city: payload.city,
        date: payload.date,
        notes: payload.notes,
        items: payload.items || [],
      };
    }
    
    // Handle different response formats from n8n
    let savedSetlist: SetlistWithItems;
    if (data.setlist) {
      savedSetlist = data.setlist;
    } else if (data.id || data.name) {
      // Response might be the setlist object directly
      savedSetlist = data as SetlistWithItems;
    } else {
      console.error('Unexpected response format:', data);
      throw new Error('Invalid response format from server');
    }
    
    // Ensure all fields are present, preserve items from original if not in response
    const completeSetlist: SetlistWithItems = {
      id: String(savedSetlist.id || payload.id || crypto.randomUUID()),
      name: savedSetlist.name || payload.name || '',
      venue: savedSetlist.venue !== undefined ? savedSetlist.venue : payload.venue,
      city: savedSetlist.city !== undefined ? savedSetlist.city : payload.city,
      date: savedSetlist.date !== undefined ? savedSetlist.date : payload.date,
      notes: savedSetlist.notes !== undefined ? savedSetlist.notes : payload.notes,
      items: savedSetlist.items || payload.items || [],
    };
    
    console.log(`Setlist ${mode} successful:`, completeSetlist);
    return completeSetlist;
  } catch (error) {
    console.error('Failed to save setlist:', error);
    throw error;
  }
}

export async function deleteSetlist(id: string): Promise<void> {
  try {
    if (!API_BASE.DELETE_SETLIST || API_BASE.DELETE_SETLIST.includes('your-n8n-webhook-url')) {
      throw new Error('Setlist delete URL is not configured. Please set VITE_N8N_DELETE_SETLIST_URL in your .env file');
    }
    
    const requestBody = {
      setlist: {
        setlistId: id,  // Send setlistId instead of id, since SetlistItems table links to setlistId
        id: id,         // Keep id as well for backward compatibility if needed
      },
      mode: 'delete_setlist'
    };
    
    console.log('Deleting setlist:', JSON.stringify(requestBody, null, 2));
    console.log('Calling URL:', API_BASE.DELETE_SETLIST);
    
    await apiCall<{ success?: boolean }>(API_BASE.DELETE_SETLIST, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    console.log('Setlist deleted successfully');
  } catch (error) {
    console.error('Failed to delete setlist:', error);
    throw error;
  }
}

