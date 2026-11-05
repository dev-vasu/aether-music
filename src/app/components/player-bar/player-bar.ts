import { Component, inject, OnInit, signal, effect, OnDestroy, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  selectCurrentTrack,
  selectIsPlaying,
  selectRecommendedTracks,
  selectQueue,
  selectQueueIndex,
  selectIsShuffled,
  selectRepeatMode
} from '../../state/player/player.selectors';
import { PlayerActions } from '../../state/player/player.actions';
import { YoutubeService } from '../../services/youtube.service';
import { GoogleAuthService } from '../../services/google-auth.service';
import { LibraryService } from '../../services/library.service';
import { ToastService } from '../../services/toast.service';
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
          <input
            type="range"
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
        <!-- Track metadata and artwork -->
        <div class="track-section">
          <div class="art-frame" (click)="isExpanded.set(!isExpanded())" title="Click to view recommendations">
            <img *ngIf="track()"
                 [src]="track().album.images[0]?.url?.replace('sddefault.jpg', 'maxresdefault.jpg')"
                 class="album-art"
                 (error)="handleImgError($event)"
                 (load)="checkSharpness($event)">
            <div *ngIf="!track()" class="placeholder-art">
              <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
            
            <!-- Mini Equalizer Overlay on Art -->
            <div class="art-eq" *ngIf="isPlaying()">
              <span class="eq-col"></span>
              <span class="eq-col"></span>
              <span class="eq-col"></span>
            </div>
          </div>

          <div class="meta" (click)="isExpanded.set(!isExpanded())">
            <div class="song-title-row">
              <span class="song-name" [title]="track()?.name">{{ track()?.name || 'Aether Soundscape' }}</span>
              <!-- Audio waveform bars -->
              <div class="live-wave" *ngIf="isPlaying()" title="Live Soundscape">
                <span class="wave-bar w1"></span>
                <span class="wave-bar w2"></span>
                <span class="wave-bar w3"></span>
                <span class="wave-bar w4"></span>
              </div>
            </div>
            <div class="artist-name">{{ track()?.artists[0]?.name || 'Select a track to start' }}</div>
          </div>

          <!-- Quick Action Buttons: Favorite & Save -->
          <div class="quick-actions" *ngIf="track()">
            <!-- Direct Favorite Heart Button -->
            <button
              class="action-btn heart-btn"
              [class.favorited]="isFavorite()"
              (click)="toggleFavorite()"
              [title]="isFavorite() ? 'Remove from Favorites' : 'Add to Favorites'">
              <svg viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>

            <!-- Save to Playlist Dropdown -->
            <div class="save-wrap">
              <button class="action-btn" (click)="showPlaylists.set(!showPlaylists())" title="Save to Playlist">
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
        </div>

        <!-- Center Playback Controls -->
        <div class="controls-section">
          <!-- Shuffle -->
          <button
            class="control-btn mini-btn"
            [class.active-mode]="isShuffled()"
            (click)="toggleShuffle()"
            title="Shuffle">
            <svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
            <span class="active-dot" *ngIf="isShuffled()"></span>
          </button>

          <!-- Previous -->
          <button class="control-btn" (click)="prev()" title="Previous (Shift + Left)">
            <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
          </button>

          <!-- Morphing Play/Pause Shield -->
          <div class="play-trigger-wrap" (click)="togglePlay()" title="Play / Pause (Space)">
            <div class="play-shield" [class.active]="isPlaying()">
              <svg *ngIf="!isPlaying()" viewBox="0 0 24 24" class="play-icon"><path d="M8 5v14l11-7z"/></svg>
              <svg *ngIf="isPlaying()" viewBox="0 0 24 24" class="play-icon"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </div>
            <div class="play-glow"></div>
          </div>

          <!-- Next -->
          <button class="control-btn" (click)="next()" title="Next (Shift + Right)">
            <svg viewBox="0 0 24 24"><path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>

          <!-- Repeat -->
          <button
            class="control-btn mini-btn repeat-btn"
            [class.active-mode]="repeatMode() !== 'off'"
            (click)="cycleRepeat()"
            [title]="'Repeat: ' + repeatMode()">
            <svg *ngIf="repeatMode() !== 'one'" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
            <svg *ngIf="repeatMode() === 'one'" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.8v4H13z"/></svg>
            <span class="active-dot" *ngIf="repeatMode() !== 'off'"></span>
          </button>
        </div>

        <!-- Right Utility (Volume & Queue expand) -->
        <div class="utility-section">
          <!-- Volume Control -->
          <div class="vol-control">
            <button class="vol-btn" (click)="toggleMute()" title="Mute / Unmute (M)">
              <!-- Muted -->
              <svg *ngIf="volume() === 0 || isMuted()" viewBox="0 0 24 24" class="vol-icon"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
              <!-- Normal Volume -->
              <svg *ngIf="volume() > 0 && !isMuted()" viewBox="0 0 24 24" class="vol-icon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            </button>
            <input
              type="range"
              min="0"
              max="100"
              [value]="isMuted() ? 0 : volume()"
              class="vol-slider"
              (input)="onVolumeChange($event)">
          </div>

          <!-- Drawer Toggle -->
          <button
            class="action-btn drawer-btn"
            [class.open]="isExpanded()"
            (click)="isExpanded.set(!isExpanded())"
            title="Recommendations & Queue">
            <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </button>
        </div>
      </div>

      <!-- EXPANDED VIBE DRAWER -->
      <div class="expanded-discovery" *ngIf="isExpanded()">
        <div class="glow-line"></div>
        <div class="drawer-grid">
          <!-- Recommendations Section -->
          <div class="ml-feed">
            <div class="ml-header">
              <span class="badge">AI Recommended</span>
              <h3>Vibe Match Engine</h3>
            </div>
            <div class="recommendations-scroll">
              <div class="rec-item" *ngFor="let rec of recommendations()" (click)="playRec(rec)">
                <img [src]="rec.album.images[0]?.url?.replace('sddefault.jpg', 'maxresdefault.jpg')"
                     class="rec-art"
                     (error)="handleImgError($event)"
                     (load)="checkSharpness($event)">
                <div class="rec-meta">
                  <span class="rec-name">{{ rec.name }}</span>
                  <span class="rec-artist">{{ rec.artists[0]?.name }}</span>
                </div>
                <div class="rec-play-btn">
                  <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Current Queue Section -->
          <div class="ml-feed queue-feed" *ngIf="queue().length > 0">
            <div class="ml-header">
              <span class="badge queue-badge">Orbit Queue ({{ queue().length }})</span>
              <h3>Upcoming Echoes</h3>
            </div>
            <div class="recommendations-scroll">
              <div class="rec-item queue-item"
                   *ngFor="let qTrack of queue(); let i = index"
                   [class.current-playing]="i === queueIndex()"
                   (click)="playFromQueue(i)">
                <span class="q-index">{{ i + 1 }}</span>
                <img [src]="qTrack.album.images[0]?.url" class="rec-art" (error)="handleImgError($event)">
                <div class="rec-meta">
                  <span class="rec-name">{{ qTrack.name }}</span>
                  <span class="rec-artist">{{ qTrack.artists[0]?.name }}</span>
                </div>
                <span *ngIf="i === queueIndex()" class="now-playing-pill">Playing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .aurora-player {
      background: rgba(10, 10, 18, 0.95);
      backdrop-filter: blur(40px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 35px;
      padding: 16px 28px;
      color: white;
      transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .aurora-player.expanded { border-radius: 42px; padding-bottom: 32px; max-height: 580px; }

    /* VIBRANT PROGRESS BAR */
    .progress-container { display: flex; align-items: center; gap: 14px; padding: 0 6px; }
    .time-label { font-family: monospace; font-size: 11px; opacity: 0.5; width: 42px; font-weight: 700; text-align: center; }
    .progress-bar-wrap { flex: 1; height: 6px; display: flex; align-items: center; }
    
    .progress-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      background-image: linear-gradient(90deg, #6366f1, #a855f7);
      background-repeat: no-repeat;
      cursor: pointer;
      outline: none;
      transition: height 0.2s;
    }
    .progress-slider:hover { height: 6px; }
    .progress-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 12px;
      width: 12px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.9);
      cursor: pointer;
      transition: transform 0.2s;
    }
    .progress-slider::-webkit-slider-thumb:hover { transform: scale(1.3); }

    .player-content { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    .track-section { display: flex; align-items: center; gap: 16px; width: 34%; min-width: 0; }
    
    .art-frame {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: #000;
      position: relative;
      cursor: pointer;
      flex-shrink: 0;
    }
    .album-art { width: 100%; height: 100%; object-fit: cover; transform: scale(1.35); }
    .placeholder-art { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); }
    .placeholder-art svg { width: 24px; height: 24px; fill: rgba(255,255,255,0.4); }

    /* Art mini equalizer */
    .art-eq {
      position: absolute;
      bottom: 4px;
      right: 4px;
      display: flex;
      gap: 2px;
      align-items: flex-end;
      height: 12px;
      background: rgba(0,0,0,0.6);
      padding: 2px 4px;
      border-radius: 4px;
    }
    .eq-col {
      width: 2px;
      background: #a855f7;
      border-radius: 1px;
      animation: eqBounce 0.8s ease-in-out infinite alternate;
    }
    .eq-col:nth-child(1) { height: 60%; animation-delay: 0.1s; }
    .eq-col:nth-child(2) { height: 100%; animation-delay: 0.3s; }
    .eq-col:nth-child(3) { height: 40%; animation-delay: 0.2s; }

    .meta { display: flex; flex-direction: column; overflow: hidden; flex: 1; min-width: 0; cursor: pointer; }
    .song-title-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .song-name { font-weight: 800; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.3px; }
    .artist-name { font-size: 12px; opacity: 0.45; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Live audio waveform */
    .live-wave { display: flex; align-items: flex-end; gap: 2px; height: 12px; }
    .wave-bar { width: 2.5px; background: #a855f7; border-radius: 2px; animation: wavePulse 0.9s ease-in-out infinite alternate; }
    .w1 { height: 40%; animation-delay: 0.1s; }
    .w2 { height: 90%; animation-delay: 0.3s; }
    .w3 { height: 60%; animation-delay: 0.15s; }
    .w4 { height: 100%; animation-delay: 0.4s; }

    @keyframes wavePulse {
      0% { height: 20%; opacity: 0.5; }
      100% { height: 100%; opacity: 1; }
    }
    @keyframes eqBounce {
      0% { height: 30%; }
      100% { height: 100%; }
    }

    .quick-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .action-btn {
      background: none;
      border: none;
      color: white;
      opacity: 0.4;
      cursor: pointer;
      padding: 6px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .action-btn svg { width: 20px; height: 20px; fill: currentColor; }
    .action-btn:hover { opacity: 1; transform: scale(1.15); color: #a855f7; }

    .heart-btn.favorited { opacity: 1; color: #ec4899; }
    .heart-btn.favorited svg { fill: #ec4899; filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.6)); }

    .save-wrap { position: relative; }
    .playlist-dropdown {
      position: absolute;
      bottom: 44px;
      left: 0;
      background: rgba(15, 15, 25, 0.98);
      backdrop-filter: blur(35px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 100;
      min-width: 190px;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.8);
    }
    .pl-option {
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 12px;
      cursor: pointer;
      transition: 0.2s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .pl-option:hover { background: rgba(168, 85, 247, 0.2); color: white; }
    .pl-option.create-new { color: #a855f7; background: rgba(168, 85, 247, 0.1); margin-bottom: 4px; }
    .pl-option.create-new:hover { background: #a855f7; color: white; }
    .inline-icon { width: 16px; height: 16px; fill: currentColor; }
    .pl-divider { height: 1px; background: rgba(255, 255, 255, 0.08); margin: 4px 8px; }

    /* CENTER CONTROLS */
    .controls-section { display: flex; align-items: center; gap: 16px; justify-content: center; }
    .control-btn {
      background: none;
      border: none;
      color: white;
      opacity: 0.45;
      cursor: pointer;
      transition: all 0.25s;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 6px;
    }
    .control-btn svg { width: 22px; height: 22px; fill: currentColor; }
    .control-btn:hover { opacity: 1; transform: scale(1.15); color: #a855f7; }
    .control-btn.mini-btn svg { width: 18px; height: 18px; }
    
    .control-btn.active-mode { opacity: 1; color: #a855f7; }
    .active-dot {
      position: absolute;
      bottom: -2px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      background: #a855f7;
      border-radius: 50%;
      box-shadow: 0 0 6px #a855f7;
    }

    .play-trigger-wrap { position: relative; width: 54px; height: 54px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .play-shield {
      width: 100%;
      height: 100%;
      background: white;
      clip-path: polygon(20% 0%, 100% 0, 100% 80%, 80% 100%, 0 100%, 0% 20%);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .play-shield.active { background: #a855f7; clip-path: polygon(0 0, 80% 0, 100% 20%, 100% 100%, 20% 100%, 0 80%); box-shadow: 0 0 25px rgba(168, 85, 247, 0.6); }
    .play-icon { width: 24px; height: 24px; fill: black; transition: 0.3s; }
    .play-shield.active .play-icon { fill: white; }
    .play-glow { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #a855f7; filter: blur(20px); opacity: 0; transition: 0.4s; z-index: -1; }
    .play-trigger-wrap:hover .play-glow { opacity: 0.5; transform: scale(1.2); }

    /* UTILITY SECTION */
    .utility-section { width: 26%; display: flex; justify-content: flex-end; align-items: center; gap: 14px; }
    .vol-control { display: flex; align-items: center; gap: 10px; }
    .vol-btn { background: none; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; }
    .vol-icon { width: 18px; height: 18px; fill: white; opacity: 0.4; transition: opacity 0.2s; }
    .vol-btn:hover .vol-icon { opacity: 1; fill: #a855f7; }
    .vol-slider { width: 80px; accent-color: #a855f7; cursor: pointer; height: 4px; }
    .drawer-btn.open { color: #a855f7; opacity: 1; transform: rotate(90deg); }

    /* EXPANDED DRAWER */
    .expanded-discovery { margin-top: 24px; overflow: hidden; }
    .glow-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent); margin-bottom: 20px; }
    .drawer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .ml-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background: rgba(168,85,247,0.2); color: #c084fc; padding: 4px 10px; border-radius: 50px; }
    .badge.queue-badge { background: rgba(99,102,241,0.2); color: #818cf8; }
    .ml-header h3 { font-size: 15px; font-weight: 800; letter-spacing: -0.3px; }
    .recommendations-scroll { display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; padding-right: 8px; }
    .rec-item { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 14px; cursor: pointer; transition: 0.25s; background: rgba(255,255,255,0.02); }
    .rec-item:hover { background: rgba(168,85,247,0.12); transform: translateX(6px); }
    .rec-art { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; transform: scale(1.35); flex-shrink: 0; }
    .rec-meta { display: flex; flex-direction: column; overflow: hidden; flex: 1; }
    .rec-name { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rec-artist { font-size: 11px; opacity: 0.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rec-play-btn { opacity: 0; transition: opacity 0.2s; }
    .rec-play-btn svg { width: 18px; height: 18px; fill: #a855f7; }
    .rec-item:hover .rec-play-btn { opacity: 1; }
    
    .queue-item.current-playing { background: rgba(168,85,247,0.18); border: 1px solid rgba(168,85,247,0.4); }
    .q-index { font-family: monospace; font-size: 11px; opacity: 0.4; width: 16px; }
    .now-playing-pill { font-size: 9px; font-weight: 800; text-transform: uppercase; background: #a855f7; color: white; padding: 2px 6px; border-radius: 6px; }

    #yt-player-container { position: fixed; top: -1000px; left: -1000px; width: 320px; height: 180px; opacity: 0.01; pointer-events: none; z-index: -100; }

    @media (max-width: 768px) {
      .aurora-player { padding: 12px 16px; border-radius: 25px; }
      .track-section { width: 55%; }
      .utility-section { display: none; }
      .controls-section { gap: 10px; }
      .control-btn.mini-btn { display: none; }
      .play-trigger-wrap { width: 44px; height: 44px; }
      .play-icon { width: 20px; height: 20px; }
      .art-frame { width: 42px; height: 42px; }
      .song-name { font-size: 13px; }
      .artist-name { font-size: 10px; }
      .quick-actions { display: none; }
      .drawer-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class PlayerBarComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private ytService = inject(YoutubeService);
  private authService = inject(GoogleAuthService);
  private libraryService = inject(LibraryService);
  private toast = inject(ToastService);

  track = this.store.selectSignal(selectCurrentTrack);
  isPlaying = this.store.selectSignal(selectIsPlaying);
  recommendations = this.store.selectSignal(selectRecommendedTracks);
  queue = this.store.selectSignal(selectQueue);
  queueIndex = this.store.selectSignal(selectQueueIndex);
  isShuffled = this.store.selectSignal(selectIsShuffled);
  repeatMode = this.store.selectSignal(selectRepeatMode);
  playlists = this.libraryService.playlists;

  isExpanded = signal(false);
  showPlaylists = signal(false);
  volume = signal(50);
  isMuted = signal(false);
  private prevVolume = 50;
  currentTime = signal(0);
  duration = signal(0);

  isFavorite = computed(() => {
    const t = this.track();
    if (!t) return false;
    const favs = this.playlists().find(p => p.id === 'favorites');
    return !!favs?.tracks.some(item => item.id === t.id);
  });

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
        if (!this.authService.getToken() && this.authService.anonymousPlayCount() >= 2 && !this.authService.gateDismissed()) {
          this.toast.show('Trial Echoes: Sign in to enjoy limitless cosmic music!', 'warning');
        }
        this.lastPlayedId = t.id;
        this.ytService.playVideo(t.id);
        if (this.authService.getToken()) {
          this.authService.incrementTrackCount();
        } else {
          this.authService.anonymousPlayCount.update(c => c + 1);
        }
        setTimeout(() => this.ytService.setVolume(this.volume()), 1500);
      }
    });

    effect(() => {
      if (this.isPlaying()) {
        this.ytService.resume();
        this.startTimer();
      } else {
        this.ytService.pause();
        this.stopTimer();
      }
    });
  }

  ngOnInit() {
    const interval = setInterval(() => {
      if (this.ytService.isPlayerReady()) {
        this.ytService.initPlayer('yt-player', '', (state) => {
          if (state === 1) this.store.dispatch(PlayerActions.play());
          if (state === 2) this.store.dispatch(PlayerActions.pause());
          if (state === 0) {
            if (this.repeatMode() === 'one') {
              this.ytService.seekTo(0);
              this.ytService.resume();
            } else {
              this.next();
            }
          }
        });
        clearInterval(interval);
      }
    }, 500);
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  private startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.currentTime.set(this.ytService.getCurrentTime());
      this.duration.set(this.ytService.getDuration());
    }, 500);
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
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

  formatTime(seconds: number): string {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  onSeek(event: any) {
    const val = parseInt(event.target.value, 10);
    this.currentTime.set(val);
    this.ytService.seekTo(val);
  }

  togglePlay() {
    if (this.isPlaying()) {
      this.store.dispatch(PlayerActions.pause());
    } else if (this.track()) {
      this.store.dispatch(PlayerActions.play());
    }
  }

  onVolumeChange(event: any) {
    const vol = parseInt(event.target.value, 10);
    this.volume.set(vol);
    this.isMuted.set(vol === 0);
    this.ytService.setVolume(vol);
  }

  toggleMute() {
    if (this.isMuted() || this.volume() === 0) {
      const restore = this.prevVolume > 0 ? this.prevVolume : 50;
      this.volume.set(restore);
      this.isMuted.set(false);
      this.ytService.unMute();
      this.ytService.setVolume(restore);
      this.toast.show(`Volume: ${restore}%`, 'info');
    } else {
      this.prevVolume = this.volume();
      this.volume.set(0);
      this.isMuted.set(true);
      this.ytService.setVolume(0);
      this.toast.show('Muted 🔇', 'info');
    }
  }

  toggleShuffle() {
    this.store.dispatch(PlayerActions.toggleShuffle());
    const nextState = !this.isShuffled();
    this.toast.show(nextState ? 'Shuffle Orbit Active 🔀' : 'Standard Playback ➡️', 'info');
  }

  cycleRepeat() {
    this.store.dispatch(PlayerActions.cycleRepeat());
    const current = this.repeatMode();
    const mapMsg: Record<string, string> = {
      'off': 'Repeat All Enabled 🔁',
      'all': 'Repeat One Active 🔂',
      'one': 'Repeat Disabled ➡️'
    };
    this.toast.show(mapMsg[current] || 'Repeat Mode Updated', 'info');
  }

  toggleFavorite() {
    const t = this.track();
    if (!t) return;
    if (this.isFavorite()) {
      this.libraryService.removeTrackFromPlaylist('favorites', t.id);
      this.toast.show('Removed from Favorites', 'info');
    } else {
      this.libraryService.addTrackToPlaylist('favorites', t);
      this.toast.show('Added to Favorites ❤️', 'success');
    }
  }

  playRec(track: any) {
    this.store.dispatch(PlayerActions.setCurrentTrack({ track }));
    this.store.dispatch(PlayerActions.play());
    this.toast.show(`Playing: ${track.name}`, 'info');
  }

  playFromQueue(index: number) {
    const track = this.queue()[index];
    if (track) {
      this.store.dispatch(PlayerActions.setCurrentTrack({ track }));
      this.store.dispatch(PlayerActions.play());
    }
  }

  next() {
    this.store.dispatch(PlayerActions.next());
  }

  prev() {
    this.store.dispatch(PlayerActions.previous());
  }

  addToPlaylist(playlistId: string) {
    const t = this.track();
    if (t) {
      this.libraryService.addTrackToPlaylist(playlistId, t);
      this.showPlaylists.set(false);
      const pl = this.playlists().find(p => p.id === playlistId);
      this.toast.show(`Added to ${pl?.name || 'Playlist'}`, 'success');
    }
  }

  createNewFromPlayer() {
    const name = prompt('Enter name for new cosmic playlist:');
    if (name) {
      this.libraryService.createPlaylist(name);
      setTimeout(() => {
        const pls = this.playlists();
        const newPl = pls[pls.length - 1];
        if (newPl) {
          this.addToPlaylist(newPl.id);
        }
      }, 100);
    }
  }
}
