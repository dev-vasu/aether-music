import { Component, inject, OnInit } from '@angular/core';
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
      <header class="vibe-header">
        <div class="welcome">
          <span class="greeting">Good day, {{ userProfile()?.alias || userProfile()?.name || 'Traveler' }}</span>
          <h1>Explore the Soundscape</h1>
        </div>
      </header>

      <div class="feed-content">
        <div class="discovery-loader" *ngIf="isLoading()">
          <div class="pulse-ring"></div>
          <span>Syncing with the Cosmos...</span>
        </div>

        <div *ngIf="!isLoading()" class="aurora-stacks">
          <section class="sound-row" *ngFor="let cat of musicCategories; let i = index">
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
    .vibe-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 56px;
    }
    .greeting {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #a855f7;
      margin-bottom: 8px;
      display: block;
    }
    .vibe-header h1 {
      font-size: 52px;
      font-weight: 900;
      letter-spacing: -2px;
      background: linear-gradient(to bottom, #fff 40%, rgba(255,255,255,0.4) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .aurora-stacks {
      display: flex;
      flex-direction: column;
      gap: 72px;
    }
    .sound-row .sound-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .meta-title-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .index {
      font-size: 14px;
      font-family: monospace;
      opacity: 0.35;
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
      padding: 6px 14px;
      border-radius: 50px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.25s;
    }
    .row-play-all svg { width: 14px; height: 14px; fill: #a855f7; }
    .row-play-all:hover {
      background: rgba(168, 85, 247, 0.2);
      border-color: #a855f7;
      transform: scale(1.04);
    }

    .track-flow {
      display: flex;
      gap: 28px;
      overflow-x: auto;
      padding-bottom: 24px;
    }
    .track-flow::-webkit-scrollbar { height: 0; }
    
    .art-card {
      width: 210px;
      flex-shrink: 0;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
    }
    .art-card.is-active-card .card-visual {
      border-color: #a855f7;
      box-shadow: 0 0 25px rgba(168, 85, 247, 0.4);
    }
    .card-visual {
      position: relative;
      aspect-ratio: 1 / 1;
      border-radius: 24px;
      overflow: hidden;
      background: #000;
      border: 1px solid rgba(255,255,255,0.08);
      margin-bottom: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    .track-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.4);
      filter: contrast(1.05) saturate(1.1);
      image-rendering: -webkit-optimize-contrast;
      transition: transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
    }
    .hover-glow {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, rgba(168, 85, 247, 0.25) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.4s;
    }
    .card-eq-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 54px;
      height: 54px;
      background: rgba(168, 85, 247, 0.85);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      box-shadow: 0 0 20px rgba(168, 85, 247, 0.8);
    }
    .c-bar {
      width: 3px;
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
      background: rgba(255,255,255,0.92);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.35s;
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
      margin-top: 140px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
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
      .aurora-view { padding: 0 18px; }
      .vibe-header { margin-bottom: 28px; }
      .vibe-header h1 { font-size: 30px; letter-spacing: -1px; }
      .greeting { font-size: 11px; letter-spacing: 2px; }
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

  musicCategories = [
    { title: 'The Pulsar', key: 'trending' as const },
    { title: 'Solar Echoes', key: 'instaViral' as const },
    { title: 'Veda Beats', key: 'devotional' as const },
    { title: 'Eastern Flow', key: 'hindi' as const },
    { title: 'Cyber Punjabi', key: 'punjabi' as const },
    { title: 'Nebula Pop', key: 'english' as const }
  ];

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
