import { Component, inject, signal, effect, computed } from '@angular/core';
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
      
      <!-- Library Header & Category Filter Tabs -->
      <div class="library-header-wrap">
        <div class="title-lockup">
          <div class="title-sub">
            <span class="braun-dot"></span>
            <span>ARCHIVE // SOUND LIBRARY</span>
          </div>
          <h1>Cosmic Collections</h1>
        </div>

        <!-- Filter Tabs -->
        <div class="library-tabs" *ngIf="isLoggedIn()">
          <button 
            class="lib-tab" 
            [class.active]="activeTab() === 'all'" 
            (click)="activeTab.set('all')">
            All Crates ({{ playlists().length }})
          </button>
          <button 
            class="lib-tab" 
            [class.active]="activeTab() === 'favorites'" 
            (click)="activeTab.set('favorites')">
            <svg viewBox="0 0 24 24" class="tab-icon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            Favorites
          </button>
          <button 
            class="lib-tab" 
            [class.active]="activeTab() === 'custom'" 
            (click)="activeTab.set('custom')">
            Custom Crates
          </button>
        </div>
      </div>

      <!-- Unauthorized State -->
      <div *ngIf="!isLoggedIn()" class="empty-state">
        <div class="vinyl-art-placeholder">
          <div class="vinyl-groove"></div>
          <div class="vinyl-label-center"></div>
        </div>
        <h2>Station Disconnected</h2>
        <p>Authenticate with Google to curate, synchronize, and persist your custom audio crates.</p>
        <button class="join-btn" (click)="login()">Connect Station Node</button>
      </div>

      <!-- Main Library Layout -->
      <div *ngIf="isLoggedIn()" class="library-layout">
        
        <!-- Sidebar: Playlist List -->
        <div class="playlists-sidebar">
          <div class="sidebar-header">
            <span class="sidebar-label">AUDIO CRATES</span>
            <span class="sidebar-count">{{ filteredPlaylists().length }} TOTAL</span>
          </div>

          <!-- Quick Create Input -->
          <div class="create-section">
            <input
              type="text"
              [(ngModel)]="newPlaylistName"
              placeholder="New crate title..."
              class="playlist-input"
              (keyup.enter)="createNewPlaylist()">
            <button class="add-btn" (click)="createNewPlaylist()" [disabled]="!newPlaylistName.trim()" title="Create New Crate">
              <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
          </div>

          <!-- Playlists List -->
          <div class="playlist-list">
            <div
              *ngFor="let pl of filteredPlaylists()" 
              class="pl-item" 
              [class.active]="selectedPlaylist()?.id === pl.id"
              (click)="selectPlaylist(pl)">
              <div class="pl-indicator" *ngIf="selectedPlaylist()?.id === pl.id"></div>
              <div class="pl-icon" [class.fav-icon]="pl.id === 'favorites'">
                <svg *ngIf="pl.id === 'favorites'" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <svg *ngIf="pl.id !== 'favorites'" viewBox="0 0 24 24"><path d="M4 10h12v2H4zm0-4h12v2H4zm0 8h8v2H4zm10 0v6l5-3z"/></svg>
              </div>
              <div class="pl-info">
                <span class="pl-name">{{ pl.name }}</span>
                <span class="pl-count">{{ pl.tracks.length }} {{ pl.tracks.length === 1 ? 'Track' : 'Tracks' }}</span>
              </div>
            </div>
            
            <div *ngIf="filteredPlaylists().length === 0" class="no-playlists">
              No matching crates in this filter.
            </div>
          </div>
        </div>

        <!-- Main Area: Tracks View -->
        <div class="playlist-detail" *ngIf="selectedPlaylist()">
          <div class="chassis-machined-top"></div>

          <!-- Detail Header -->
          <div class="detail-header">
            <div class="header-text">
              <div class="spec-crumbs">
                <span class="braun-dot"></span>
                <span class="spec-title">CRATE SPECIFICATION</span>
                <span class="crate-badge" *ngIf="selectedPlaylist()?.id === 'favorites'">STARRED</span>
              </div>
              <h2>{{ selectedPlaylist()?.name }}</h2>
              <div class="detail-stats">
                <span class="stat-pill">{{ selectedPlaylist()?.tracks?.length || 0 }} TRACKS</span>
                <span class="stat-sep">&bull;</span>
                <span class="stat-pill">EST. {{ getPlaylistDuration() }}</span>
                <span class="stat-sep">&bull;</span>
                <span class="stat-pill lossless">LOSSLESS QUALITY</span>
              </div>
            </div>
            
            <div class="detail-actions">
              <button
                class="play-all-btn"
                *ngIf="(selectedPlaylist()?.tracks?.length || 0) > 0"
                (click)="playAllInPlaylist()"
                title="Play Full Crate">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Play Crate
              </button>

              <button
                class="delete-btn"
                *ngIf="selectedPlaylist()?.id !== 'favorites'"
                (click)="deleteSelectedPlaylist()"
                title="Delete Crate">
                <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            </div>
          </div>

          <!-- Track List -->
          <div class="track-list">
            <div *ngIf="selectedPlaylist()?.tracks?.length === 0" class="empty-tracks">
              <div class="empty-disc-outline">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>
              </div>
              <p class="empty-title">This crate is currently empty.</p>
              <p class="hint">Use the Heart icon or '+' button on any soundscape to archive tracks here.</p>
            </div>
            
            <div
              class="track-item"
              *ngFor="let track of selectedPlaylist()?.tracks; let i = index"
              [class.is-current]="currentTrack()?.id === track.id"
              (click)="playTrack(track, i)">
              
              <div class="track-num">{{ (i + 1) < 10 ? '0' + (i + 1) : (i + 1) }}</div>
              
              <div class="track-art-wrap">
                <img [src]="track.album.images[0]?.url || fallbackCover" 
                     class="track-art"
                     (error)="handleImgError($event)">
                <div class="track-art-sheen"></div>
              </div>

              <div class="track-meta">
                <span class="track-name" [title]="track.name">{{ track.name }}</span>
                <span class="track-artist">{{ track.artists[0]?.name }}</span>
              </div>

              <div class="track-actions" (click)="$event.stopPropagation()">
                <button class="t-btn play" (click)="playTrack(track, i)" title="Play Track">
                  <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <button class="t-btn remove" (click)="removeTrack(track.id)" title="Remove Track">
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
    .view-container { 
      padding: 30px 48px 80px 48px; 
      max-width: 1300px; 
      margin: 0 auto; 
    }

    /* HEADER & TABS */
    .library-header-wrap {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .title-sub {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #ff5722;
      margin-bottom: 6px;
    }
    .braun-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ff5722;
      box-shadow: 0 0 8px rgba(255, 87, 34, 0.6);
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #f3f4f6;
    }

    .library-tabs {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #17181c;
      padding: 5px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }
    .lib-tab {
      background: none;
      border: 1px solid transparent;
      color: #9ca3af;
      padding: 7px 16px;
      border-radius: 14px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.2px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .lib-tab:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.04);
    }
    .lib-tab.active {
      background: #24262c;
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.14);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    }
    .tab-icon { width: 13px; height: 13px; fill: #ff5722; }

    /* EMPTY STATE */
    .empty-state {
      padding: 80px 40px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      background: #17181c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      max-width: 540px;
      margin: 40px auto;
    }
    .vinyl-art-placeholder {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #141518;
      border: 2px solid rgba(255, 87, 34, 0.4);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(255, 87, 34, 0.15);
    }
    .vinyl-groove {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px dashed rgba(255, 255, 255, 0.15);
    }
    .vinyl-label-center {
      position: absolute;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #ff5722;
    }
    .empty-state h2 { font-size: 22px; font-weight: 800; color: #f3f4f6; }
    .empty-state p { font-size: 13px; color: #9ca3af; max-width: 380px; line-height: 1.5; }
    .join-btn {
      margin-top: 10px;
      background: #ff5722;
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      transition: 0.2s;
    }
    .join-btn:hover { background: #f4511e; }

    /* LAYOUT */
    .library-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 28px;
      min-height: 520px;
    }
    
    /* SIDEBAR CRATES */
    .playlists-sidebar {
      background: #17181c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .sidebar-label {
      font-family: var(--font-mono);
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #ff5722;
    }
    .sidebar-count {
      font-family: var(--font-mono);
      font-size: 9px;
      color: #9ca3af;
    }

    .create-section { display: flex; gap: 8px; }
    .playlist-input {
      flex: 1;
      background: #141518;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 9px 14px;
      color: white;
      outline: none;
      font-size: 12px;
      font-weight: 600;
      transition: border-color 0.2s;
    }
    .playlist-input:focus { border-color: #ff5722; }
    .add-btn {
      background: #24262c;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #ff5722;
      transition: all 0.2s;
    }
    .add-btn svg { width: 16px; height: 16px; fill: currentColor; }
    .add-btn:hover:not(:disabled) { background: #ff5722; color: #ffffff; }
    .add-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .playlist-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto;
      max-height: 480px;
    }
    .pl-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      cursor: pointer;
      position: relative;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid transparent;
      transition: all 0.2s;
    }
    .pl-item:hover {
      background: #202227;
      border-color: rgba(255, 255, 255, 0.06);
    }
    .pl-item.active {
      background: #24262c;
      border-color: rgba(255, 87, 34, 0.35);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
    .pl-indicator {
      position: absolute;
      left: 0;
      top: 25%;
      bottom: 25%;
      width: 3px;
      background: #ff5722;
      border-radius: 0 2px 2px 0;
    }
    .pl-icon {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: #141518;
      border: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .pl-icon svg { width: 15px; height: 15px; fill: #9ca3af; }
    .pl-icon.fav-icon svg { fill: #ff5722; }
    .pl-info { display: flex; flex-direction: column; overflow: hidden; }
    .pl-name { font-size: 13px; font-weight: 700; color: #f3f4f6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pl-count { font-family: var(--font-mono); font-size: 10px; color: #9ca3af; }
    .no-playlists { text-align: center; font-size: 11.5px; color: #9ca3af; padding: 24px 10px; }

    /* DETAIL VIEW */
    .playlist-detail {
      background: #17181c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 30px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }

    .chassis-machined-top {
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 87, 34, 0.5) 20%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 87, 34, 0.5) 80%, transparent);
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .spec-crumbs {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .spec-title {
      font-family: var(--font-mono);
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #ff5722;
    }
    .crate-badge {
      font-family: var(--font-mono);
      font-size: 8px;
      font-weight: 800;
      background: rgba(255, 87, 34, 0.12);
      color: #ff5722;
      border: 1px solid rgba(255, 87, 34, 0.35);
      padding: 1px 6px;
      border-radius: 4px;
    }
    .detail-header h2 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.4px;
      color: #f3f4f6;
      margin-bottom: 6px;
    }
    .detail-stats {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .stat-pill {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      color: #9ca3af;
    }
    .stat-pill.lossless { color: #ff5722; font-weight: 800; }
    .stat-sep { color: rgba(255, 255, 255, 0.15); font-size: 9px; }

    .detail-actions { display: flex; align-items: center; gap: 10px; }
    .play-all-btn {
      background: #ff5722;
      border: none;
      color: white;
      padding: 9px 20px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 7px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(255, 87, 34, 0.35);
      transition: all 0.2s;
    }
    .play-all-btn svg { width: 14px; height: 14px; fill: white; }
    .play-all-btn:hover { background: #f4511e; transform: translateY(-1px); }

    .delete-btn {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border-radius: 10px;
      cursor: pointer;
      padding: 8px 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: 0.2s;
    }
    .delete-btn svg { width: 16px; height: 16px; fill: currentColor; }
    .delete-btn:hover { background: #ef4444; color: #ffffff; }

    /* TRACKS LIST */
    .track-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto;
      max-height: 480px;
    }
    .empty-tracks {
      padding: 50px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .empty-disc-outline {
      width: 48px;
      height: 48px;
      opacity: 0.25;
      margin-bottom: 8px;
    }
    .empty-disc-outline svg { width: 100%; height: 100%; fill: #ffffff; }
    .empty-title { font-size: 14px; font-weight: 700; color: #f3f4f6; }
    .hint { font-size: 12px; color: #9ca3af; }

    .track-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 14px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
    }
    .track-item:hover {
      background: #24262c;
      border-color: rgba(255, 255, 255, 0.08);
      transform: translateX(2px);
    }
    .track-item.is-current {
      background: rgba(255, 87, 34, 0.12);
      border-color: rgba(255, 87, 34, 0.35);
    }
    .track-num {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      color: #9ca3af;
      width: 20px;
    }
    .track-art-wrap {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      flex-shrink: 0;
      background: #141518;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .track-art { width: 100%; height: 100%; object-fit: cover; }
    .track-art-sheen {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 60%);
      pointer-events: none;
    }
    .track-meta { display: flex; flex-direction: column; flex: 1; overflow: hidden; gap: 2px; }
    .track-name { font-size: 13px; font-weight: 700; color: #f3f4f6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .track-artist { font-size: 11.5px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    .track-actions { display: flex; gap: 6px; align-items: center; }
    .t-btn {
      background: none;
      border: none;
      padding: 6px;
      cursor: pointer;
      color: #9ca3af;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .t-btn svg { width: 15px; height: 15px; fill: currentColor; }
    .t-btn.play:hover { color: #ff5722; background: rgba(255, 87, 34, 0.1); }
    .t-btn.remove:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

    @media (max-width: 900px) {
      .view-container { padding: 20px 16px; }
      .library-header-wrap { flex-direction: column; align-items: flex-start; gap: 14px; }
      .library-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class LibraryViewComponent {
  public libraryService = inject(LibraryService);
  private authService = inject(GoogleAuthService);
  private toast = inject(ToastService);
  private store = inject(Store);

  playlists = this.libraryService.playlists;
  currentTrack = this.store.selectSignal(selectCurrentTrack);
  isPlaying = this.store.selectSignal(selectIsPlaying);

  newPlaylistName = '';
  selectedPlaylist = signal<Playlist | null>(null);
  activeTab = signal<'all' | 'favorites' | 'custom'>('all');

  filteredPlaylists = computed(() => {
    const all = this.playlists();
    const tab = this.activeTab();
    if (tab === 'favorites') return all.filter(p => p.id === 'favorites');
    if (tab === 'custom') return all.filter(p => p.id !== 'favorites');
    return all;
  });

  constructor() {
    effect(() => {
      const pls = this.playlists();
      if (pls.length > 0 && !this.selectedPlaylist()) {
        this.selectedPlaylist.set(pls[0]);
      }
    }, { allowSignalWrites: true });
  }

  isLoggedIn() {
    return !!this.authService.getToken();
  }

  login() {
    this.authService.login();
  }

  getPlaylistDuration(): string {
    const tracks = this.selectedPlaylist()?.tracks || [];
    const count = tracks.length;
    if (count === 0) return '0 MIN';
    const totalMinutes = Math.round(count * 3.4);
    return `${totalMinutes} MIN`;
  }

  createNewPlaylist() {
    if (this.newPlaylistName.trim()) {
      this.libraryService.createPlaylist(this.newPlaylistName.trim());
      this.toast.show(`Created Crate: "${this.newPlaylistName.trim()}"`, 'success');
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
      this.toast.show(`Deleted Crate: "${pl.name}"`, 'info');
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
      this.toast.show(`Crate Started: ${this.selectedPlaylist()?.name}`, 'info');
    }
  }

  readonly fallbackCover = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300' fill='%2317181c'><rect width='300' height='300'/><circle cx='150' cy='150' r='90' fill='%231c1e23' stroke='rgba(255,255,255,0.08)' stroke-width='3'/><circle cx='150' cy='150' r='60' fill='%23121316' stroke='rgba(255,255,255,0.05)' stroke-width='2'/><circle cx='150' cy='150' r='30' fill='%23ff5722'/><circle cx='150' cy='150' r='8' fill='%23ffffff'/></svg>";

  handleImgError(event: any) {
    const img = event.target;
    if (!img || img.dataset.fallbackApplied) return;

    const resolutions = ['maxresdefault.jpg', 'sddefault.jpg', 'hqdefault.jpg', 'mqdefault.jpg'];
    const currentRes = resolutions.find(r => img.src && img.src.includes(r));
    if (currentRes) {
      const nextIdx = resolutions.indexOf(currentRes) + 1;
      if (nextIdx < resolutions.length) {
        img.src = img.src.replace(currentRes, resolutions[nextIdx]);
        return;
      }
    }

    img.dataset.fallbackApplied = 'true';
    img.onerror = null;
    img.src = this.fallbackCover;
  }

  removeTrack(trackId: string) {
    const pl = this.selectedPlaylist();
    if (pl) {
      this.libraryService.removeTrackFromPlaylist(pl.id, trackId);
      this.toast.show('Track removed from crate', 'info');
      const updatedPls = this.playlists();
      const updatedPl = updatedPls.find(p => p.id === pl.id);
      if (updatedPl) this.selectedPlaylist.set(updatedPl);
    }
  }
}
