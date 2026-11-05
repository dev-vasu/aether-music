import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectCategorizedMusic, selectHomeLoading } from '../../state/home/home.selectors';
import { selectCurrentTrack, selectIsPlaying } from '../../state/player/player.selectors';
import { HomeActions } from '../../state/home/home.actions';
import { PlayerActions } from '../../state/player/player.actions';
import { GoogleAuthService } from '../../services/google-auth.service';
import { ToastService } from '../../services/toast.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="braun-home-view">
      <!-- CATEGORY FILTER CHIPS -->
      <div class="category-filter-bar">
        <button
          class="cat-chip"
          [class.active-chip]="activeCategory() === 'all'"
          (click)="activeCategory.set('all')">
          <span class="chip-dot" *ngIf="activeCategory() === 'all'"></span>
          All Recordings
        </button>
        <button
          class="cat-chip"
          *ngFor="let cat of musicCategories"
          [class.active-chip]="activeCategory() === cat.key"
          (click)="activeCategory.set(cat.key)">
          <span class="chip-dot" *ngIf="activeCategory() === cat.key"></span>
          {{ cat.title }}
        </button>
      </div>

      <div class="feed-content">
        <div class="discovery-loader" *ngIf="isLoading()">
          <div class="pulse-ring"></div>
          <span>Loading Master Audio Archive...</span>
        </div>

        <div *ngIf="!isLoading()" class="catalog-stacks">
          <section
            class="sound-row"
            *ngFor="let cat of filteredCategories(); let i = index">
            <div class="sound-meta">
              <div class="meta-title-group">
                <span class="index">{{ cat.index }} //</span>
                <h2>{{ cat.title }}</h2>
              </div>
              <button
                class="row-play-all"
                (click)="playAllInRow(cat.key)"
                [title]="'Play all in ' + cat.title">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Play Section
              </button>
            </div>
            
            <div class="track-flow">
              <div
                class="art-card"
                *ngFor="let track of musicData()[cat.key]; let tIdx = index"
                [class.is-active-card]="currentTrack()?.id === track.id"
                (click)="selectTrack(track, cat.key, tIdx)">
                <div class="card-visual">
                  <img [src]="track.album.images[0]?.url || fallbackCover" 
                       class="track-image" 
                       (error)="handleImgError($event)">
                  <div class="hover-glow"></div>
                  
                  <!-- Card Equalizer when active -->
                  <div class="card-eq-overlay" *ngIf="currentTrack()?.id === track.id && isPlaying()">
                    <span class="c-bar"></span>
                    <span class="c-bar"></span>
                    <span class="c-bar"></span>
                  </div>

                  <div class="play-trigger" *ngIf="currentTrack()?.id !== track.id || !isPlaying()">
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
                <div class="card-info">
                  <div class="name" [title]="track.name">{{ track.name }}</div>
                  <div class="creator">{{ track.artists[0]?.name }}</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .braun-home-view {
      padding: 24px 48px;
    }

    /* MINIMALIST CATEGORY CHIPS */
    .category-filter-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 12px;
      margin-bottom: 36px;
    }
    .category-filter-bar::-webkit-scrollbar { height: 0; }
    
    .cat-chip {
      background: #17181c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #9ca3af;
      padding: 8px 18px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.2px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .cat-chip:hover {
      background: #202227;
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.18);
    }
    .cat-chip.active-chip {
      background: #24262c;
      border-color: rgba(255, 255, 255, 0.22);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }
    .chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ff5722;
      box-shadow: 0 0 6px rgba(255, 87, 34, 0.6);
    }

    /* CATALOG STACKS */
    .catalog-stacks {
      display: flex;
      flex-direction: column;
      gap: 52px;
    }
    .sound-row .sound-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
    }
    .meta-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .index {
      font-size: 13px;
      font-family: var(--font-mono);
      font-weight: 700;
      color: #ff5722;
      opacity: 0.85;
      letter-spacing: 1px;
    }
    .sound-row h2 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.4px;
      color: #f3f4f6;
    }
    .row-play-all {
      background: #1c1e23;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #9ca3af;
      padding: 6px 14px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .row-play-all svg { width: 12px; height: 12px; fill: #ff5722; }
    .row-play-all:hover {
      background: #24262c;
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.2);
    }

    .track-flow {
      display: flex;
      gap: 22px;
      overflow-x: auto;
      padding-bottom: 20px;
    }
    .track-flow::-webkit-scrollbar { height: 0; }
    
    .art-card {
      width: 200px;
      flex-shrink: 0;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
    }
    .art-card.is-active-card .card-visual {
      border-color: #ff5722;
      box-shadow: 0 8px 24px rgba(255, 87, 34, 0.2);
    }
    .art-card:hover {
      transform: translateY(-4px);
    }
    .art-card:hover .hover-glow {
      opacity: 1;
    }
    .art-card:hover .play-trigger {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    .art-card:hover .track-image {
      transform: scale(1.04);
    }

    .card-visual {
      position: relative;
      width: 200px;
      height: 200px;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 12px;
      background: #141518;
      border: 1px solid rgba(255, 255, 255, 0.07);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
      transition: all 0.25s ease;
    }
    .track-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }
    .hover-glow {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 40%, rgba(10, 11, 14, 0.7) 100%);
      opacity: 0;
      transition: opacity 0.25s;
    }

    .card-eq-overlay {
      position: absolute;
      bottom: 10px;
      right: 10px;
      display: flex;
      align-items: flex-end;
      gap: 2.5px;
      height: 16px;
      background: rgba(18, 19, 22, 0.85);
      backdrop-filter: blur(8px);
      padding: 3px 6px;
      border-radius: 6px;
      border: 1px solid rgba(255, 87, 34, 0.4);
    }
    .c-bar {
      width: 2.5px;
      background: #ff5722;
      border-radius: 1px;
      animation: cWave 0.7s ease-in-out infinite alternate;
    }
    .c-bar:nth-child(1) { height: 50%; animation-delay: 0.1s; }
    .c-bar:nth-child(2) { height: 100%; animation-delay: 0.3s; }
    .c-bar:nth-child(3) { height: 40%; animation-delay: 0.2s; }

    @keyframes cWave {
      0% { height: 25%; }
      100% { height: 100%; }
    }

    .play-trigger {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.85);
      width: 44px;
      height: 44px;
      background: #1c1e23;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.25s ease;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
    }
    .play-trigger svg {
      width: 18px;
      height: 18px;
      fill: #ff5722;
      margin-left: 2px;
    }

    .card-info .name {
      font-size: 13.5px;
      font-weight: 600;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #f3f4f6;
      letter-spacing: -0.1px;
    }
    .card-info .creator {
      font-size: 12px;
      color: #9ca3af;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .discovery-loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 0;
      gap: 16px;
      font-size: 13px;
      font-weight: 500;
      color: #9ca3af;
    }
    .pulse-ring {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-top-color: #ff5722;
      animation: spin 0.9s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .braun-home-view {
        padding: 16px 20px;
      }
      .art-card {
        width: 160px;
      }
      .card-visual {
        width: 160px;
        height: 160px;
      }
    }
  `]
})
export class HomeViewComponent implements OnInit {
  private store = inject(Store);
  private authService = inject(GoogleAuthService);
  private toast = inject(ToastService);

  musicData = this.store.selectSignal(selectCategorizedMusic);
  isLoading = this.store.selectSignal(selectHomeLoading);
  currentTrack = this.store.selectSignal(selectCurrentTrack);
  isPlaying = this.store.selectSignal(selectIsPlaying);
  userProfile = this.authService.userProfile;

  activeCategory = signal<string>('all');

  musicCategories = [
    { title: 'Global Trending', key: 'trending' as const, index: '01' },
    { title: 'Viral Rotation', key: 'instaViral' as const, index: '02' },
    { title: 'Spiritual & Veda', key: 'devotional' as const, index: '03' },
    { title: 'Bollywood Classics', key: 'hindi' as const, index: '04' },
    { title: 'Punjabi Hits', key: 'punjabi' as const, index: '05' },
    { title: 'Global Anthems', key: 'english' as const, index: '06' }
  ];

  filteredCategories = computed(() => {
    const cat = this.activeCategory();
    if (cat === 'all') return this.musicCategories;
    return this.musicCategories.filter(c => c.key === cat);
  });

  ngOnInit() {
    this.store.dispatch(HomeActions.loadCategorizedMusic());
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

  selectTrack(track: any, categoryKey: string, index: number) {
    const rowTracks = this.musicData()[categoryKey as keyof ReturnType<typeof this.musicData>] || [];
    if (rowTracks.length > 0) {
      this.store.dispatch(PlayerActions.setQueue({ tracks: rowTracks, startIndex: index }));
    } else {
      this.store.dispatch(PlayerActions.setCurrentTrack({ track }));
    }
  }

  playAllInRow(categoryKey: string) {
    const rowTracks = this.musicData()[categoryKey as keyof ReturnType<typeof this.musicData>] || [];
    if (rowTracks.length > 0) {
      this.store.dispatch(PlayerActions.setQueue({ tracks: rowTracks, startIndex: 0 }));
      this.toast.show(`Playing ${categoryKey} catalog`, 'info');
    }
  }
}
