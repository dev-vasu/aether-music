import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LibraryService, Playlist } from '../../services/library.service';
import { GoogleAuthService } from '../../services/google-auth.service';
import { ToastService } from '../../services/toast.service';
import { Store } from '@ngrx/store';
import { PlayerActions } from '../../state/player/player.actions';
import { selectCurrentTrack, selectIsPlaying } from '../../state/player/player.selectors';

@Component({
  selector: 'app-library-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="view-container">
      <div class="header">
        <h1>Your Cosmic Library</h1>
      </div>

      <div *ngIf="!isLoggedIn()" class="empty-state glass">
        <svg viewBox="0 0 24 24" class="empty-icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
        <h2>Orbit Connection Required</h2>
        <p>Join the orbit to curate and synchronize your custom cosmic soundscapes.</p>
        <button class="join-btn" (click)="login()">Join Orbit with Google</button>
      </div>

      <div *ngIf="isLoggedIn()" class="library-layout">
        
        <!-- Sidebar: Playlist List -->
        <div class="playlists-sidebar glass">
          <div class="create-section">
            <input
              type="text"
              [(ngModel)]="newPlaylistName"
              placeholder="New Playlist Name..."
              class="playlist-input"
              (keyup.enter)="createNewPlaylist()">
            <button class="add-btn" (click)="createNewPlaylist()" [disabled]="!newPlaylistName.trim()" title="Create Playlist">
              <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
          </div>

          <div class="playlist-list">
            <div
              *ngFor="let pl of playlists()" 
              class="pl-item" 
              [class.active]="selectedPlaylist()?.id === pl.id"
              (click)="selectPlaylist(pl)">
              <div class="pl-icon" [class.fav-icon]="pl.id === 'favorites'">
                <svg *ngIf="pl.id === 'favorites'" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <svg *ngIf="pl.id !== 'favorites'" viewBox="0 0 24 24"><path d="M4 10h12v2H4zm0-4h12v2H4zm0 8h8v2H4zm10 0v6l5-3z"/></svg>
              </div>
              <div class="pl-info">
                <span class="pl-name">{{ pl.name }}</span>
                <span class="pl-count">{{ pl.tracks.length }} Tracks</span>
              </div>
            </div>
            <div *ngIf="playlists().length === 0" class="no-playlists">
              No playlists yet. Create one above!
            </div>
          </div>
        </div>

        <!-- Main Area: Tracks View -->
        <div class="playlist-detail glass" *ngIf="selectedPlaylist()">
          <div class="detail-header">
            <div class="header-text">
              <span class="badge">Cosmic Playlist</span>
              <h2>{{ selectedPlaylist()?.name }}</h2>
              <p class="track-count">{{ selectedPlaylist()?.tracks?.length || 0 }} Tracks in Orbit</p>
            </div>
            
            <div class="detail-actions">
              <button
                class="play-all-btn"
                *ngIf="(selectedPlaylist()?.tracks?.length || 0) > 0"
                (click)="playAllInPlaylist()"
                title="Play Playlist">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Play Orbit
              </button>

              <button
                class="delete-btn"
                *ngIf="selectedPlaylist()?.id !== 'favorites'"
                (click)="deleteSelectedPlaylist()"
                title="Delete Playlist">
                <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            </div>
          </div>

          <div class="track-list">
            <div *ngIf="selectedPlaylist()?.tracks?.length === 0" class="empty-tracks">
              <p>This playlist is empty.</p>
              <p class="hint">Use the Heart or '+' button in the player bar to add tracks here.</p>
            </div>
            
            <div
              class="track-item"
              *ngFor="let track of selectedPlaylist()?.tracks; let i = index"
              [class.is-current]="currentTrack()?.id === track.id">
              <div class="track-num">{{ i + 1 }}</div>
              <img [src]="track.album.images[0]?.url" 
                   class="track-art"
                   (error)="handleImgError($event)"
                   (load)="checkSharpness($event)">
              <div class="track-meta">
                <span class="track-name">{{ track.name }}</span>
                <span class="track-artist">{{ track.artists[0]?.name }}</span>
              </div>
              <div class="track-actions">
                <button class="t-btn play" (click)="playTrack(track, i)" title="Play">
                  <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <button class="t-btn remove" (click)="removeTrack(track.id)" title="Remove">
                  <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .view-container { padding: 40px; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 32px; font-weight: 900; margin-bottom: 24px; letter-spacing: -1px; }
    .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 32px; }
    
    .empty-state { padding: 80px 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; margin-top: 40px; }
    .empty-icon { width: 64px; height: 64px; fill: white; opacity: 0.2; }
    .empty-state h2 { font-size: 24px; font-weight: 800; }
    .empty-state p { opacity: 0.5; }
    .join-btn { margin-top: 16px; background: white; color: black; border: none; padding: 12px 32px; border-radius: 50px; font-weight: 800; cursor: pointer; transition: 0.3s; }
    .join-btn:hover { transform: scale(1.05); }

    .library-layout { display: flex; gap: 32px; min-height: 500px; }
    
    .playlists-sidebar { width: 320px; padding: 24px; display: flex; flex-direction: column; gap: 20px; flex-shrink: 0; }
    .create-section { display: flex; gap: 8px; }
    .playlist-input { flex: 1; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 50px; padding: 10px 16px; color: white; outline: none; font-size: 13px; font-weight: 600; }
    .playlist-input:focus { border-color: #a855f7; }
    .add-btn { background: #a855f7; border: none; border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
    .add-btn svg { width: 20px; height: 20px; fill: white; }
    .add-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .add-btn:not(:disabled):hover { transform: scale(1.1); }

    .playlist-list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; max-height: 420px; }
    .pl-item { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 18px; cursor: pointer; transition: 0.2s; }
    .pl-item:hover { background: rgba(255, 255, 255, 0.05); }
    .pl-item.active { background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); }
    .pl-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pl-icon svg { width: 18px; height: 18px; fill: white; opacity: 0.5; }
    .pl-icon.fav-icon svg { fill: #ec4899; opacity: 1; }
    .pl-info { display: flex; flex-direction: column; overflow: hidden; }
    .pl-name { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pl-count { font-size: 11px; opacity: 0.4; }
    .no-playlists { text-align: center; font-size: 12px; opacity: 0.4; padding: 20px; }

    .playlist-detail { flex: 1; padding: 32px; display: flex; flex-direction: column; gap: 24px; }
    .detail-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    .badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #a855f7; margin-bottom: 8px; display: inline-block; }
    .detail-header h2 { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
    .track-count { font-size: 13px; opacity: 0.4; margin-top: 4px; }
    .detail-actions { display: flex; align-items: center; gap: 12px; }
    
    .play-all-btn {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      border: none;
      color: white;
      padding: 10px 22px;
      border-radius: 50px;
      font-weight: 800;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(168, 85, 247, 0.35);
      transition: all 0.25s;
    }
    .play-all-btn svg { width: 16px; height: 16px; fill: currentColor; }
    .play-all-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5); }

    .delete-btn { background: none; border: none; opacity: 0.4; cursor: pointer; transition: 0.2s; padding: 8px; }
    .delete-btn svg { width: 20px; height: 20px; fill: white; }
    .delete-btn:hover { opacity: 1; color: #ef4444; }

    .track-list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; max-height: 480px; }
    .track-item { display: flex; align-items: center; gap: 16px; padding: 10px 16px; border-radius: 16px; transition: 0.2s; }
    .track-item:hover { background: rgba(255, 255, 255, 0.04); }
    .track-item.is-current { background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.25); }
    .track-num { font-family: monospace; font-size: 12px; opacity: 0.3; width: 20px; }
    .track-art { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; transform: scale(1.35); flex-shrink: 0; }
    .track-meta { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .track-name { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .track-artist { font-size: 12px; opacity: 0.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .track-actions { display: flex; gap: 8px; }
    .t-btn { background: none; border: none; opacity: 0.4; cursor: pointer; transition: 0.2s; padding: 6px; }
    .t-btn svg { width: 18px; height: 18px; fill: white; }
    .t-btn:hover { opacity: 1; transform: scale(1.15); }
    .t-btn.play:hover { color: #a855f7; }
    .t-btn.remove:hover { color: #ef4444; }
    
    .empty-tracks { text-align: center; padding: 60px 20px; opacity: 0.4; display: flex; flex-direction: column; gap: 8px; }
    .hint { font-size: 12px; }

    @media (max-width: 768px) {
      .view-container { padding: 18px; }
      .library-layout { flex-direction: column; gap: 20px; }
      .playlists-sidebar { width: 100%; }
      .playlist-detail { padding: 20px; }
      .detail-header h2 { font-size: 22px; }
    }
  `]
})
export class LibraryViewComponent {
  private store = inject(Store);
  private authService = inject(GoogleAuthService);
  private libraryService = inject(LibraryService);
  private toast = inject(ToastService);

  playlists = this.libraryService.playlists;
  currentTrack = this.store.selectSignal(selectCurrentTrack);
  isPlaying = this.store.selectSignal(selectIsPlaying);
  selectedPlaylist = signal<Playlist | null>(null);
  newPlaylistName: string = '';

  constructor() {
    effect(() => {
      const pls = this.playlists();
      if (pls.length > 0 && !this.selectedPlaylist()) {
        this.selectedPlaylist.set(pls[0]);
      }
    });
  }

  isLoggedIn() { return !!this.authService.getToken(); }
  login() { this.authService.login(); }

  createNewPlaylist() {
    if (this.newPlaylistName.trim()) {
      const name = this.newPlaylistName.trim();
      this.libraryService.createPlaylist(name);
      this.toast.show(`Created playlist: "${name}"`, 'success');
      this.newPlaylistName = '';
      setTimeout(() => {
        const pls = this.playlists();
        this.selectedPlaylist.set(pls[pls.length - 1]);
      }, 0);
    }
  }

  selectPlaylist(pl: Playlist) {
    this.selectedPlaylist.set(pl);
  }

  deleteSelectedPlaylist() {
    const pl = this.selectedPlaylist();
    if (pl && pl.id !== 'favorites') {
      this.libraryService.deletePlaylist(pl.id);
      this.toast.show(`Deleted playlist: "${pl.name}"`, 'info');
      setTimeout(() => {
        const pls = this.playlists();
        this.selectedPlaylist.set(pls[0] || null);
      }, 0);
    }
  }

  playTrack(track: any, index: number) {
    const tracks = this.selectedPlaylist()?.tracks || [];
    if (tracks.length > 0) {
      this.store.dispatch(PlayerActions.setQueue({ tracks, startIndex: index }));
    } else {
      this.store.dispatch(PlayerActions.setCurrentTrack({ track }));
    }
    this.store.dispatch(PlayerActions.play());
    this.toast.show(`Playing: ${track.name}`, 'info');
  }

  playAllInPlaylist() {
    const tracks = this.selectedPlaylist()?.tracks || [];
    if (tracks.length > 0) {
      this.store.dispatch(PlayerActions.setQueue({ tracks, startIndex: 0 }));
      this.store.dispatch(PlayerActions.play());
      this.toast.show(`Orbit Started: ${this.selectedPlaylist()?.name}`, 'info');
    }
  }

  handleImgError(event: any) {
    const img = event.target;
    if (img.src.includes('maxresdefault.jpg')) {
      img.src = img.src.replace('maxresdefault.jpg', 'sddefault.jpg');
    } else if (img.src.includes('sddefault.jpg')) {
      img.src = img.src.replace('sddefault.jpg', 'hqdefault.jpg');
    } else if (img.src.includes('hqdefault.jpg')) {
      img.src = img.src.replace('hqdefault.jpg', 'mqdefault.jpg');
    }
  }

  checkSharpness(event: any) {
    const img = event.target;
    if (img.naturalWidth === 120 && img.src.includes('maxresdefault.jpg')) {
      img.src = img.src.replace('maxresdefault.jpg', 'sddefault.jpg');
    }
  }

  removeTrack(trackId: string) {
    const pl = this.selectedPlaylist();
    if (pl) {
      this.libraryService.removeTrackFromPlaylist(pl.id, trackId);
      this.toast.show('Track removed from playlist', 'info');
      const updatedPls = this.playlists();
      const updatedPl = updatedPls.find(p => p.id === pl.id);
      if (updatedPl) this.selectedPlaylist.set(updatedPl);
    }
  }
}
