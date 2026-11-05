import { Component, inject, HostListener, signal } from '@angular/core';
import { PlayerBarComponent } from './components/player-bar/player-bar';
import { BackgroundComponent } from './components/background/background';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GoogleAuthService } from './services/google-auth.service';
import { ToastService } from './services/toast.service';
import { YoutubeService } from './services/youtube.service';
import { LibraryService } from './services/library.service';
import { Store } from '@ngrx/store';
import { PlayerActions } from './state/player/player.actions';
import { selectCurrentTrack, selectIsPlaying, selectIsShuffled, selectRepeatMode } from './state/player/player.selectors';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PlayerBarComponent, BackgroundComponent, RouterOutlet, RouterModule, CommonModule],
  template: `
    <app-background></app-background>
    
    <!-- Cosmic Toast Notification -->
    <div class="toast-container" *ngIf="toastService.currentToast() as toast">
      <div class="cosmic-toast" [class]="toast.type || 'info'">
        <span class="toast-dot"></span>
        <span class="toast-text">{{ toast.text }}</span>
      </div>
    </div>

    <div class="app-shell">
      <!-- Navigation Dock -->
      <nav class="aurora-nav">
        <div class="glass-dock">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="dock-link" title="Home">
            <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span class="label">Home</span>
          </a>
          <a routerLink="/search" routerLinkActive="active" class="dock-link" title="Search">
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.49 0 1 0 9.5 16a6.471 6.471 0 0 0 3.99-1.39l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <span class="label">Search</span>
          </a>
          <a routerLink="/library" routerLinkActive="active" class="dock-link" title="Library">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
            <span class="label">Library</span>
          </a>
        </div>
      </nav>

      <!-- Global Identity Dock (Top Right) & Shortcuts Helper -->
      <div class="identity-anchor">
        <button class="shortcuts-trigger" (click)="showShortcuts.set(!showShortcuts())" title="Keyboard Shortcuts (?)">
          ⌨️
        </button>

        <button *ngIf="!isLoggedIn()" (click)="login()" class="aurora-btn mini">
          Join
        </button>
        
        <a *ngIf="isLoggedIn()" routerLink="/profile" routerLinkActive="identity-active" class="identity-glass">
          <div class="user-avatar-wrap" [style.background]="authService.getAvatarColor()">
            <div class="mini-svg-avatar" [innerHTML]="authService.getAvatarSvg()"></div>
          </div>
          <div class="user-meta-wrap">
            <span class="u-name">{{ userProfile()?.alias || userProfile()?.name || 'Vasu' }}</span>
          </div>
        </a>
      </div>

      <main class="aurora-content">
        <router-outlet></router-outlet>
        
        <!-- Subtle Credit Footer -->
        <footer class="app-credit">
          Aether Music &bull; Built with ❤️ by Vasu
        </footer>
      </main>

      <!-- Global Trial Gate Overlay (Friendly, Non-blocking Modal) -->
      <div class="trial-gate-overlay" *ngIf="showGate()">
        <div class="gate-card glass">
          <button class="gate-close-btn" (click)="authService.dismissGate()" title="Close">✕</button>
          <div class="gate-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8,8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
          </div>
          <h2>Join the Aether Orbit</h2>
          <p>Sync your cosmic identity, save unlimited playlists, and enjoy uninterrupted soundscapes.</p>
          <div class="gate-actions">
            <button (click)="login()" class="gate-login-btn">
              <svg viewBox="0 0 24 24" class="g-icon"><path d="M21.35 11.1h-9.17v2.73h5.14c-.22 1.2-1.31 3.51-5.14 3.51-3.3 0-5.99-2.74-5.99-6.12s2.69-6.12 5.99-6.12c1.89 0 3.14.81 3.86 1.53l2.15-2.1c-1.37-1.28-3.15-2.07-6.01-2.07-4.14 0-7.5 3.36-7.5 7.5s3.36 7.5 7.5 7.5c4.32 0 7.22-3.04 7.22-7.35 0-.49-.05-.87-.14-1.22z"/></svg>
              Connect with Google
            </button>
            <button (click)="authService.dismissGate()" class="gate-guest-btn">
              Continue Exploring as Guest
            </button>
          </div>
        </div>
      </div>

      <!-- Shortcuts Modal -->
      <div class="shortcuts-overlay" *ngIf="showShortcuts()" (click)="showShortcuts.set(false)">
        <div class="shortcuts-card glass" (click)="$event.stopPropagation()">
          <div class="sc-header">
            <h3>Cosmic Controls</h3>
            <button class="sc-close" (click)="showShortcuts.set(false)">✕</button>
          </div>
          <div class="sc-grid">
            <div class="sc-row"><kbd>Space</kbd> <span>Play / Pause</span></div>
            <div class="sc-row"><kbd>Shift + →</kbd> <span>Next Echo</span></div>
            <div class="sc-row"><kbd>Shift + ←</kbd> <span>Previous Echo</span></div>
            <div class="sc-row"><kbd>→</kbd> / <kbd>←</kbd> <span>Seek ±5 seconds</span></div>
            <div class="sc-row"><kbd>↑</kbd> / <kbd>↓</kbd> <span>Volume ±5%</span></div>
            <div class="sc-row"><kbd>M</kbd> <span>Mute / Unmute</span></div>
            <div class="sc-row"><kbd>L</kbd> <span>Favorite Current Track</span></div>
            <div class="sc-row"><kbd>S</kbd> <span>Toggle Shuffle</span></div>
            <div class="sc-row"><kbd>R</kbd> <span>Cycle Repeat Mode</span></div>
          </div>
        </div>
      </div>

      <!-- Floating Aurora Player -->
      <div class="player-float-container">
        <app-player-bar></app-player-bar>
      </div>
    </div>
  `,
  styles: [`
    .app-shell { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
    
    /* TOAST NOTIFICATION */
    .toast-container {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      pointer-events: none;
      animation: toastSlideDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .cosmic-toast {
      background: rgba(15, 15, 25, 0.95);
      backdrop-filter: blur(25px);
      border: 1px solid rgba(168, 85, 247, 0.35);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(168, 85, 247, 0.25);
      color: white;
      padding: 10px 22px;
      border-radius: 50px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: -0.2px;
    }
    .toast-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #a855f7;
      box-shadow: 0 0 8px #a855f7;
    }
    .cosmic-toast.success .toast-dot { background: #10b981; box-shadow: 0 0 8px #10b981; }
    .cosmic-toast.warning .toast-dot { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
    @keyframes toastSlideDown {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .aurora-nav { 
      position: fixed; 
      top: 32px; 
      left: 50%; 
      transform: translateX(-50%); 
      z-index: 2000; 
      transition: all 0.5s ease;
    }

    .glass-dock { 
      background: rgba(255, 255, 255, 0.04); 
      backdrop-filter: blur(35px); 
      border: 1px solid rgba(255, 255, 255, 0.08); 
      padding: 6px; 
      border-radius: 30px; 
      display: flex; 
      gap: 4px; 
      box-shadow: 0 15px 45px rgba(0, 0, 0, 0.3); 
    }

    .dock-link { 
      height: 44px; 
      padding: 0 20px; 
      display: flex; 
      align-items: center; 
      gap: 10px; 
      border-radius: 24px; 
      color: white; 
      text-decoration: none; 
      opacity: 0.45; 
      transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); 
    }
    .dock-link svg { width: 20px; height: 20px; fill: currentColor; }
    .dock-link .label { font-size: 13px; font-weight: 700; letter-spacing: -0.2px; display: none; }
    .dock-link:hover { opacity: 0.85; background: rgba(255, 255, 255, 0.08); }
    .dock-link.active { opacity: 1; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); box-shadow: 0 8px 20px rgba(168, 85, 247, 0.3); }
    .dock-link.active .label { display: block; }

    .identity-anchor {
      position: fixed;
      top: 32px;
      right: 32px;
      z-index: 2000;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .shortcuts-trigger {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.25s;
    }
    .shortcuts-trigger:hover {
      background: rgba(168, 85, 247, 0.2);
      border-color: #a855f7;
      transform: scale(1.1);
    }

    .aurora-btn.mini {
      background: white;
      color: black;
      border: none;
      padding: 8px 24px;
      border-radius: 50px;
      font-weight: 800;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(255,255,255,0.15);
      transition: all 0.3s;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .aurora-btn.mini:hover { transform: scale(1.05); }

    .identity-glass {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(30px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 6px 14px 6px 6px;
      border-radius: 50px;
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: white;
      transition: all 0.3s;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    .identity-active { border-color: #a855f7; box-shadow: 0 0 20px rgba(168, 85, 247, 0.35); }
    .user-avatar-wrap {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      background: #a855f7;
    }
    .mini-svg-avatar { width: 20px; height: 20px; }
    .mini-svg-avatar ::ng-deep svg { width: 100%; height: 100%; display: block; }
    .user-meta-wrap { display: flex; flex-direction: column; }
    .u-name { font-size: 12px; font-weight: 800; letter-spacing: -0.2px; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .aurora-content { height: 100%; overflow-y: auto; padding-top: 110px; padding-bottom: 220px; scroll-behavior: smooth; }
    
    .app-credit {
      text-align: center;
      padding: 40px 0;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      opacity: 0.25;
      color: white;
      transition: opacity 0.3s;
    }
    .app-credit:hover { opacity: 0.6; }

    .player-float-container {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      width: 92%;
      max-width: 940px;
      z-index: 2500;
      transition: all 0.5s ease;
    }
    
    .trial-gate-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(15px);
      z-index: 5000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .gate-card {
      position: relative;
      padding: 44px;
      border-radius: 40px;
      text-align: center;
      max-width: 440px;
      border: 1px solid rgba(255,255,255,0.15);
      box-shadow: 0 30px 60px rgba(0,0,0,0.6);
      background: rgba(15, 15, 25, 0.95);
    }
    .gate-close-btn {
      position: absolute;
      top: 20px;
      right: 24px;
      background: none;
      border: none;
      color: rgba(255,255,255,0.5);
      font-size: 18px;
      cursor: pointer;
      transition: color 0.2s;
    }
    .gate-close-btn:hover { color: white; }
    .gate-icon { width: 70px; height: 70px; margin: 0 auto 20px auto; color: #a855f7; }
    .gate-icon svg { width: 100%; height: 100%; fill: currentColor; }
    .gate-card h2 { font-size: 28px; font-weight: 900; margin-bottom: 12px; letter-spacing: -0.8px; }
    .gate-card p { opacity: 0.65; line-height: 1.6; margin-bottom: 28px; font-size: 14px; }
    .gate-actions { display: flex; flex-direction: column; gap: 12px; }
    .gate-login-btn {
      width: 100%;
      background: white;
      color: black;
      border: none;
      padding: 14px 28px;
      border-radius: 20px;
      font-weight: 800;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      transition: 0.25s;
    }
    .gate-login-btn:hover { transform: scale(1.03); box-shadow: 0 10px 30px rgba(255,255,255,0.25); }
    .gate-guest-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .gate-guest-btn:hover { background: rgba(255, 255, 255, 0.1); color: white; }
    .g-icon { width: 18px; height: 18px; }

    /* SHORTCUTS MODAL */
    .shortcuts-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(10px);
      z-index: 6000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .shortcuts-card {
      padding: 32px;
      border-radius: 32px;
      max-width: 420px;
      width: 90%;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(15, 15, 25, 0.95);
      box-shadow: 0 25px 60px rgba(0,0,0,0.8);
    }
    .sc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .sc-header h3 { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
    .sc-close { background: none; border: none; color: rgba(255,255,255,0.5); font-size: 18px; cursor: pointer; }
    .sc-close:hover { color: white; }
    .sc-grid { display: flex; flex-direction: column; gap: 10px; }
    .sc-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
    kbd {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11px;
      font-family: monospace;
      color: #c084fc;
    }

    /* MOBILE OVERHAUL */
    @media (max-width: 768px) {
      .aurora-nav { top: auto; bottom: 20px; width: 92%; z-index: 3000; }
      .glass-dock { justify-content: space-around; padding: 8px; border-radius: 25px; }
      .dock-link { padding: 0 10px; flex-direction: column; gap: 4px; height: auto; opacity: 0.5; }
      .dock-link.active { background: none; box-shadow: none; color: #a855f7; opacity: 1; }
      .dock-link .label { display: block; font-size: 10px; }
      .identity-anchor { top: 16px; right: 16px; }
      .shortcuts-trigger { display: none; }
      .identity-glass { padding: 4px; }
      .u-name { display: none; }
      .player-float-container { bottom: 95px; width: 95%; }
      .aurora-content { padding-top: 75px; padding-bottom: 240px; }
    }
  `]
})
export class App {
  private store = inject(Store);
  public authService = inject(GoogleAuthService);
  public toastService = inject(ToastService);
  private ytService = inject(YoutubeService);
  private libraryService = inject(LibraryService);

