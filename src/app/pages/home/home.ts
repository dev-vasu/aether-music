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
    <div class="aurora-view">
      <!-- CATEGORY FILTER CHIPS -->
      <div class="category-filter-bar">
        <button
          class="cat-chip"
          [class.active-chip]="activeCategory() === 'all'"
          (click)="activeCategory.set('all')">
          🌌 All Cosmic Orbits
        </button>
        <button
          class="cat-chip"
          *ngFor="let cat of musicCategories"
          [class.active-chip]="activeCategory() === cat.key"
          (click)="activeCategory.set(cat.key)">
          {{ cat.emoji }} {{ cat.title }}
        </button>
      </div>

      <div class="feed-content">
        <div class="discovery-loader" *ngIf="isLoading()">
          <div class="pulse-ring"></div>
          <span>Syncing with the Cosmos...</span>
        </div>

        <div *ngIf="!isLoading()" class="aurora-stacks">
          <section
            class="sound-row"
            *ngFor="let cat of filteredCategories(); let i = index">
            <div class="sound-meta">
              <div class="meta-title-group">
                <span class="index">0{{ i + 1 }}</span>
                <h2>{{ cat.title }}</h2>
              </div>
              <button
                class="row-play-all"
                (click)="playAllInRow(cat.key)"
                [title]="'Play all in ' + cat.title">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Play Orbit
              </button>
            </div>
            
            <div class="track-flow">
              <div
                class="art-card"
                *ngFor="let track of musicData()[cat.key]; let tIdx = index"
                [class.is-active-card]="currentTrack()?.id === track.id"
                (click)="selectTrack(track, cat.key, tIdx)">
                <div class="card-visual">
                  <img [src]="track.album.images[0]?.url" 
                       class="track-image" 
                       (error)="handleImgError($event)"
                       (load)="checkSharpness($event)">
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
    .aurora-view {
      padding: 24px 48px;
    }

    /* CATEGORY FILTER CHIPS */
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
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.09);
      color: rgba(255, 255, 255, 0.7);
      padding: 10px 20px;
      border-radius: 50px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.25s;
    }
    .cat-chip:hover {
      background: rgba(168, 85, 247, 0.15);
      border-color: #a855f7;
      color: white;
      transform: translateY(-2px);
    }
    .cat-chip.active-chip {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      border-color: transparent;
      color: white;
      box-shadow: 0 4px 20px rgba(168, 85, 247, 0.4);
    }

    /* SOUND ROWS & CARDS */
    .aurora-stacks {
      display: flex;
      flex-direction: column;
      gap: 56px;
    }
    .sound-row .sound-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 22px;
    }
    .meta-title-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .index {
      font-size: 14px;
      font-family: var(--font-mono);
      opacity: 0.35;
      color: #a855f7;
    }
    .sound-row h2 {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.5px;
      font-family: var(--font-display);
    }
    .row-play-all {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      padding: 7px 16px;
      border-radius: 50px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.25s;
    }
    .row-play-all svg { width: 14px; height: 14px; fill: #a855f7; }
    .row-play-all:hover {
      background: rgba(168, 85, 247, 0.25);
      border-color: #a855f7;
      transform: scale(1.05);
    }

    .track-flow {
      display: flex;
      gap: 28px;
      overflow-x: auto;
      padding-bottom: 24px;
    }
    .track-flow::-webkit-scrollbar { height: 0; }
    
    .art-card {
      width: 215px;
      flex-shrink: 0;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
    }
    .art-card.is-active-card .card-visual {
      box-shadow: 0 10px 30px rgba(168, 85, 247, 0.5);
      border-color: #a855f7;
    }
    .art-card:hover {
      transform: translateY(-8px);
    }
    .art-card:hover .hover-glow {
      opacity: 1;
    }
    .art-card:hover .play-trigger {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    .art-card:hover .track-image {
      transform: scale(1.08);
    }

    .card-visual {
      position: relative;
      width: 215px;
      height: 215px;
      border-radius: 24px;
      overflow: hidden;
      margin-bottom: 16px;
      background: #0d0c18;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
      transition: all 0.3s ease;
    }
    .track-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
    }
    .hover-glow {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, transparent 40%, rgba(3, 0, 8, 0.8) 100%);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .card-eq-overlay {
      position: absolute;
      bottom: 16px;
      right: 16px;
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 18px;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      padding: 4px 8px;
      border-radius: 12px;
      border: 1px solid rgba(168, 85, 247, 0.4);
    }
    .c-bar {
      width: 3px;
      background: #a855f7;
      border-radius: 2px;
      animation: cWave 0.7s ease-in-out infinite alternate;
    }
    .c-bar:nth-child(1) { height: 60%; animation-delay: 0.1s; }
    .c-bar:nth-child(2) { height: 100%; animation-delay: 0.3s; }
    .c-bar:nth-child(3) { height: 40%; animation-delay: 0.2s; }

    @keyframes cWave {
      0% { height: 20%; }
      100% { height: 100%; }
    }

    .play-trigger {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.8);
      width: 50px;
      height: 50px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }
    .play-trigger svg {
      width: 20px;
      height: 20px;
      fill: #000;
      margin-left: 3px;
    }

    .card-info .name {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: rgba(255, 255, 255, 0.95);
    }
    .card-info .creator {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.45);
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
      gap: 20px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
    }
    .pulse-ring {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 3px solid rgba(168, 85, 247, 0.2);
      border-top-color: #a855f7;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
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
    { title: 'The Pulsar', key: 'trending' as const, emoji: '⚡' },
    { title: 'Solar Echoes', key: 'instaViral' as const, emoji: '🔥' },
    { title: 'Veda Beats', key: 'devotional' as const, emoji: '🕉️' },
    { title: 'Eastern Flow', key: 'hindi' as const, emoji: '🎵' },
    { title: 'Cyber Punjabi', key: 'punjabi' as const, emoji: '💥' },
    { title: 'Nebula Pop', key: 'english' as const, emoji: '✨' }
  ];

  filteredCategories = computed(() => {
    const cat = this.activeCategory();
    if (cat === 'all') return this.musicCategories;
    return this.musicCategories.filter(c => c.key === cat);
  });

  ngOnInit() {
    this.store.dispatch(HomeActions.loadCategorizedMusic());
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

  selectTrack(track: any, categoryKey: string, index: number) {
    const rowTracks = this.musicData()[categoryKey as keyof ReturnType<typeof this.musicData>] || [];
    if (rowTracks.length > 0) {
      this.store.dispatch(PlayerActions.setQueue({ tracks: rowTracks, startIndex: index }));
    } else {
      this.store.dispatch(PlayerActions.setCurrentTrack({ track }));
    }
    this.toast.show(`Playing: ${track.name}`, 'info');
  }

  playAllInRow(categoryKey: string) {
    const rowTracks = this.musicData()[categoryKey as keyof ReturnType<typeof this.musicData>] || [];
    if (rowTracks.length > 0) {
      this.store.dispatch(PlayerActions.setQueue({ tracks: rowTracks, startIndex: 0 }));
      this.toast.show(`Playing Orbit: ${rowTracks[0]?.name}`, 'info');
    }
  }
}
