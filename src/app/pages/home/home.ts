import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectCategorizedMusic, selectHomeLoading } from '../../state/home/home.selectors';
import { HomeActions } from '../../state/home/home.actions';
import { PlayerActions } from '../../state/player/player.actions';
import { GoogleAuthService } from '../../services/google-auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="aurora-view">
      <header class="vibe-header">
        <div class="welcome">
            <span class="greeting">Good day, {{ userProfile()?.name || 'Traveler' }}</span>
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
                <span class="index">0{{ i + 1 }}</span>
                <h2>{{ cat.title }}</h2>
            </div>
            <div class="track-flow">
                <div class="art-card" *ngFor="let track of musicData()[cat.key]" (click)="selectTrack(track)">
                    <div class="card-visual">
                        <img [src]="track.album.images[0]?.url" 
                             class="track-image" 
                             (error)="handleImgError($event)"
                             (load)="checkSharpness($event)">
                        <div class="hover-glow"></div>
                        <div class="play-trigger">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                    <div class="card-info">
                        <div class="name" [title]="track.name">{{ track.name }}</div>
                        <div class="creator">{{ track.artists[0].name }}</div>
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
      margin-bottom: 64px;
    }
    .greeting {
        font-size: 14px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 3px;
        color: #a855f7;
        margin-bottom: 8px;
        display: block;
    }
    .vibe-header h1 {
        font-size: 56px;
        font-weight: 900;
        letter-spacing: -2px;
        background: linear-gradient(to bottom, #fff 40%, rgba(255,255,255,0.4) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .aurora-stacks {
        display: flex;
        flex-direction: column;
        gap: 80px;
    }
    .sound-row .sound-meta {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
    }
    .index {
        font-size: 14px;
        font-family: monospace;
        opacity: 0.3;
    }
    .sound-row h2 {
        font-size: 28px;
        font-weight: 900;
        letter-spacing: -0.5px;
    }
    .track-flow {
        display: flex;
        gap: 32px;
        overflow-x: auto;
        padding-bottom: 24px;
    }
    .track-flow::-webkit-scrollbar { height: 0; }
    
    .art-card {
      width: 220px;
      flex-shrink: 0;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
    }
    .card-visual {
        position: relative;
        aspect-ratio: 1 / 1;
        border-radius: 24px;
        overflow: hidden;
        background: #000; /* Deep black for crop safety */
        border: 1px solid rgba(255,255,255,0.08);
        margin-bottom: 16px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .track-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.4); /* Deeper crop for better square look */
      filter: contrast(1.05) saturate(1.1); /* HD Premium Filter */
      image-rendering: -webkit-optimize-contrast;
      transition: transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
    }
    .hover-glow {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at center, rgba(168, 85, 247, 0.2) 0%, transparent 70%);
        opacity: 0;
        transition: opacity 0.4s;
    }
    .play-trigger {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        width: 60px;
        height: 60px;
        background: rgba(255,255,255,0.9);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: all 0.4s;
    }
    .play-trigger svg {
        width: 30px;
        height: 30px;
        fill: black;
        margin-left: 4px;
    }
    .art-card:hover .track-image { transform: scale(1.5); }
    .art-card:hover .hover-glow { opacity: 1; }
    .art-card:hover .play-trigger {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
    .card-info .name {
      font-weight: 800;
      font-size: 16px;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-info .creator {
      font-size: 13px;
      opacity: 0.4;
      font-weight: 600;
    }
    .discovery-loader {
      margin-top: 150px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 32px;
    }
    .pulse-ring {
        width: 60px;
        height: 60px;
        border: 2px solid #a855f7;
        border-radius: 50%;
        animation: pulse 2s infinite;
    }
    @keyframes pulse {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(2.5); opacity: 0; }
    }

    /* MOBILE OPTIMIZATION */
    @media (max-width: 768px) {
        .aurora-view { padding: 0 20px; }
        .vibe-header { margin-bottom: 32px; }
        .vibe-header h1 { font-size: 32px; letter-spacing: -1px; }
        .greeting { font-size: 11px; letter-spacing: 2px; }
        
        .aurora-stacks { gap: 40px; }
        .sound-row h2 { font-size: 20px; }
        .track-flow { gap: 16px; }
        
        .art-card { width: 140px; }
        .card-visual { border-radius: 20px; margin-bottom: 12px; }
        .card-info .name { font-size: 14px; }
        .card-info .creator { font-size: 11px; }
        
        .play-trigger { width: 44px; height: 44px; }
        .play-trigger svg { width: 22px; height: 22px; }
    }
  `]
})
export class HomeViewComponent implements OnInit {
  private store = inject(Store);
  private authService = inject(GoogleAuthService);
  
  musicData = this.store.selectSignal(selectCategorizedMusic);
  isLoading = this.store.selectSignal(selectHomeLoading);
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
          img.src = img.src.replace(currentRes, resolutions[nextIdx]);
      }
  }

  checkSharpness(event: any) {
      const img = event.target;
      // Recursive Sharpness Check: If width is 120, it's a blurry placeholder
      if (img.naturalWidth <= 120) {
          this.handleImgError(event);
      }
  }

  selectTrack(track: any) { this.store.dispatch(PlayerActions.setCurrentTrack({ track })); }
}
