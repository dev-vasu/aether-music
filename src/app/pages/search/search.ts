import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectTopTracks, selectPlayerLoading, selectCurrentTrack, selectIsPlaying } from '../../state/player/player.selectors';
import { PlayerActions } from '../../state/player/player.actions';
import { YoutubeService } from '../../services/youtube.service';
import { ToastService } from '../../services/toast.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="view-container">
      <header>
        <div class="search-bar">
          <svg class="search-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.49 0 1 0 9.5 16a6.471 6.471 0 0 0 3.99-1.39l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (keyup.enter)="search()"
            placeholder="Search cosmic tracks, vibes, artists..."
            autofocus>
          <button class="clear-btn" *ngIf="searchQuery" (click)="clearSearch()" title="Clear">
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        <div class="api-notice" *ngIf="apiError()">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <span *ngIf="apiError() === 'QUOTA_LIMIT_HIT'">Curated Soundscape Mode</span>
          <span *ngIf="apiError() !== 'QUOTA_LIMIT_HIT'">Fallback Mode Active</span>
        </div>
      </header>

      <!-- QUICK VIBE PILLS -->
      <div class="vibe-tags-row">
        <span class="vibe-label">Cosmic Vibes:</span>
        <div class="tags-scroll">
          <button
            class="tag-pill"
            *ngFor="let vibe of quickVibes"
            [class.active-tag]="searchQuery === vibe"
            (click)="selectVibe(vibe)">
            {{ vibe }}
          </button>
        </div>
      </div>

      <div class="content">
        <div class="results-header">
          <h1 *ngIf="isSearching">Search Results for "{{ searchQuery }}"</h1>
          <h1 *ngIf="!isSearching">Featured Cosmic Discoveries</h1>
          <span class="results-count" *ngIf="results().length > 0">{{ results().length }} Tracks</span>
        </div>
        
        <div class="loading-container" *ngIf="isLoading()">
          <div class="spinner"></div>
          <span>Scanning Cosmic Frequencies...</span>
        </div>

        <div class="track-grid" *ngIf="!isLoading()">
          <div
            class="track-card"
            *ngFor="let track of results(); let i = index"
            [class.is-active-track]="currentTrack()?.id === track.id"
            (click)="selectTrack(track, i)">
            <div class="img-container">
              <img [src]="track.album.images[0]?.url || fallbackCover" 
                   class="track-img"
                   (error)="handleImgError($event)">
              
              <!-- Equalizer overlay if playing -->
              <div class="card-eq-overlay" *ngIf="currentTrack()?.id === track.id && isPlaying()">
                <span class="c-bar"></span>
                <span class="c-bar"></span>
                <span class="c-bar"></span>
              </div>

              <div class="play-overlay" *ngIf="currentTrack()?.id !== track.id || !isPlaying()">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
            <div class="card-info">
              <div class="title" [title]="track.name">{{ track.name }}</div>
              <div class="artist">{{ track.artists[0]?.name }}</div>
            </div>
          </div>
        </div>

        <div class="no-results" *ngIf="!isLoading() && results().length === 0 && isSearching">
          <div class="no-results-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>
          <p>No echoes found for "{{ searchQuery }}".</p>
          <button class="retry-pill" (click)="selectVibe('Trending 2026')">Explore Trending 2026</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .view-container { padding: 32px 48px; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; gap: 20px; }
    
    .search-bar {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 500px;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      width: 480px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .search-bar:focus-within {
      background: rgba(255, 255, 255, 0.09);
      width: 560px;
      border-color: #ff5722;
      box-shadow: 0 0 25px rgba(255, 87, 34, 0.25);
    }
    .search-icon { width: 20px; height: 20px; margin-right: 14px; opacity: 0.4; flex-shrink: 0; }
    .search-bar input {
      background: none;
      border: none;
      color: white;
      width: 100%;
      font-size: 15px;
      outline: none;
      font-weight: 600;
    }
    .clear-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      padding: 4px;
      display: flex;
      align-items: center;
      cursor: pointer;
      transition: color 0.2s;
    }
    .clear-btn svg { width: 18px; height: 18px; fill: currentColor; }
    .clear-btn:hover { color: white; }

    .api-notice {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 87, 34, 0.1);
      color: #ff5722;
      padding: 8px 18px;
      border-radius: 50px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid rgba(255, 87, 34, 0.25);
    }
    .api-notice svg { width: 15px; height: 15px; }

    /* VIBE PILLS */
    .vibe-tags-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 36px;
      overflow-x: auto;
      padding-bottom: 8px;
    }
    .vibe-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      opacity: 0.4;
      white-space: nowrap;
    }
    .tags-scroll { display: flex; gap: 8px; }
    .tag-pill {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.7);
      padding: 8px 16px;
      border-radius: 50px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.25s;
    }
    .tag-pill:hover {
      background: rgba(255, 87, 34, 0.15);
      border-color: #ff5722;
      color: white;
      transform: translateY(-2px);
    }
    .tag-pill.active-tag {
      background: #ff5722;
      color: white;
      border-color: transparent;
      box-shadow: 0 4px 15px rgba(255, 87, 34, 0.35);
    }

    .results-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 28px;
    }
    .results-header h1 {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -1px;
    }
    .results-count {
      font-size: 13px;
      opacity: 0.4;
      font-weight: 700;
    }

    .track-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 28px;
    }
    .track-card {
      background: rgba(255, 255, 255, 0.02);
      padding: 16px;
      border-radius: 24px;
      transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .track-card:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-8px);
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 15px 35px rgba(0,0,0,0.5);
    }
    .track-card.is-active-track {
      border-color: #ff5722;
      box-shadow: 0 0 25px rgba(255, 87, 34, 0.3);
    }

    .img-container {
      position: relative;
      aspect-ratio: 1 / 1;
      width: 100%;
      margin-bottom: 16px;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 8px 20px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.08);
      background: #000;
    }
    .track-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }
    .track-card:hover .track-img { transform: scale(1.04); }
    
    .card-eq-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 48px;
      height: 48px;
      background: rgba(255, 87, 34, 0.9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
    }
    .c-bar {
      width: 3px;
      background: white;
      border-radius: 2px;
      animation: cWave 0.8s ease-in-out infinite alternate;
    }
    .c-bar:nth-child(1) { height: 14px; animation-delay: 0.1s; }
    .c-bar:nth-child(2) { height: 22px; animation-delay: 0.3s; }
    .c-bar:nth-child(3) { height: 10px; animation-delay: 0.2s; }
    @keyframes cWave {
      0% { height: 6px; }
      100% { height: 22px; }
    }

    .play-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.8);
      width: 48px;
      height: 48px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: black;
      opacity: 0;
      transition: all 0.35s;
    }
    .play-overlay svg { width: 24px; height: 24px; margin-left: 2px; }
    .track-card:hover .play-overlay { opacity: 1; transform: translate(-50%, -50%) scale(1); }

    .card-info .title {
      font-weight: 800;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 15px;
    }
    .card-info .artist {
      font-size: 12px;
      opacity: 0.45;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .loading-container {
      margin-top: 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      opacity: 0.6;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #ff5722;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .no-results {
      margin-top: 80px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .no-results-icon {
      width: 50px;
      height: 50px;
      opacity: 0.3;
    }
    .no-results-icon svg { width: 100%; height: 100%; fill: currentColor; }
    .no-results p { opacity: 0.5; font-size: 16px; font-weight: 600; }
    .retry-pill {
      background: rgba(255, 87, 34, 0.2);
      border: 1px solid #ff5722;
      color: white;
      padding: 10px 24px;
      border-radius: 50px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.25s;
    }
    .retry-pill:hover { background: #ff5722; transform: scale(1.05); }

    @media (max-width: 768px) {
      .view-container { padding: 18px; }
      header { margin-bottom: 20px; flex-direction: column; gap: 14px; align-items: stretch; }
      .search-bar { width: 100% !important; padding: 10px 18px; }
      .track-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; }
      .img-container { margin-bottom: 10px; border-radius: 14px; }
    }
  `]
})
export class SearchViewComponent implements OnInit {
  private store = inject(Store);
  public ytService = inject(YoutubeService);
  private toast = inject(ToastService);

  results = this.store.selectSignal(selectTopTracks);
  isLoading = this.store.selectSignal(selectPlayerLoading);
  currentTrack = this.store.selectSignal(selectCurrentTrack);
  isPlaying = this.store.selectSignal(selectIsPlaying);
  apiError = this.ytService.apiError;

  searchQuery: string = '';
  isSearching: boolean = false;

  quickVibes = [
    'Trending 2026',
    'Phonk Drift',
    'Cyber Synthwave',
    'Lofi Chill',
    'Bollywood Echoes',
    'Punjabi Heat',
    'Veda Beats',
    'Global Pop'
  ];

  ngOnInit() {
    if (this.results().length === 0) {
      this.store.dispatch(PlayerActions.loadTopTracks());
    }
  }

  search() {
    if (!this.searchQuery.trim()) return;
    this.isSearching = true;
    this.store.dispatch(PlayerActions.searchTracks({ query: this.searchQuery }));
    this.toast.show(`Searching: "${this.searchQuery}"`, 'info');
  }

  selectVibe(vibe: string) {
    this.searchQuery = vibe;
    this.search();
  }

  clearSearch() {
    this.searchQuery = '';
    this.isSearching = false;
    this.store.dispatch(PlayerActions.loadTopTracks());
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

  selectTrack(track: any, index: number) {
    const allResults = this.results();
    if (allResults.length > 0) {
      this.store.dispatch(PlayerActions.setQueue({ tracks: allResults, startIndex: index }));
    } else {
      this.store.dispatch(PlayerActions.setCurrentTrack({ track }));
    }
    this.toast.show(`Playing: ${track.name}`, 'info');
  }
}
