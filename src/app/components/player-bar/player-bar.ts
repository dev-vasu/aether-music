import { Component, inject, OnInit, signal, effect, OnDestroy, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectCurrentTrack, selectIsPlaying, selectRecommendedTracks } from '../../state/player/player.selectors';
import { PlayerActions } from '../../state/player/player.actions';
import { YoutubeService } from '../../services/youtube.service';
import { GoogleAuthService } from '../../services/google-auth.service';
import { LibraryService } from '../../services/library.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="aurora-player" [class.expanded]="isExpanded()">
      <div id="yt-player-container"><div id="yt-player"></div></div>

      <!-- PROGRESS BAR -->
      <div class="progress-container">
          <span class="time-label">{{ formatTime(currentTime()) }}</span>
          <div class="progress-bar-wrap">
              <input type="range" 
                     [min]="0" 
                     [max]="duration()" 
                     [value]="currentTime()" 
                     (input)="onSeek($event)"
                     class="progress-slider"
                     [style.background-size]="getProgressPercent() + '% 100%'">
          </div>
          <span class="time-label">{{ formatTime(duration()) }}</span>
      </div>

      <div class="player-content">
        <div class="track-section">
          <div class="art-frame" (click)="isExpanded.set(!isExpanded())">
            <img *ngIf="track()" 
                 [src]="track().album.images[0].url.replace('sddefault.jpg', 'maxresdefault.jpg')" 
                 class="album-art"
                 (error)="handleImgError($event)"
                 (load)="checkSharpness($event)">
            <div *ngIf="!track()" class="placeholder-art"></div>
          </div>
          <div class="meta" (click)="isExpanded.set(!isExpanded())">
            <div class="song-name">{{ track()?.name || 'Waiting for Music...' }}</div>
            <div class="artist-name">{{ track()?.artists[0]?.name || 'Select a track' }}</div>
          </div>
          
          <div class="save-wrap" *ngIf="track()">
              <button class="aether-btn side save-btn" (click)="showPlaylists.set(!showPlaylists())" title="Save to Playlist">
                  <svg viewBox="0 0 24 24"><path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/></svg>
              </button>
              
              <div class="playlist-dropdown" *ngIf="showPlaylists()">
                  <div class="pl-option create-new" (click)="createNewFromPlayer()">
                      <svg viewBox="0 0 24 24" class="inline-icon"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                      New Playlist
                  </div>
                  <div class="pl-divider"></div>
                  <div class="pl-option" *ngFor="let pl of playlists()" (click)="addToPlaylist(pl.id)">
                      {{ pl.name }}
                  </div>
              </div>
          </div>
        </div>

        <div class="controls-section">
          <button class="aether-btn side" (click)="prev()">
            <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
          </button>
          
          <div class="play-trigger-wrap" (click)="togglePlay()">
              <div class="play-shield" [class.active]="isPlaying()">
                  <svg *ngIf="!isPlaying()" viewBox="0 0 24 24" class="play-icon"><path d="M8 5v14l11-7z"/></svg>
                  <svg *ngIf="isPlaying()" viewBox="0 0 24 24" class="play-icon"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              </div>
              <div class="play-glow"></div>
          </div>

          <button class="aether-btn side" (click)="next()">
            <svg viewBox="0 0 24 24"><path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>

        <div class="utility-section">
          <div class="vol-control">
            <svg class="vol-icon" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            <input type="range" min="0" max="100" [value]="volume()" class="vol-slider" (input)="onVolumeChange($event)">
          </div>
        </div>
      </div>

      <div class="expanded-discovery" *ngIf="isExpanded()">
          <div class="glow-line"></div>
          <div class="ml-feed">
              <div class="ml-header">
                <span class="badge">AI Recommended</span>
                <h3>Vibe Match Engine</h3>
              </div>
              <div class="recommendations-scroll">
                  <div class="rec-item" *ngFor="let rec of recommendations()" (click)="playRec(rec)">
                      <img [src]="rec.album.images[0].url.replace('sddefault.jpg', 'maxresdefault.jpg')" 
                           class="rec-art"
                           (error)="handleImgError($event)"
                           (load)="checkSharpness($event)">
                      <div class="rec-meta">
                          <span class="rec-name">{{ rec.name }}</span>
                          <span class="rec-artist">{{ rec.artists[0].name }}</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  `,
  styles: [`
    .aurora-player {
      background: rgba(10, 10, 15, 0.95);
      backdrop-filter: blur(40px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 35px;
      padding: 16px 28px;
      color: white;
      transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .aurora-player.expanded { border-radius: 48px; padding-bottom: 40px; max-height: 550px; }

    /* VIBRANT PROGRESS BAR */
    .progress-container { display: flex; align-items: center; gap: 14px; padding: 0 10px; margin-bottom: 4px; }
    .time-label { font-family: 'Space Mono', monospace; font-size: 10px; opacity: 0.5; width: 40px; font-weight: 700; text-align: center; }
    .progress-bar-wrap { flex: 1; height: 6px; display: flex; align-items: center; }
    
    .progress-slider {
        -webkit-appearance: none;
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        background-image: linear-gradient(#a855f7, #a855f7);
        background-repeat: no-repeat;
        cursor: pointer;
        outline: none;
    }
    .progress-slider::-webkit-slider-thumb { -webkit-appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #fff; box-shadow: 0 0 10px rgba(168, 85, 247, 0.8); cursor: pointer; }
    .progress-slider::-moz-range-thumb { height: 12px; width: 12px; border-radius: 50%; background: #fff; border: none; box-shadow: 0 0 10px rgba(168, 85, 247, 0.8); cursor: pointer; }

    .player-content { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .track-section { display: flex; align-items: center; gap: 18px; width: 35%; cursor: pointer; position: relative; }
    .art-frame { 
        width: 54px; 
        height: 54px; 
        aspect-ratio: 1 / 1;
        border-radius: 12px; 
        overflow: hidden; 
        border: 1px solid rgba(255,255,255,0.1); 
    }
    .album-art { width: 100%; height: 100%; object-fit: cover; transform: scale(1.35); }
    .meta { display: flex; flex-direction: column; overflow: hidden; flex: 1; }
    .song-name { font-weight: 800; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.3px; }
    .artist-name { font-size: 12px; opacity: 0.4; font-weight: 600; }
    
    .save-wrap { position: relative; display: flex; align-items: center; }
    .save-btn { opacity: 0.2; transition: 0.2s; }
    .save-btn:hover { opacity: 1; }
    .playlist-dropdown { position: absolute; bottom: 40px; left: 0; background: rgba(10,10,15,0.98); backdrop-filter: blur(30px); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: 10px; display: flex; flex-direction: column; gap: 4px; z-index: 100; min-width: 180px; box-shadow: 0 15px 40px rgba(0,0,0,0.8); }
    .pl-option { padding: 10px 16px; font-size: 13px; font-weight: 700; border-radius: 12px; cursor: pointer; transition: 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 10px; }
    .pl-option:hover { background: rgba(168,85,247,0.2); color: white; }
    .pl-option.create-new { color: #a855f7; background: rgba(168,85,247,0.1); margin-bottom: 4px; }
    .pl-option.create-new:hover { background: #a855f7; color: white; }
    .inline-icon { width: 16px; height: 16px; fill: currentColor; }
    .pl-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 4px 8px; }

    .controls-section { display: flex; align-items: center; gap: 20px; }
    .aether-btn { background: none; border: none; color: white; opacity: 0.4; cursor: pointer; transition: 0.3s; }
    .aether-btn.side svg { width: 24px; height: 24px; fill: currentColor; }
    .aether-btn:hover { opacity: 1; transform: scale(1.1); color: #a855f7; }

    .play-trigger-wrap { position: relative; width: 56px; height: 56px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .play-shield { width: 100%; height: 100%; background: white; clip-path: polygon(20% 0%, 100% 0, 100% 80%, 80% 100%, 0 100%, 0% 20%); display: flex; align-items: center; justify-content: center; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .play-shield.active { background: #a855f7; clip-path: polygon(0 0, 80% 0, 100% 20%, 100% 100%, 20% 100%, 0 80%); }
    .play-icon { width: 26px; height: 26px; fill: black; transition: 0.3s; }
    .play-shield.active .play-icon { fill: white; }
    .play-glow { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #a855f7; filter: blur(20px); opacity: 0; transition: 0.4s; z-index: -1; }
    .play-trigger-wrap:hover .play-glow { opacity: 0.4; transform: scale(1.2); }

    .utility-section { width: 25%; display: flex; justify-content: flex-end; }
    .vol-control { display: flex; align-items: center; gap: 12px; }
    .vol-icon { width: 16px; height: 16px; fill: white; opacity: 0.2; }
    .vol-slider { width: 70px; accent-color: #a855f7; cursor: pointer; height: 4px; }

    .expanded-discovery { margin-top: 32px; overflow: hidden; }
    .glow-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(168,85,247,0.4), transparent); margin-bottom: 24px; }
    .recommendations-scroll { display: flex; flex-direction: column; gap: 12px; max-height: 280px; overflow-y: auto; padding-right: 10px; }
    .rec-item { display: flex; align-items: center; gap: 16px; padding: 10px; border-radius: 16px; cursor: pointer; transition: 0.3s; background: rgba(255,255,255,0.02); }
    .rec-item:hover { background: rgba(168,85,247,0.1); transform: translateX(8px); }
    .rec-art { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; transform: scale(1.35); }
    .rec-name { font-size: 14px; font-weight: 700; }
    .rec-artist { font-size: 12px; opacity: 0.3; }

    #yt-player-container { position: fixed; top: -1000px; left: -1000px; width: 320px; height: 180px; opacity: 0.01; pointer-events: none; z-index: -100; }

    /* MOBILE PLAYER FIXES */
    @media (max-width: 768px) {
        .aurora-player { padding: 12px 16px; border-radius: 25px; }
        .track-section { width: 60%; }
        .utility-section { display: none; }
        .controls-section { gap: 12px; }
        .play-trigger-wrap { width: 44px; height: 44px; }
        .play-icon { width: 20px; height: 20px; }
        .art-frame { width: 40px; height: 40px; }
        .song-name { font-size: 13px; }
        .artist-name { font-size: 10px; }
        .save-wrap { display: none; }
    }
  `]
})
export class PlayerBarComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private ytService = inject(YoutubeService);
  private authService = inject(GoogleAuthService);
  private libraryService = inject(LibraryService);
  
  track = this.store.selectSignal(selectCurrentTrack);
  isPlaying = this.store.selectSignal(selectIsPlaying);
  recommendations = this.store.selectSignal(selectRecommendedTracks);
  playlists = this.libraryService.playlists;
  
  isExpanded = signal(false);
  showPlaylists = signal(false);
  volume = signal(50);
  currentTime = signal(0);
  duration = signal(0);

  getProgressPercent = computed(() => {
      const d = this.duration();
      const c = this.currentTime();
      if (!d) return 0;
      return (c / d) * 100;
  });

  private lastPlayedId: string | null = null;
  private timer: any;

  constructor() {
    effect(() => {
      const t = this.track();
      if (t && t.id !== this.lastPlayedId) {
        if (!this.authService.getToken() && this.authService.anonymousPlayCount() >= 1) {
            alert('Aether Gatekeeper: Your 1-song trial has ended. Please sign in with Google!');
            this.authService.login();
            return;
        }
        this.lastPlayedId = t.id;
        this.ytService.playVideo(t.id);
        if (this.authService.getToken()) this.authService.incrementTrackCount();
        else this.authService.anonymousPlayCount.update(c => c + 1);
        setTimeout(() => this.ytService.setVolume(this.volume()), 1500);
      }
    });
    effect(() => {
      if (this.isPlaying()) { this.ytService.resume(); this.startTimer(); }
      else { this.ytService.pause(); this.stopTimer(); }
    });
  }

  ngOnInit() {
    const interval = setInterval(() => {
        if (this.ytService.isPlayerReady()) {
            this.ytService.initPlayer('yt-player', '', (state) => {
                if (state === 1) this.store.dispatch(PlayerActions.play());
                if (state === 2) this.store.dispatch(PlayerActions.pause());
                if (state === 0) this.next();
            });
            clearInterval(interval);
        }
    }, 500);
  }

  ngOnDestroy() { this.stopTimer(); }
  private startTimer() { this.stopTimer(); this.timer = setInterval(() => { this.currentTime.set(this.ytService.getCurrentTime()); this.duration.set(this.ytService.getDuration()); }, 500); }
  private stopTimer() { if (this.timer) clearInterval(this.timer); }
  
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

  formatTime(seconds: number): string { if (!seconds) return '0:00'; const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${mins}:${secs.toString().padStart(2, '0')}`; }
  onSeek(event: any) { const val = parseInt(event.target.value, 10); this.currentTime.set(val); this.ytService.seekTo(val); }
  togglePlay() { if (this.isPlaying()) this.store.dispatch(PlayerActions.pause()); else if (this.track()) this.store.dispatch(PlayerActions.play()); }
  onVolumeChange(event: any) { const vol = parseInt(event.target.value, 10); this.volume.set(vol); this.ytService.setVolume(vol); }
  playRec(track: any) { this.store.dispatch(PlayerActions.setCurrentTrack({ track })); this.store.dispatch(PlayerActions.play()); }
  next() { this.store.dispatch(PlayerActions.next()); }
  prev() { this.store.dispatch(PlayerActions.previous()); }

  addToPlaylist(playlistId: string) {
      const t = this.track();
      if (t) {
          this.libraryService.addTrackToPlaylist(playlistId, t);
          this.showPlaylists.set(false);
      }
  }

  createNewFromPlayer() {
      const name = prompt('Enter name for new cosmic playlist:');
      if (name) {
          this.libraryService.createPlaylist(name);
          setTimeout(() => {
              const pls = this.playlists();
              const newPl = pls[pls.length - 1];
              this.addToPlaylist(newPl.id);
          }, 100);
      }
  }
}
