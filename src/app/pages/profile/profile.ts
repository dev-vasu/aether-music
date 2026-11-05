import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleAuthService } from '../../services/google-auth.service';
import { ToastService } from '../../services/toast.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { selectIsPlaying, selectVibeProfile } from '../../state/player/player.selectors';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="aurora-view profile-container">
      
      <!-- Top Passport Sub-Navigation Tabs -->
      <div class="passport-tabs" *ngIf="isLoggedIn()">
        <button class="p-tab" [class.active]="activeTab() === 'identity'" (click)="activeTab.set('identity')">
          <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          Cosmic Passport
        </button>
        <button class="p-tab" [class.active]="activeTab() === 'telemetry'" (click)="activeTab.set('telemetry')">
          <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6-8h-2V7h2v2z"/></svg>
          Telemetry & Echoes
        </button>
        <button class="p-tab" [class.active]="activeTab() === 'engine'" (click)="activeTab.set('engine')">
          <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          Audio Engine Specs
        </button>
      </div>

      <!-- TAB 1: COSMIC PASSPORT IDENTITY -->
      <div class="passport-card" *ngIf="isLoggedIn() && activeTab() === 'identity'">
        <div class="chassis-machined-top"></div>
        
        <div class="passport-header">
          <div class="header-badge-group">
            <span class="braun-dot"></span>
            <span class="spec-label">AUDIOPHILE IDENTITY CARD</span>
            <span class="lossless-chip">MASTER 24-BIT</span>
          </div>
          <div class="passport-id">ID // AE-{{ sessionStartTime }}</div>
        </div>

        <div class="passport-main">
          <div class="avatar-section">
            <div class="avatar-display" [class.playing-glow]="isPlaying()" [style.background]="authService.getAvatarColor()">
              <div class="avatar-svg-wrap" [innerHTML]="authService.getAvatarSvg()"></div>
              <div class="live-eq-badge" *ngIf="isPlaying()">
                <span class="eq-dot"></span>
                <span class="eq-dot"></span>
                <span class="eq-dot"></span>
              </div>
            </div>
            <button class="customize-trigger" (click)="showGallery.set(!showGallery())">
              <svg viewBox="0 0 24 24" class="btn-icon"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              {{ showGallery() ? 'Close Gallery' : 'Switch Entity' }}
            </button>
          </div>
          
          <div class="profile-meta">
            <div class="alias-container">
              <input type="text" [(ngModel)]="alias" (blur)="saveAlias()" placeholder="Your Alias..." class="alias-field">
              <button class="random-btn" (click)="generateRandomAlias()" title="Randomize Entity Name">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
              </button>
            </div>
            <p class="identity-source">Authenticated with Google: <span>{{ userProfile()?.email }}</span></p>
            
            <div class="badges-row">
              <div class="status-badge active">
                <div class="status-circle"></div>
                <span>Station: Active Audio Node</span>
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
              <p>Cloud Sync requires Google Drive AppData permission.</p>
              <button (click)="authService.login()" class="reauth-btn">Re-Authenticate Cloud Sync</button>
            </div>
          </div>
        </div>

        <!-- Entity Gallery Overlay -->
        <div class="avatar-grid-overlay" *ngIf="showGallery()">
          <div class="grid-header">
            <span class="grid-title">SELECT ACOUSTIC ENTITY AVATAR</span>
            <span class="grid-count">{{ authService.funkyAvatars.length }} AVAILABLE</span>
          </div>
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
            Sign Out / Disconnect Node
          </button>
        </div>
      </div>

      <!-- TAB 2: TELEMETRY & ECHOES -->
      <div class="telemetry-grid" *ngIf="isLoggedIn() && activeTab() === 'telemetry'">
        <div class="stat-card">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
          </div>
          <span class="t-label">SESSION DRIFT TIME</span>
          <div class="t-value-wrap">
            <span class="t-value">{{ getPlaytime() }}</span>
          </div>
          <span class="t-sub">Continuous playback duration</span>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          </div>
          <span class="t-label">STELLAR ECHOES</span>
          <div class="t-value-wrap">
            <span class="t-value">{{ tracksPlayed() }}</span>
            <span class="t-unit">TRACKS</span>
          </div>
          <span class="t-sub">Acoustic tracks enjoyed</span>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>
          </div>
          <span class="t-label">ACTIVE VIBE RESONANCE</span>
          <div class="t-value-wrap">
            <span class="t-value small">{{ vibeProfile() }}</span>
          </div>
          <span class="t-sub">Acoustic fingerprint match</span>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6-8h-2V7h2v2z"/></svg>
          </div>
          <span class="t-label">DYNAMIC PURITY</span>
          <div class="t-value-wrap">
            <span class="t-value">99.8%</span>
            <span class="t-unit">SNR</span>
          </div>
          <span class="t-sub">Studio lossless master quality</span>
        </div>
      </div>

      <!-- TAB 3: AUDIO ENGINE SPECIFICATIONS -->
      <div class="engine-specs-container" *ngIf="isLoggedIn() && activeTab() === 'engine'">
        <div class="spec-tile">
          <div class="tile-meta">
            <h4>Audio Sampling Rate</h4>
            <p>Direct lossless master pipeline</p>
          </div>
          <span class="spec-pill">24-BIT // 48.0 kHz</span>
        </div>

        <div class="spec-tile">
          <div class="tile-meta">
            <h4>Vibe Match Classifier</h4>
            <p>Multi-spectral acoustic mood engine</p>
          </div>
          <span class="spec-pill green">v2.4 ACTIVE</span>
        </div>

        <div class="spec-tile">
          <div class="tile-meta">
            <h4>Ambient Full-Screen Canvas</h4>
            <p>Real-time dual-mesh GPU shader</p>
          </div>
          <span class="spec-pill">ENABLED</span>
        </div>

        <div class="spec-tile action-tile">
          <div class="tile-meta">
            <h4>Local High-Definition Cache</h4>
            <p>Studio album artwork & track indices</p>
          </div>
          <button class="purge-btn" (click)="purgeCache()">
            <svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
            Re-Calibrate Cache
          </button>
        </div>
      </div>

      <!-- Unauthorized State -->
      <div class="denied-state" *ngIf="!isLoggedIn()">
        <span class="braun-dot large"></span>
        <h2>Station Offline</h2>
        <p>Aether Cosmic Passport inactive. Authenticate to sync your identity.</p>
        <button routerLink="/" class="relink-btn">Return to Sound Station</button>
      </div>
    </div>
  `,
  styles: [`
    .profile-container { 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      padding: 30px 20px 80px 20px; 
      gap: 28px; 
    }

    /* TACTILE SUB-NAVIGATION TABS */
    .passport-tabs {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px;
      background: #17181c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }
    .p-tab {
      background: none;
      border: 1px solid transparent;
      color: #9ca3af;
      padding: 8px 18px;
      border-radius: 18px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.2px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .p-tab svg {
      width: 15px;
      height: 15px;
      fill: currentColor;
    }
    .p-tab:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.04);
    }
    .p-tab.active {
      background: #24262c;
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.14);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    }
    .p-tab.active svg {
      fill: #ff5722;
    }

    /* BRAUN / B&O PASSPORT CARD */
    .passport-card {
      position: relative;
      padding: 36px 40px;
      border-radius: 20px;
      width: 100%;
      max-width: 640px;
      background: #17181c;
      border: 1px solid rgba(255, 255, 255, 0.09);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      overflow: hidden;
    }

    .chassis-machined-top {
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 87, 34, 0.5) 20%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 87, 34, 0.5) 80%, transparent);
    }

    .passport-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .header-badge-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .braun-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ff5722;
      box-shadow: 0 0 8px rgba(255, 87, 34, 0.6);
    }
    .braun-dot.large {
      width: 14px;
      height: 14px;
      margin-bottom: 12px;
    }
    .spec-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #ffffff;
    }
    .lossless-chip {
      font-family: var(--font-mono);
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.6px;
      background: rgba(255, 87, 34, 0.12);
      color: #ff5722;
      border: 1px solid rgba(255, 87, 34, 0.35);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .passport-id {
      font-family: var(--font-mono);
      font-size: 11px;
      color: #9ca3af;
      letter-spacing: 1px;
    }

    .passport-main {
      display: flex;
      align-items: center;
      gap: 36px;
      margin-bottom: 32px;
    }
    .avatar-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .avatar-display {
      width: 130px;
      height: 130px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.12);
      position: relative;
      overflow: hidden;
      transition: all 0.4s ease;
    }
    .playing-glow {
      box-shadow: 0 0 35px rgba(255, 87, 34, 0.35);
      border-color: #ff5722;
    }
    .avatar-svg-wrap {
      width: 85px;
      height: 85px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .avatar-svg-wrap ::ng-deep svg {
      width: 100%;
      height: 100%;
      display: block;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
    }
    .live-eq-badge {
      position: absolute;
      bottom: 6px;
      display: flex;
      gap: 3px;
      background: rgba(0, 0, 0, 0.6);
      padding: 2px 6px;
      border-radius: 8px;
    }
    .eq-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #ff5722;
      animation: eqBlink 1.2s infinite ease-in-out;
    }
    .eq-dot:nth-child(2) { animation-delay: 0.2s; }
    .eq-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes eqBlink {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }

    .customize-trigger {
      background: #24262c;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #f3f4f6;
      padding: 8px 16px;
      border-radius: 14px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .customize-trigger:hover {
      background: #ff5722;
      color: #ffffff;
      border-color: #ff5722;
    }
    .btn-icon { width: 14px; height: 14px; fill: currentColor; }

    .profile-meta { flex: 1; }
    .alias-container { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
    .alias-field {
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 28px;
      font-weight: 800;
      width: 240px;
      outline: none;
      letter-spacing: -0.5px;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
      padding-bottom: 2px;
    }
    .alias-field:focus { border-bottom-color: #ff5722; }
    .random-btn {
      background: #202227;
      border: 1px solid rgba(255, 255, 255, 0.1);
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #ff5722;
      transition: all 0.2s;
    }
    .random-btn:hover { background: #ff5722; color: #ffffff; transform: rotate(180deg); }
    .identity-source {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 20px;
    }
    .identity-source span { color: #f3f4f6; font-weight: 600; }

    .badges-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 8px;
      background: #141518;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #d1d5db;
    }
    .status-badge.active { color: #10b981; border-color: rgba(16, 185, 129, 0.25); }
    .status-badge.sync { color: #ff5722; border-color: rgba(255, 87, 34, 0.25); }
    .status-badge.sync.error { color: #ef4444; border-color: rgba(239, 68, 68, 0.25); }
    .status-circle { width: 6px; height: 6px; background: #10b981; border-radius: 50%; box-shadow: 0 0 6px #10b981; }
    .sync-icon { width: 13px; height: 13px; fill: currentColor; }
    .sync-icon.spin { animation: spin 2s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .sync-help {
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 12px;
      padding: 12px 16px;
      margin-top: 16px;
    }
    .sync-help p { font-size: 11.5px; color: #ef4444; margin-bottom: 8px; font-weight: 600; }
    .reauth-btn {
      background: #ef4444;
      color: white;
      border: none;
      padding: 6px 16px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }

    /* AVATAR GALLERY OVERLAY */
    .avatar-grid-overlay {
      background: #141518;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .grid-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .grid-title { font-family: var(--font-mono); font-size: 9.5px; font-weight: 800; letter-spacing: 0.8px; color: #ff5722; }
    .grid-count { font-family: var(--font-mono); font-size: 9.5px; color: #9ca3af; }
    .grid-content { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
    .avatar-item {
      aspect-ratio: 1;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid transparent;
      transition: all 0.2s;
    }
    .avatar-item.active { border-color: #ff5722; transform: scale(1.05); }
    .avatar-item:hover { transform: translateY(-2px); }
    .mini-svg { width: 30px; height: 30px; }
    .mini-svg ::ng-deep svg { width: 100%; height: 100%; display: block; }

    .passport-actions {
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      justify-content: flex-end;
    }
    .abort-btn {
      background: rgba(239, 68, 68, 0.08);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.25);
      padding: 8px 18px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .abort-btn:hover { background: #ef4444; color: #ffffff; }

    /* TELEMETRY GRID */
    .telemetry-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      width: 100%;
      max-width: 640px;
    }
    .stat-card {
      background: #17181c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 24px 28px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      position: relative;
      overflow: hidden;
    }
    .stat-icon {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 24px;
      height: 24px;
      opacity: 0.15;
    }
    .stat-icon svg { width: 100%; height: 100%; fill: #ffffff; }
    .t-label {
      font-family: var(--font-mono);
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #ff5722;
      display: block;
      margin-bottom: 8px;
    }
    .t-value-wrap { display: flex; align-items: baseline; gap: 6px; margin-bottom: 6px; }
    .t-value { font-size: 32px; font-weight: 800; letter-spacing: -1px; color: #f3f4f6; }
    .t-value.small { font-size: 16px; font-weight: 700; letter-spacing: 0; line-height: 1.3; }
    .t-unit { font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: #9ca3af; }
    .t-sub { font-size: 11px; color: #6b7280; display: block; }

    /* AUDIO ENGINE SPEC TILES */
    .engine-specs-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      max-width: 640px;
    }
    .spec-tile {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      background: #17181c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }
    .tile-meta h4 { font-size: 14px; font-weight: 700; color: #f3f4f6; margin-bottom: 2px; }
    .tile-meta p { font-size: 11.5px; color: #9ca3af; }
    .spec-pill {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.8px;
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(255, 87, 34, 0.12);
      color: #ff5722;
      border: 1px solid rgba(255, 87, 34, 0.35);
    }
    .spec-pill.green {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
      border-color: rgba(16, 185, 129, 0.35);
    }
    .purge-btn {
      background: #24262c;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #f3f4f6;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .purge-btn svg { width: 14px; height: 14px; fill: #ff5722; }
    .purge-btn:hover { background: #ff5722; color: #ffffff; }
    .purge-btn:hover svg { fill: #ffffff; }

    /* DENIED STATE */
    .denied-state {
      padding: 60px 40px;
      text-align: center;
      background: #17181c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      max-width: 480px;
    }
    .denied-state h2 { font-size: 22px; font-weight: 800; margin-bottom: 8px; color: #f3f4f6; }
    .denied-state p { font-size: 13px; color: #9ca3af; margin-bottom: 24px; }
    .relink-btn {
      background: #ff5722;
      color: #ffffff;
      border: none;
      padding: 10px 24px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .relink-btn:hover { background: #f4511e; }

    @media (max-width: 768px) {
      .profile-container { padding: 20px 14px; }
      .passport-tabs { width: 100%; overflow-x: auto; }
      .p-tab { font-size: 11px; padding: 6px 12px; }
      .passport-card { padding: 24px 18px; }
      .passport-main { flex-direction: column; gap: 20px; text-align: center; }
      .alias-container { justify-content: center; }
      .badges-row { justify-content: center; }
      .telemetry-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ProfileViewComponent {
  public authService = inject(GoogleAuthService);
  private store = inject(Store);
  private toast = inject(ToastService);
  
  userProfile = this.authService.userProfile;
  tracksPlayed = this.authService.sessionTracksPlayed;
  sessionStartTime = Math.floor(this.authService.sessionStartTime / 1000000);
  isPlaying = this.store.selectSignal(selectIsPlaying);
  vibeProfile = this.store.selectSignal(selectVibeProfile);
  syncStatus = this.authService.cloudSyncStatus;
  
  alias: string = '';
  showGallery = signal(false);
  activeTab = signal<'identity' | 'telemetry' | 'engine'>('identity');

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
    if (status === 'active') return 'Cloud Sync Active';
    if (status === 'pending') return 'Syncing State...';
    if (status === 'missing_permission') return 'Permission Blocked';
    if (status === 'error') return 'Sync Failure';
    return 'Local Storage Only';
  }

  isLoggedIn() { return !!this.authService.getToken(); }
  getPlaytime() { return this.authService.getSessionPlaytime(); }
  selectedAvatar() { return this.userProfile()?.avatarId; }

  selectAvatar(id: number) {
    this.authService.updateFunkyProfile(this.alias, id);
    this.toast.show('Acoustic Entity Avatar Updated', 'success');
  }

  generateRandomAlias() {
    const adj = ['Hyper', 'Neon', 'Cosmic', 'Stellar', 'Atomic', 'Cyber', 'Quantum', 'Glitch', 'Ethereal', 'Astra', 'Phonk', 'Vapor'];
    const noun = ['Void', 'Maverick', 'Pilot', 'Ghost', 'Echo', 'Hunter', 'Drifter', 'Nova', 'Pulse', 'Orbiter', 'Wraith', 'Aether'];
    this.alias = adj[Math.floor(Math.random() * adj.length)] + ' ' + noun[Math.floor(Math.random() * noun.length)];
    this.saveAlias();
  }

  saveAlias() {
    this.authService.updateFunkyProfile(this.alias, this.selectedAvatar() || 0);
    this.toast.show(`Alias Saved: ${this.alias}`, 'info');
  }

  purgeCache() {
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('melody_cache')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
    this.toast.show('Aether Audio Cache Calibrated', 'success');
  }

  logout() { this.authService.logout(); }
}
