import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LibraryService, Playlist } from '../../services/library.service';
import { GoogleAuthService } from '../../services/google-auth.service';
import { Store } from '@ngrx/store';
import { PlayerActions } from '../../state/player/player.actions';

@Component({
  selector: 'app-library-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="view-container">
      <div class="header">
        <h1>Your Library</h1>
      </div>

      <div *ngIf="!isLoggedIn()" class="empty-state glass">
        <svg viewBox="0 0 24 24" class="empty-icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
        <h2>Orbit Connection Required</h2>
        <p>Join the orbit to access and create your cosmic playlists.</p>
        <button class="join-btn" (click)="login()">Join Now</button>
      </div>

      <div *ngIf="isLoggedIn()" class="library-layout">
        
        <!-- Sidebar: Playlist List -->
        <div class="playlists-sidebar glass">
            <div class="create-section">
                <input type="text" [(ngModel)]="newPlaylistName" placeholder="New Playlist Name..." class="playlist-input" (keyup.enter)="createNewPlaylist()">
                <button class="add-btn" (click)="createNewPlaylist()" [disabled]="!newPlaylistName.trim()">
                    <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                </button>
            </div>

            <div class="playlist-list">
                <div *ngFor="let pl of playlists()" 
                     class="pl-item" 
                     [class.active]="selectedPlaylist()?.id === pl.id"
                     (click)="selectPlaylist(pl)">
                    <div class="pl-icon">
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
                    <span class="badge">Playlist</span>
                    <h2>{{ selectedPlaylist()?.name }}</h2>
                    <p class="track-count">{{ selectedPlaylist()?.tracks?.length || 0 }} Tracks</p>
                </div>
                <button class="delete-btn" *ngIf="selectedPlaylist()?.id !== 'favorites'" (click)="deleteSelectedPlaylist()">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </div>

            <div class="track-list">
                <div *ngIf="selectedPlaylist()?.tracks?.length === 0" class="empty-tracks">
                    <p>This playlist is empty.</p>
                    <p class="hint">Use the '+' button in the player bar to add tracks here.</p>
                </div>
                
                <div class="track-item" *ngFor="let track of selectedPlaylist()?.tracks; let i = index">
                    <div class="track-num">{{ i + 1 }}</div>
                    <img [src]="track.album.images[0].url" 
                         class="track-art"
                         (error)="handleImgError($event)"
                         (load)="checkSharpness($event)">
                    <div class="track-meta">
                        <span class="track-name">{{ track.name }}</span>
                        <span class="track-artist">{{ track.artists[0].name }}</span>
                    </div>
                    <div class="track-actions">
                        <button class="t-btn play" (click)="playTrack(track)">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                        <button class="t-btn remove" (click)="removeTrack(track.id)">
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

    .library-layout { display: flex; gap: 32px; align-items: flex-start; }
    
    /* Sidebar */
    .playlists-sidebar { width: 350px; padding: 24px; flex-shrink: 0; }
    .create-section { display: flex; gap: 12px; margin-bottom: 32px; }
    .playlist-input { flex: 1; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 16px; color: white; font-family: inherit; font-size: 14px; outline: none; transition: 0.3s; }
    .playlist-input:focus { border-color: #a855f7; background: rgba(168, 85, 247, 0.05); }
    .add-btn { width: 44px; height: 44px; border-radius: 12px; background: #a855f7; color: white; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; }
    .add-btn:disabled { opacity: 0.3; cursor: not-allowed; filter: grayscale(1); }
    .add-btn svg { width: 24px; height: 24px; fill: currentColor; }
    .add-btn:not(:disabled):hover { background: #c084fc; transform: scale(1.05); }

    .playlist-list { display: flex; flex-direction: column; gap: 8px; }
    .no-playlists { font-size: 13px; opacity: 0.4; text-align: center; padding: 20px 0; font-style: italic; }
    .pl-item { display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-radius: 16px; cursor: pointer; transition: 0.2s; border: 1px solid transparent; }
    .pl-item:hover { background: rgba(255,255,255,0.05); }
    .pl-item.active { background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.3); }
    .pl-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
    .pl-icon svg { width: 20px; height: 20px; fill: #a855f7; }
    .pl-item.active .pl-icon { background: #a855f7; }
    .pl-item.active .pl-icon svg { fill: white; }
    .pl-info { display: flex; flex-direction: column; }
    .pl-name { font-weight: 700; font-size: 14px; }
    .pl-count { font-size: 11px; opacity: 0.4; font-weight: 600; text-transform: uppercase; margin-top: 2px; }

    /* Main Area */
    .playlist-detail { flex: 1; padding: 40px; min-height: 500px; display: flex; flex-direction: column; }
    .detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 32px; }
    .badge { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #a855f7; letter-spacing: 1px; margin-bottom: 8px; display: block; }
    .header-text h2 { font-size: 48px; font-weight: 900; margin: 0 0 8px 0; letter-spacing: -1.5px; }
    .track-count { opacity: 0.5; font-size: 14px; font-weight: 600; }
    .delete-btn { background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.2); width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #ff4757; transition: 0.3s; }
    .delete-btn:hover { background: #ff4757; color: white; }
    .delete-btn svg { width: 20px; height: 20px; fill: currentColor; }

    .track-list { display: flex; flex-direction: column; gap: 8px; }
    .empty-tracks { text-align: center; padding: 60px 0; opacity: 0.5; }
    .hint { font-size: 12px; margin-top: 8px; color: #a855f7; }
    .track-item { display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-radius: 16px; transition: 0.2s; background: rgba(0,0,0,0.2); }
    .track-item:hover { background: rgba(255,255,255,0.05); }
    .track-num { width: 24px; font-size: 12px; font-weight: 700; opacity: 0.3; text-align: right; }
    .track-art { 
        width: 48px; 
        height: 48px; 
        aspect-ratio: 1 / 1; 
        border-radius: 8px; 
        object-fit: cover; 
        transform: scale(1.35);
    }
    .track-meta { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .track-name { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .track-artist { font-size: 12px; opacity: 0.4; }
    .track-actions { display: flex; gap: 8px; opacity: 0; transition: 0.2s; }
    .track-item:hover .track-actions { opacity: 1; }
    .t-btn { width: 36px; height: 36px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; background: rgba(255,255,255,0.1); color: white; transition: 0.2s; }
    .t-btn:hover { transform: scale(1.1); }
    .t-btn.play:hover { background: white; color: black; }
    .t-btn.remove:hover { background: #ff4757; color: white; }
    .t-btn svg { width: 18px; height: 18px; fill: currentColor; }
  `]
})
export class LibraryViewComponent {
  private authService = inject(GoogleAuthService);
  private libraryService = inject(LibraryService);
  private store = inject(Store);

  userProfile = this.authService.userProfile;
  playlists = this.libraryService.playlists;
  
  newPlaylistName = '';
  selectedPlaylist = signal<Playlist | null>(null);

  constructor() {
      // Auto-select favorites initially
      effect(() => {
          const pls = this.playlists();
          const current = this.selectedPlaylist();
          if (pls.length > 0 && !current) {
              const fav = pls.find(p => p.id === 'favorites') || pls[0];
              this.selectedPlaylist.set(fav);
          } else if (current && !pls.find(p => p.id === current.id)) {
               this.selectedPlaylist.set(pls.length > 0 ? pls[0] : null);
          }
      }, { allowSignalWrites: true });
  }

  isLoggedIn() { return !!this.authService.getToken(); }
  login() { this.authService.login(); }

  createNewPlaylist() {
      if (this.newPlaylistName.trim()) {
          this.libraryService.createPlaylist(this.newPlaylistName);
          this.newPlaylistName = '';
          // Auto select the new one (it will be the last in the list)
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
      }
  }

  playTrack(track: any) {
      this.store.dispatch(PlayerActions.setCurrentTrack({ track }));
      this.store.dispatch(PlayerActions.play());
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
          // Need to manually trigger a re-eval of the selected playlist view
          // By resetting the signal to the updated playlist object
          const updatedPls = this.playlists();
          const updatedPl = updatedPls.find(p => p.id === pl.id);
          if (updatedPl) this.selectedPlaylist.set(updatedPl);
      }
  }
}
