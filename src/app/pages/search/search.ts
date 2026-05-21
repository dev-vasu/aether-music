import { Component, inject, OnInit, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectTopTracks, selectPlayerLoading } from '../../state/player/player.selectors';
import { PlayerActions } from '../../state/player/player.actions';
import { YoutubeService } from '../../services/youtube.service';
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
            placeholder="Search for songs, artists, or albums..."
            autofocus>
        </div>
        <div class="api-notice" *ngIf="apiError()">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            <span *ngIf="apiError() === 'QUOTA_LIMIT_HIT'">Searching Curated Mode (API Exhausted)</span>
            <span *ngIf="apiError() !== 'QUOTA_LIMIT_HIT'">Showing Fallback Results</span>
        </div>
      </header>

      <div class="content">
        <h1 *ngIf="isSearching">Search Results for "{{ searchQuery }}"</h1>
        <h1 *ngIf="!isSearching">Browse</h1>
        
        <div class="loading-container" *ngIf="isLoading()">
            <div class="spinner"></div>
            <span>Searching Soundscape...</span>
        </div>

        <div class="track-grid" *ngIf="!isLoading()">
           <div class="track-card" *ngFor="let track of results()" (click)="selectTrack(track)">
             <div class="img-container">
                <img [src]="track.album.images[0]?.url" 
                     class="track-img"
                     (error)="handleImgError($event)"
                     (load)="checkSharpness($event)">
                <div class="play-overlay">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>
             </div>
             <div class="card-info">
               <div class="title" [title]="track.name">{{ track.name }}</div>
               <div class="artist">{{ track.artists[0].name }}</div>
             </div>
           </div>
        </div>

        <div class="no-results" *ngIf="!isLoading() && results().length === 0 && isSearching">
          No tracks found. Try another vibe!
        </div>
      </div>
    </div>
  `,
  styles: [`
    .view-container { padding: 32px 48px; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 48px; }
    .search-bar { background: rgba(255, 255, 255, 0.05); border-radius: 500px; padding: 12px 24px; display: flex; align-items: center; width: 450px; border: 1px solid rgba(255, 255, 255, 0.08); transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); }
    .search-bar:focus-within { background: rgba(255, 255, 255, 0.1); width: 550px; border-color: #a855f7; box-shadow: 0 0 25px rgba(168, 85, 247, 0.2); }
    .search-icon { width: 20px; height: 20px; margin-right: 14px; opacity: 0.4; }
    .search-bar input { background: none; border: none; color: white; width: 100%; font-size: 15px; outline: none; font-weight: 600; }
    .api-notice { display: flex; align-items: center; gap: 10px; background: rgba(168, 85, 247, 0.1); color: #a855f7; padding: 8px 16px; border-radius: 50px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid rgba(168, 85, 247, 0.2); }
    .api-notice svg { width: 14px; height: 14px; }
    .content h1 { font-size: 32px; font-weight: 900; margin-bottom: 32px; letter-spacing: -1px; }
    .track-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 32px; }
    .track-card { background: rgba(255, 255, 255, 0.02); padding: 18px; border-radius: 28px; transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.03); }
    .track-card:hover { background: rgba(255, 255, 255, 0.08); transform: translateY(-10px); border-color: rgba(255, 255, 255, 0.1); box-shadow: 0 15px 35px rgba(0,0,0,0.4); }
    .img-container { position: relative; aspect-ratio: 1 / 1; width: 100%; margin-bottom: 20px; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.08); }
    .track-img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.4); filter: contrast(1.05) saturate(1.1); transition: transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1); }
    .track-card:hover .track-img { transform: scale(1.5); }
    .play-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8); width: 50px; height: 50px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: black; opacity: 0; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .play-overlay svg { width: 24px; height: 24px; margin-left: 2px; }
    .track-card:hover .play-overlay { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    .card-info .title { font-weight: 800; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 15px; }
    .card-info .artist { font-size: 12px; opacity: 0.4; font-weight: 600; }
    .loading-container { margin-top: 100px; display: flex; flex-direction: column; align-items: center; gap: 20px; opacity: 0.3; }
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(255, 255, 255, 0.1); border-top-color: #a855f7; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .no-results { margin-top: 100px; text-align: center; opacity: 0.2; font-weight: 700; }

    @media (max-width: 768px) {
        .view-container { padding: 20px; }
        header { margin-bottom: 24px; flex-direction: column; gap: 16px; align-items: stretch; }
        .search-bar { width: 100% !important; padding: 10px 16px; }
        .track-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; }
        .img-container { margin-bottom: 12px; border-radius: 14px; }
    }
  `]
})
export class SearchViewComponent {
  private store = inject(Store);
  private ytService = inject(YoutubeService);
  
  results = this.store.selectSignal(selectTopTracks);
  isLoading = this.store.selectSignal(selectPlayerLoading);
  apiError = this.ytService.apiError;
  
  searchQuery: string = '';
  isSearching: boolean = false;

  async search() {
    if (!this.searchQuery) return;
    this.isSearching = true;
    this.store.dispatch(PlayerActions.loadTopTracks()); 

    const tracks = await this.ytService.searchMusic(this.searchQuery, { isUserSearch: true });
    
    // Check if result is empty AND we hit a quota limit
    if (tracks.length === 0 && (this.apiError() === 'QUOTA_LIMIT_HIT' || this.apiError()?.includes('BACKUP'))) {
        const curated = this.ytService.getCuratedMockData();
        const fallback = [...curated.trending, ...curated.instaViral, ...curated.english];
        this.store.dispatch(PlayerActions.loadTopTracksSuccess({ tracks: fallback }));
    } else {
        this.store.dispatch(PlayerActions.loadTopTracksSuccess({ tracks: tracks || [] }));
    }
  }

  handleImgError(event: any) {
      const img = event.target;
      const resolutions = ['maxresdefault.jpg', 'sddefault.jpg', 'hqdefault.jpg', 'mqdefault.jpg'];
      const currentRes = resolutions.find(r => img.src.includes(r));
      const nextIdx = resolutions.indexOf(currentRes!) + 1;
      if (nextIdx < resolutions.length) {
          img.src = img.src.replace(currentRes!, resolutions[nextIdx]);
      }
  }

  checkSharpness(event: any) {
      const img = event.target;
      if (img.naturalWidth <= 120) {
          this.handleImgError(event);
      }
  }

  selectTrack(track: any) {
    this.store.dispatch(PlayerActions.setCurrentTrack({ track }));
  }
}
