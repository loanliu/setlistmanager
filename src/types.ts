export interface Song {
  id: string;
  title: string;
  artist?: string;
  singer?: string;
  key?: string;
  notes?: string;
}

export interface SetlistItem {
  id: string;
  songId: string;
  position: number;
  keyOverride?: string;
  singerOverride?: string;
  notes?: string;
}

export interface Setlist {
  id: string;
  name: string;
  venue?: string;
  city?: string;
  date?: string; // ISO date string "YYYY-MM-DD"
  notes?: string;
  items: SetlistItem[];
}

