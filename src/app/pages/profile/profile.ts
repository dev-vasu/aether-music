import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleAuthService } from '../../services/google-auth.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { selectIsPlaying } from '../../state/player/player.selectors';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="aurora-view profile-container">
      <!-- Cosmic Passport -->
      <div class="passport-card glass" *ngIf="isLoggedIn()">
        <div class="passport-header">
            <span class="badge">Cosmic Passport</span>
            <div class="passport-id">#GEN-Z-{{ sessionStartTime }}</div>
        </div>

        <div class="passport-main">
            <div class="avatar-section">
                <div class="avatar-display" [class.playing-glow]="isPlaying()" [style.background]="authService.getAvatarColor()">
                    <div class="avatar-svg-wrap" [innerHTML]="authService.getAvatarSvg()"></div>
                </div>
                <button class="customize-trigger" (click)="showGallery.set(!showGallery())">
                    <svg viewBox="0 0 24 24" class="btn-icon"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    {{ showGallery() ? 'Done' : 'Change Look' }}
                </button>
            </div>
            
            <div class="profile-meta">
              <div class="alias-container">
                  <input type="text" [(ngModel)]="alias" (blur)="saveAlias()" placeholder="Your Alias..." class="alias-field">
                  <button class="random-btn" (click)="generateRandomAlias()" title="Randomize Name">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
                  </button>
              </div>
              <p class="identity-source">Linked to: {{ userProfile()?.email }}</p>
              
              <div class="badges-row">
                  <div class="status-badge active">
                      <div class="status-circle"></div>
                      <span>Vibe: High Energy</span>
                  </div>

                  <!-- SYNC STATUS BADGE -->
                  <div class="status-badge sync" [class.error]="syncStatus() === 'missing_permission' || syncStatus() === 'error'">
                      <svg *ngIf="syncStatus() === 'active'" viewBox="0 0 24 24" class="sync-icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                      <svg *ngIf="syncStatus() === 'pending'" viewBox="0 0 24 24" class="sync-icon spin"><path d="M12 4V1L8 5l4 3V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 9.21 4 10.57 4 12c0 4.42 3.58 8 8 8v3l4-4-4-3v3z"/></svg>
                      <svg *ngIf="syncStatus() === 'missing_permission' || syncStatus() === 'error'" viewBox="0 0 24 24" class="sync-icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                      <span>{{ getSyncLabel() }}</span>
                  </div>
              </div>

              <!-- RE-LOGIN HELP FOR SYNC -->
              <div class="sync-help" *ngIf="syncStatus() === 'missing_permission'">
                  <p>Cloud Sync is blocked. Please log in again and check the <b>"See/Create config data"</b> box!</p>
                  <button (click)="authService.login()" class="reauth-btn">Fix Cloud Sync</button>
              </div>
            </div>
        </div>

        <!-- Funky Avatar Grid -->
        <div class="avatar-grid-overlay" *ngIf="showGallery()">
            <div class="grid-title">Choose your Entity</div>
            <div class="grid-content">
                <div class="avatar-item" *ngFor="let av of authService.funkyAvatars" 
                     [class.active]="selectedAvatar() === av.id"
                     [style.background]="av.color"
                     (click)="selectAvatar(av.id)">
                    <div class="mini-svg" [innerHTML]="authService.getAvatarSvg(av.id)"></div>
                </div>
            </div>
        </div>

        <div class="passport-actions">
          <button (click)="logout()" class="abort-btn">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>
            Abort Connection
          </button>
        </div>
      </div>
      
      <!-- Session Telemetry -->
      <div class="telemetry-row" *ngIf="isLoggedIn()">
          <div class="stat-card glass">
              <span class="t-label">Drift Time</span>
              <div class="t-value-wrap">
                  <span class="t-value">{{ getPlaytime() }}</span>
              </div>
          </div>
          <div class="stat-card glass">
              <span class="t-label">Stellar Hits</span>
              <div class="t-value-wrap">
                  <span class="t-value">{{ tracksPlayed() }}</span>
                  <span class="t-unit">Echoes</span>
              </div>
          </div>
      </div>

      <!-- Unauthorized State -->
      <div class="denied-state glass" *ngIf="!isLoggedIn()">
          <h2>Signal Lost</h2>
          <p>Cosmic passport inactive. Return to base.</p>
          <button routerLink="/" class="relink-btn">Return to Base</button>
      </div>
    </div>
  `,
  styles: [`
    .profile-container { display: flex; flex-direction: column; align-items: center; padding: 60px 20px; gap: 32px; }
    .passport-card { padding: 40px; border-radius: 56px; width: 100%; max-width: 600px; position: relative; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); transition: all 0.4s ease; }
    .passport-header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .passport-id { font-family: monospace; font-size: 11px; opacity: 0.3; letter-spacing: 1px; }
    .passport-main { display: flex; align-items: center; gap: 48px; margin-bottom: 40px; }
    .avatar-section { display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .avatar-display { width: 150px; height: 150px; border-radius: 48px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); transition: all 0.5s; overflow: hidden; }
    .playing-glow { box-shadow: 0 0 40px rgba(168, 85, 247, 0.4); border-color: #a855f7; transform: rotate(2deg); }
    .avatar-svg-wrap { width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; }
    .avatar-svg-wrap ::ng-deep svg { width: 100px; height: 100px; display: block; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
    .customize-trigger { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 10px 20px; border-radius: 50px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s; }
    .customize-trigger:hover { background: white; color: black; }
    .btn-icon { width: 14px; height: 14px; }
    .alias-container { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
    .alias-field { background: none; border: none; color: white; font-size: 38px; font-weight: 900; width: 280px; outline: none; letter-spacing: -1.5px; }
    .random-btn { background: rgba(168, 85, 247, 0.1); border: none; width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #a855f7; transition: all 0.3s; }
    .random-btn:hover { transform: rotate(180deg) scale(1.1); background: #a855f7; color: white; }
    .identity-source { font-size: 13px; opacity: 0.3; margin-bottom: 24px; }
    
    .badges-row { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .status-badge { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 11px; padding: 6px 16px; border-radius: 50px; }
    .status-badge.active { color: #10b981; background: rgba(16, 185, 129, 0.1); }
    .status-badge.sync { color: #a855f7; background: rgba(168, 85, 247, 0.1); }
    .status-badge.sync.error { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
    
    .sync-icon { width: 14px; height: 14px; fill: currentColor; }
    .sync-icon.spin { animation: spin 2s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .sync-help { background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 20px; padding: 16px; margin-top: 20px; }
    .sync-help p { font-size: 12px; color: #ef4444; margin-bottom: 12px; font-weight: 600; line-height: 1.4; }
    .reauth-btn { background: #ef4444; color: white; border: none; padding: 8px 20px; border-radius: 50px; font-size: 11px; font-weight: 800; cursor: pointer; }

    .status-circle { width: 6px; height: 6px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite; }
    .avatar-grid-overlay { background: rgba(0,0,0,0.3); border-radius: 32px; padding: 24px; margin-bottom: 32px; border: 1px solid rgba(255,255,255,0.05); }
    .grid-title { font-size: 10px; font-weight: 900; text-transform: uppercase; opacity: 0.4; margin-bottom: 20px; }
    .grid-content { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
    .avatar-item { aspect-ratio: 1; border-radius: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; border: 2px solid transparent; }
    .avatar-item.active { border-color: white; transform: scale(1.05); box-shadow: 0 0 20px rgba(255,255,255,0.2); }
    .avatar-item:hover { transform: translateY(-4px); background: rgba(255,255,255,0.1) !important; }
    .mini-svg { width: 32px; height: 32px; }
    .mini-svg ::ng-deep svg { width: 100%; height: 100%; display: block; }
    .passport-actions { padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.05); }
    .abort-btn { background: rgba(255, 71, 87, 0.1); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.2); padding: 10px 24px; border-radius: 16px; font-weight: 800; font-size: 12px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.3s; }
    .abort-btn:hover { background: #ff4757; color: white; }
    .telemetry-row { display: flex; gap: 24px; width: 100%; max-width: 600px; }
    .stat-card { flex: 1; padding: 24px 32px; border-radius: 32px; }
    .t-label { font-size: 10px; font-weight: 900; text-transform: uppercase; opacity: 0.3; margin-bottom: 4px; display: block; }
    .t-value { font-size: 32px; font-weight: 900; letter-spacing: -1px; }
    .t-unit { font-size: 12px; opacity: 0.3; margin-left: 4px; }
    .relink-btn { margin-top: 24px; background: white; color: black; border: none; padding: 12px 32px; border-radius: 50px; font-weight: 800; cursor: pointer; }
    .glass { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(50px); border: 1px solid rgba(255, 255, 255, 0.08); }
    @keyframes pulse { 0% { transform: scale(0.9); opacity: 0.7; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(0.9); opacity: 0.7; } }

    /* MOBILE OVERHAUL */
    @media (max-width: 768px) {
        .profile-container { padding: 30px 16px; gap: 20px; }
        .passport-card { padding: 24px; border-radius: 32px; }
        .passport-main { flex-direction: column; gap: 24px; text-align: center; }
        .avatar-display { width: 100px; height: 100px; border-radius: 30px; }
        .avatar-svg-wrap { width: 60px; height: 60px; }
        .avatar-svg-wrap ::ng-deep svg { width: 60px; height: 60px; }
        .alias-container { justify-content: center; }
        .alias-field { font-size: 24px; width: 200px; text-align: center; }
        .random-btn { width: 36px; height: 36px; border-radius: 10px; }
        .status-badge { align-self: center; }
        .grid-content { grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .telemetry-row { flex-direction: column; gap: 16px; }
        .stat-card { padding: 16px 20px; border-radius: 20px; }
        .t-value { font-size: 24px; }
        .badges-row { justify-content: center; }
    }
  `]
})
export class ProfileViewComponent {
  public authService = inject(GoogleAuthService);
  private store = inject(Store);
  
  userProfile = this.authService.userProfile;
  tracksPlayed = this.authService.sessionTracksPlayed;
  sessionStartTime = Math.floor(this.authService.sessionStartTime / 1000000);
  isPlaying = this.store.selectSignal(selectIsPlaying);
  syncStatus = this.authService.cloudSyncStatus;
  
  alias: string = '';
  showGallery = signal(false);

  constructor() {
      effect(() => {
          const profile = this.userProfile();
          if (profile && !this.alias) {
              this.alias = profile.alias;
          }
      }, { allowSignalWrites: true });
  }

  getSyncLabel(): string {
      const status = this.syncStatus();
      if (status === 'active') return 'Cloud Active';
      if (status === 'pending') return 'Syncing...';
      if (status === 'missing_permission') return 'Permission Needed';
      if (status === 'error') return 'Sync Error';
      return 'Sync Disabled';
  }

  isLoggedIn() { return !!this.authService.getToken(); }
  getPlaytime() { return this.authService.getSessionPlaytime(); }
  selectedAvatar() { return this.userProfile()?.avatarId; }

  selectAvatar(id: number) {
      this.authService.updateFunkyProfile(this.alias, id);
  }

  generateRandomAlias() {
    const adj = ['Hyper', 'Neon', 'Cosmic', 'Stellar', 'Atomic', 'Cyber', 'Quantum', 'Glitch', 'Ethereal', 'Astra', 'Phonk', 'Vapor'];
    const noun = ['Void', 'Maverick', 'Pilot', 'Ghost', 'Echo', 'Hunter', 'Drifter', 'Nova', 'Pulse', 'Orbiter', 'Wraith', 'X'];
    this.alias = adj[Math.floor(Math.random() * adj.length)] + ' ' + noun[Math.floor(Math.random() * noun.length)];
    this.saveAlias();
  }

  saveAlias() {
      this.authService.updateFunkyProfile(this.alias, this.selectedAvatar() || 0);
  }

  logout() { this.authService.logout(); }
}
