import { Component, inject } from '@angular/core';
import { PlayerBarComponent } from './components/player-bar/player-bar';
import { BackgroundComponent } from './components/background/background';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GoogleAuthService } from './services/google-auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PlayerBarComponent, BackgroundComponent, RouterOutlet, RouterModule, CommonModule],
  template: `
    <app-background></app-background>
    
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

      <!-- Global Identity Dock (Top Right) -->
      <div class="identity-anchor">
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
            Built with ❤️ by Vasu
        </footer>
      </main>

      <!-- Global Trial Gate Overlay -->
      <div class="trial-gate-overlay" *ngIf="showGate()">
          <div class="gate-card glass">
              <div class="gate-icon">
                  <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8,8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
              </div>
              <h2>Trial Limit Reached</h2>
              <p>You've played your free cosmic track! Sign in with Google to continue your journey and help us monitor token usage.</p>
              <button (click)="login()" class="gate-login-btn">
                  <svg viewBox="0 0 24 24" class="g-icon"><path d="M21.35 11.1h-9.17v2.73h5.14c-.22 1.2-1.31 3.51-5.14 3.51-3.3 0-5.99-2.74-5.99-6.12s2.69-6.12 5.99-6.12c1.89 0 3.14.81 3.86 1.53l2.15-2.1c-1.37-1.28-3.15-2.07-6.01-2.07-4.14 0-7.5 3.36-7.5 7.5s3.36 7.5 7.5 7.5c4.32 0 7.22-3.04 7.22-7.35 0-.49-.05-.87-.14-1.22z"/></svg>
                  Connect with Google
              </button>
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
      opacity: 0.4; 
      transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); 
    }
    .dock-link svg { width: 20px; height: 20px; fill: currentColor; }
    .dock-link .label { font-size: 13px; font-weight: 700; letter-spacing: -0.2px; display: none; }
    .dock-link:hover { opacity: 0.8; background: rgba(255, 255, 255, 0.08); }
    .dock-link.active { opacity: 1; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); box-shadow: 0 8px 20px rgba(168, 85, 247, 0.3); }
    .dock-link.active .label { display: block; }

    .identity-anchor { position: fixed; top: 32px; right: 32px; z-index: 2000; }
    .aurora-btn.mini { background: white; color: black; border: none; padding: 8px 24px; border-radius: 50px; font-weight: 800; font-size: 12px; cursor: pointer; box-shadow: 0 8px 20px rgba(255,255,255,0.15); transition: all 0.3s; text-transform: uppercase; letter-spacing: 1px; }
    .identity-glass { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(30px); border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 12px 6px 6px; border-radius: 50px; display: flex; align-items: center; gap: 10px; text-decoration: none; color: white; transition: all 0.3s; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); }
    .identity-active { border-color: #a855f7; }
    .user-avatar-wrap { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; background: #a855f7; }
    .mini-svg-avatar { width: 20px; height: 20px; }
    .mini-svg-avatar ::ng-deep svg { width: 100%; height: 100%; display: block; }
    .user-meta-wrap { display: flex; flex-direction: column; }
    .u-name { font-size: 12px; font-weight: 800; letter-spacing: -0.2px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .aurora-content { height: 100%; overflow-y: auto; padding-top: 110px; padding-bottom: 200px; scroll-behavior: smooth; }
    
    .app-credit {
        text-align: center;
        padding: 40px 0;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 2px;
        opacity: 0.15;
        color: white;
        transition: opacity 0.3s;
    }
    .app-credit:hover { opacity: 0.5; }

    .player-float-container { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 900px; z-index: 2500; transition: all 0.5s ease; }
    
    .trial-gate-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); backdrop-filter: blur(15px); z-index: 5000; display: flex; align-items: center; justify-content: center; }
    .gate-card { padding: 48px; border-radius: 48px; text-align: center; max-width: 450px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
    .gate-icon { width: 80px; height: 80px; margin: 0 auto 24px auto; color: #a855f7; }
    .gate-icon svg { width: 100%; height: 100%; fill: currentColor; }
    .gate-card h2 { font-size: 32px; font-weight: 900; margin-bottom: 16px; letter-spacing: -1px; }
    .gate-card p { opacity: 0.6; line-height: 1.6; margin-bottom: 32px; font-size: 15px; }
    .gate-login-btn { width: 100%; background: white; color: black; border: none; padding: 16px 32px; border-radius: 20px; font-weight: 800; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: 0.3s; }
    .gate-login-btn:hover { transform: scale(1.05); box-shadow: 0 10px 30px rgba(255,255,255,0.2); }
    .g-icon { width: 20px; height: 20px; }

    /* MOBILE OVERHAUL */
    @media (max-width: 768px) {
        .aurora-nav { top: auto; bottom: 24px; width: 90%; z-index: 3000; }
        .glass-dock { justify-content: space-around; padding: 8px; border-radius: 25px; }
        .dock-link { padding: 0 12px; flex-direction: column; gap: 4px; height: auto; opacity: 0.5; }
        .dock-link.active { background: none; box-shadow: none; color: #a855f7; opacity: 1; }
        .dock-link .label { display: block; font-size: 10px; }
        .identity-anchor { top: 16px; right: 16px; }
        .identity-glass { padding: 4px; }
        .u-name { display: none; }
        .player-float-container { bottom: 100px; width: 95%; }
        .aurora-content { padding-top: 80px; padding-bottom: 250px; }
    }
  `]
})
export class App {
  public authService = inject(GoogleAuthService);
  userProfile = this.authService.userProfile;
  showGate = () => !this.authService.getToken() && this.authService.anonymousPlayCount() >= 2;
  isLoggedIn() { return !!this.authService.getToken(); }
  login() { this.authService.login(); }
}
