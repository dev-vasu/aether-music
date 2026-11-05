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
      <!-- HERO EXPERIENCE -->
      <section class="cosmic-hero glass" *ngIf="featuredTrack() as hero">
        <div class="hero-backdrop" [style.backgroundImage]="'url(' + hero.album.images[0]?.url + ')'"></div>
        <div class="hero-overlay"></div>

        <div class="hero-content">
          <div class="hero-left">
            <div class="hero-tags">
              <span class="hero-badge live-pulse">
                <span class="pulsar-dot"></span>
                Featured Orbit
              </span>
              <span class="hero-subtag">2026 Soundscape &bull; Lossless</span>
            </div>
            
            <h1 class="hero-title">{{ hero.name }}</h1>
            <p class="hero-artist">By {{ hero.artists[0]?.name }}</p>

            <div class="hero-actions">
              <button class="hero-play-btn" (click)="playFeatured()">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Launch Orbit
              </button>
              
              <div class="hero-audio-spec" *ngIf="isPlaying() && currentTrack()?.id === hero.id">
                <div class="spec-bars">
                  <span class="sb"></span><span class="sb"></span><span class="sb"></span><span class="sb"></span>
                </div>
                <span>Playing in Realtime</span>
              </div>
            </div>
          </div>

          <!-- Rotating Vinyl Disc Visual -->
          <div class="hero-right">
            <div class="vinyl-rig" [class.spinning]="isPlaying() && currentTrack()?.id === hero.id" (click)="playFeatured()">
              <div class="vinyl-disc">
                <div class="vinyl-grooves"></div>
                <div class="vinyl-center">
                  <img [src]="hero.album.images[0]?.url" class="vinyl-cover" (error)="handleImgError($event)">
                </div>
              </div>
              <div class="vinyl-glow"></div>
            </div>
          </div>
        </div>
      </section>

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
      padding: 0 48px;
    }

    /* COSMIC HERO BANNER */
    .cosmic-hero {
      position: relative;
      border-radius: 36px;
      overflow: hidden;
      margin-bottom: 48px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15);
      min-height: 280px;
    }
    .hero-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
      filter: blur(50px) saturate(1.8) brightness(0.4);
      transform: scale(1.15);
      z-index: 1;
    }
    .hero-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, rgba(3, 0, 8, 0.95) 0%, rgba(3, 0, 8, 0.7) 60%, rgba(3, 0, 8, 0.4) 100%);
      z-index: 2;
    }
    .hero-content {
      position: relative;
      z-index: 3;
      padding: 40px 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 32px;
    }
    .hero-left {
      max-width: 580px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .hero-tags {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(168, 85, 247, 0.25);
      border: 1px solid rgba(168, 85, 247, 0.5);
      color: #e9d5ff;
      padding: 6px 14px;
      border-radius: 50px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .pulsar-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #a855f7;
      box-shadow: 0 0 10px #a855f7;
      animation: pulse 1.5s infinite;
    }
    .hero-subtag {
      font-size: 12px;
      opacity: 0.6;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .hero-title {
      font-size: 42px;
      font-weight: 900;
      letter-spacing: -1.5px;
      line-height: 1.1;
      background: linear-gradient(135deg, #ffffff 40%, rgba(255, 255, 255, 0.6) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero-artist {
      font-size: 16px;
      opacity: 0.7;
      font-weight: 600;
    }
    .hero-actions {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-top: 10px;
    }
    .hero-play-btn {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      border: none;
      color: white;
      padding: 14px 32px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 10px 30px rgba(168, 85, 247, 0.4);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .hero-play-btn svg { width: 18px; height: 18px; fill: currentColor; }
    .hero-play-btn:hover {
      transform: scale(1.06);
      box-shadow: 0 15px 40px rgba(168, 85, 247, 0.6);
    }
    .hero-audio-spec {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      opacity: 0.8;
      font-weight: 700;
      color: #c084fc;
    }
    .spec-bars {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 16px;
    }
    .sb {
      width: 3px;
      background: #a855f7;
      border-radius: 2px;
      animation: cWave 0.8s ease-in-out infinite alternate;
    }
    .sb:nth-child(1) { height: 60%; animation-delay: 0.1s; }
    .sb:nth-child(2) { height: 100%; animation-delay: 0.3s; }
    .sb:nth-child(3) { height: 40%; animation-delay: 0.2s; }
    .sb:nth-child(4) { height: 80%; animation-delay: 0.4s; }

    /* VINYL RECORD */
    .hero-right {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .vinyl-rig {
      position: relative;
      width: 190px;
      height: 190px;
      cursor: pointer;
      transition: transform 0.4s;
    }
    .vinyl-rig:hover { transform: scale(1.05); }
    .vinyl-rig.spinning .vinyl-disc {
      animation: vinylSpin 14s linear infinite;
    }
    .vinyl-disc {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle, #1a1a24 0%, #0a0a0f 70%, #000 100%);
      box-shadow: 0 15px 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(255,255,255,0.05);
      border: 3px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .vinyl-grooves {
      position: absolute;
      width: 82%;
      height: 82%;
      border-radius: 50%;
      border: 1px dashed rgba(255,255,255,0.08);
    }
    .vinyl-center {
      width: 74px;
      height: 74px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid white;
      box-shadow: 0 0 15px rgba(0,0,0,0.8);
      position: relative;
      z-index: 2;
    }
    .vinyl-cover { width: 100%; height: 100%; object-fit: cover; transform: scale(1.35); }
    .vinyl-glow {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%);
      filter: blur(25px);
      z-index: -1;
    }

    /* CATEGORY FILTER CHIPS */
    .category-filter-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 12px;
      margin-bottom: 44px;
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
      gap: 64px;
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
      border-color: #a855f7;
      box-shadow: 0 0 30px rgba(168, 85, 247, 0.5);
    }
    .card-visual {
      position: relative;
      aspect-ratio: 1 / 1;
      border-radius: 24px;
      overflow: hidden;
      background: #000;
      border: 1px solid rgba(255,255,255,0.09);
      margin-bottom: 14px;
      box-shadow: 0 12px 35px rgba(0,0,0,0.4);
      transition: all 0.3s;
    }
    .track-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.4);
      filter: contrast(1.05) saturate(1.15);
      image-rendering: -webkit-optimize-contrast;
      transition: transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
    }
    .hover-glow {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, rgba(168, 85, 247, 0.3) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.4s;
    }
    .card-eq-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 56px;
      height: 56px;
      background: rgba(168, 85, 247, 0.9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      box-shadow: 0 0 25px rgba(168, 85, 247, 0.9);
    }
    .c-bar {
      width: 3.5px;
      background: white;
      border-radius: 2px;
      animation: cWave 0.8s ease-in-out infinite alternate;
    }
    .c-bar:nth-child(1) { height: 16px; animation-delay: 0.1s; }
    .c-bar:nth-child(2) { height: 26px; animation-delay: 0.3s; }
    .c-bar:nth-child(3) { height: 12px; animation-delay: 0.2s; }
    @keyframes cWave {
      0% { height: 8px; }
      100% { height: 26px; }
    }

    .play-trigger {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.8);
      width: 56px;
      height: 56px;
      background: rgba(255,255,255,0.95);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .play-trigger svg {
      width: 28px;
      height: 28px;
      fill: black;
      margin-left: 3px;
    }
    .art-card:hover .track-image { transform: scale(1.5); }
    .art-card:hover .hover-glow { opacity: 1; }
    .art-card:hover .play-trigger {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    .art-card:hover { transform: translateY(-6px); }
    .card-info .name {
      font-weight: 800;
      font-size: 15px;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-info .creator {
      font-size: 12px;
      opacity: 0.45;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .discovery-loader {
      margin-top: 100px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }
    .pulse-ring {
      width: 56px;
      height: 56px;
      border: 2px solid #a855f7;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    @media (max-width: 768px) {
      .aurora-view { padding: 0 16px; }
      .cosmic-hero { border-radius: 26px; margin-bottom: 28px; }
      .hero-content { padding: 24px 20px; flex-direction: column-reverse; gap: 20px; }
      .hero-right { width: 100%; justify-content: center; }
      .vinyl-rig { width: 140px; height: 140px; }
      .vinyl-center { width: 56px; height: 56px; }
      .hero-title { font-size: 26px; }
      .hero-artist { font-size: 13px; }
      .hero-play-btn { padding: 10px 22px; font-size: 12px; }
      
      .category-filter-bar { margin-bottom: 28px; }
      .aurora-stacks { gap: 36px; }
      .sound-row h2 { font-size: 20px; }
      .track-flow { gap: 14px; }
      .art-card { width: 140px; }
      .card-visual { border-radius: 18px; margin-bottom: 10px; }
      .card-info .name { font-size: 13px; }
      .card-info .creator { font-size: 11px; }
      .play-trigger { width: 40px; height: 40px; }
      .play-trigger svg { width: 20px; height: 20px; }
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

  featuredTrack = computed(() => {
    const data = this.musicData();
    const trending = data?.trending;
    return trending?.[0] || null;
  });

  filteredCategories = computed(() => {
    const cat = this.activeCategory();
    if (cat === 'all') return this.musicCategories;
    return this.musicCategories.filter(c => c.key === cat);
  });

  ngOnInit() {
    this.store.dispatch(HomeActions.loadCategorizedMusic());
  }

  playFeatured() {
    const hero = this.featuredTrack();
    if (hero) {
      const trending = this.musicData()?.trending || [];
      this.store.dispatch(PlayerActions.setQueue({ tracks: trending, startIndex: 0 }));
      this.toast.show(`Launched Orbit: ${hero.name}`, 'info');
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