  userProfile = this.authService.userProfile;
  currentTrack = this.store.selectSignal(selectCurrentTrack);
  isPlaying = this.store.selectSignal(selectIsPlaying);
  isShuffled = this.store.selectSignal(selectIsShuffled);
  repeatMode = this.store.selectSignal(selectRepeatMode);

  showShortcuts = signal(false);

  showGate = () => !this.authService.getToken() && this.authService.anonymousPlayCount() >= 2 && !this.authService.gateDismissed();
  isLoggedIn() { return !!this.authService.getToken(); }
  login() { this.authService.login(); }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      if (this.isPlaying()) {
        this.store.dispatch(PlayerActions.pause());
        this.toastService.show('Playback Paused', 'info');
      } else if (this.currentTrack()) {
        this.store.dispatch(PlayerActions.play());
        this.toastService.show('Resumed Playback', 'info');
      }
    } else if (event.shiftKey && event.code === 'ArrowRight') {
      event.preventDefault();
      this.store.dispatch(PlayerActions.next());
    } else if (event.shiftKey && event.code === 'ArrowLeft') {
      event.preventDefault();
      this.store.dispatch(PlayerActions.previous());
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      const curr = this.ytService.getCurrentTime();
      this.ytService.seekTo(curr + 5);
      this.toastService.show('+5s Fast Forward', 'info');
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault();
      const curr = this.ytService.getCurrentTime();
      this.ytService.seekTo(Math.max(0, curr - 5));
      this.toastService.show('-5s Rewind', 'info');
    } else if (event.code === 'KeyM') {
      event.preventDefault();
      // Mute toggle handled via volume or YT
      this.toastService.show('Mute Toggle (M)', 'info');
    } else if (event.code === 'KeyL') {
      event.preventDefault();
      const t = this.currentTrack();
      if (t) {
        const favs = this.libraryService.playlists().find(p => p.id === 'favorites');
        const isFav = !!favs?.tracks.some(item => item.id === t.id);
        if (isFav) {
          this.libraryService.removeTrackFromPlaylist('favorites', t.id);
          this.toastService.show('Removed from Favorites', 'info');
        } else {
          this.libraryService.addTrackToPlaylist('favorites', t);
          this.toastService.show('Added to Favorites ❤️', 'success');
        }
      }
    } else if (event.code === 'KeyS') {
      event.preventDefault();
      this.store.dispatch(PlayerActions.toggleShuffle());
      this.toastService.show(!this.isShuffled() ? 'Shuffle On 🔀' : 'Shuffle Off ➡️', 'info');
    } else if (event.code === 'KeyR') {
      event.preventDefault();
      this.store.dispatch(PlayerActions.cycleRepeat());
      this.toastService.show(`Repeat Mode: ${this.repeatMode()}`, 'info');
    } else if (event.key === '?') {
      event.preventDefault();
      this.showShortcuts.set(!this.showShortcuts());
    }
  }
}
