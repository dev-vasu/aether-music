import { Injectable, signal, effect, inject } from '@angular/core';
import { GoogleAuthService } from './google-auth.service';

export interface Playlist {
  id: string;
  name: string;
  tracks: any[];
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  private authService = inject(GoogleAuthService);
  
  public playlists = signal<Playlist[]>([]);
  
  constructor() {
    // Sync with local storage on load based on user email
    effect(() => {
        const user = this.authService.userProfile();
        if (user && user.email) {
            const key = `melody_playlists_${user.email}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                this.playlists.set(JSON.parse(saved));
            } else {
                // Initialize default "Favorites"
                this.playlists.set([{ id: 'favorites', name: 'Favorites', tracks: [], createdAt: Date.now() }]);
            }
        } else {
            this.playlists.set([]); // Clear if logged out
        }
    }, { allowSignalWrites: true });
    
    // Save to local storage on change
    effect(() => {
        const user = this.authService.userProfile();
        const currentPlaylists = this.playlists();
        if (user && user.email && currentPlaylists.length > 0) {
            const key = `melody_playlists_${user.email}`;
            localStorage.setItem(key, JSON.stringify(currentPlaylists));
        }
    });
  }

  createPlaylist(name: string) {
      if (!name.trim()) return;
      const newPlaylist: Playlist = {
          id: 'pl_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          name: name.trim(),
          tracks: [],
          createdAt: Date.now()
      };
      this.playlists.update(list => [...list, newPlaylist]);
  }

  addTrackToPlaylist(playlistId: string, track: any) {
      if (!track) return;
      this.playlists.update(list => {
          return list.map(pl => {
              if (pl.id === playlistId) {
                  // Prevent duplicates
                  if (!pl.tracks.find(t => t.id === track.id)) {
                      return { ...pl, tracks: [...pl.tracks, track] };
                  }
              }
              return pl;
          });
      });
  }
  
  removeTrackFromPlaylist(playlistId: string, trackId: string) {
       this.playlists.update(list => {
          return list.map(pl => {
              if (pl.id === playlistId) {
                  return { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) };
              }
              return pl;
          });
      });
  }

  deletePlaylist(playlistId: string) {
      if (playlistId === 'favorites') return; // Cannot delete default
      this.playlists.update(list => list.filter(p => p.id !== playlistId));
  }
}
