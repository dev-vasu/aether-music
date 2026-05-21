import { Injectable, signal, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface UserProfile {
    name: string;
    email: string;
    picture: string;
    alias: string;
    avatarId: number;
}

export type SyncStatus = 'active' | 'error' | 'pending' | 'missing_permission' | 'disabled';

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private sanitizer = inject(DomSanitizer);
  private accessToken = signal<string | null>(null);
  public userProfile = signal<UserProfile | null>(null);
  public anonymousPlayCount = signal<number>(0);
  public cloudSyncStatus = signal<SyncStatus>('disabled');

  public funkyAvatars = [
    { id: 1, name: 'Cyber Cat', color: 'linear-gradient(135deg, #FF0080, #7928CA)', svg: `<svg viewBox="0 0 24 24"><path fill="#fff" d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8s8,3.59,8,8 S16.41,20,12,20z M7,10c0.55,0,1-0.45,1-1c0-0.55-0.45-1-1-1s-1,0.45-1,1C6,9.55,6.45,10,7,10z M17,10c0.55,0,1-0.45,1-1 c0-0.55-0.45-1-1-1s-1,0.45-1,1C16,9.55,16.45,10,17,10z M12,14c-1.33,0-4,0.67-4,2v1h8v-1C16,14.67,13.33,14,12,14z"/></svg>` },
    { id: 2, name: 'Neon Samurai', color: 'linear-gradient(135deg, #00DFD8, #007CF0)', svg: `<svg viewBox="0 0 24 24"><path fill="#fff" d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2z M12,15.4L8.5,17.3L12,5.5L15.5,17.3L12,15.4z"/></svg>` },
    { id: 3, name: 'Vapor Wave', color: 'linear-gradient(135deg, #FF4D4D, #F9CB28)', svg: `<svg viewBox="0 0 24 24"><path fill="#fff" d="M12,2L2,12h3v8h6v-6h2v6h6v-8h3L12,2z M12,10c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S13.1,10,12,10z"/></svg>` },
    { id: 4, name: 'Phonk Ghost', color: 'linear-gradient(135deg, #333, #000)', svg: `<svg viewBox="0 0 24 24"><path fill="#fff" d="M12,2c-4.97,0-8,4.03-8,9c0,4.17,2.84,7.67,6.69,8.69L12,22l2.31-2.31C18.16,18.67,21,15.17,21,11C21,6.03,17.97,2,12,2z M12,14 c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S13.1,14,12,14z"/></svg>` },
    { id: 5, name: 'Techno Shroom', color: 'linear-gradient(135deg, #8E2DE2, #4A00E0)', svg: `<svg viewBox="0 0 24 24"><path fill="#fff" d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,15c-1.66,0-3-1.34-3-3s1.34-3,3-3s3,1.34,3,3 S13.66,15,12,15z"/></svg>` },
    { id: 6, name: 'Retro Bot', color: 'linear-gradient(135deg, #00F2FE, #4FACFE)', svg: `<svg viewBox="0 0 24 24"><path fill="#fff" d="M12,2c-4.97,0-9,4.03-9,9c0,3.92,2.6,7.22,6.1,8.38l-1.1,1.1l1.42,1.42L12,19.33l2.58,2.58l1.42-1.42l-1.1-1.1 c3.5-1.16,6.1-4.46,6.1-8.38C21,6.03,16.97,2,12,2z M12,14c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S13.1,14,12,14z"/></svg>` },
    { id: 7, name: 'Glow Skull', color: 'linear-gradient(135deg, #F093FB, #F5576C)', svg: `<svg viewBox="0 0 24 24"><path fill="#fff" d="M12,2c-4.97,0-9,4.03-9,9c0,4.97,4.03,9,9,9s9-4.03,9-9C21,6.03,16.97,2,12,2z M12,17c-1.66,0-3-1.34-3-3s1.34-3,3-3 s3,1.34,3,3S13.66,17,12,17z"/></svg>` },
    { id: 8, name: 'Glitch Diamond', color: 'linear-gradient(135deg, #5EE7DF, #B490CA)', svg: `<svg viewBox="0 0 24 24"><path fill="#fff" d="M12.12,3L20.5,12l-8.38,9l-8.37-9L12.12,3z M12.12,15.6L15.3,12l-3.18-3.6L8.94,12L12.12,15.6z"/></svg>` },
    { id: 9, name: 'Stellar Pulse', color: 'linear-gradient(135deg, #667eea, #764ba2)', svg: `<svg viewBox="0 0 24 24"><path fill="#fff" d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,18c-3.31,0-6-2.69-6-6s2.69-6,6-6s6,2.69,6,6 S15.31,18,12,18z"/></svg>` },
    { id: 10, name: 'Dark Nebula', color: 'linear-gradient(135deg, #16213E, #0F3460)', svg: `<svg viewBox="0 0 24 24"><path fill="#fff" d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,16c-2.21,0-4-1.79-4-4s1.79-4,4-4s4,1.79,4,4 S14.21,16,12,16z"/></svg>` }
  ];

  public sessionTracksPlayed = signal<number>(0);
  public sessionStartTime = Date.now();

  constructor() {
    this.checkToken();
  }

  getAvatarSvg(id?: number): SafeHtml {
      const avatarId = id !== undefined ? id : this.userProfile()?.avatarId;
      const avatar = this.funkyAvatars.find(a => a.id === avatarId);
      const svg = avatar ? avatar.svg : `<svg viewBox="0 0 24 24" fill="white"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
      return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  getAvatarColor(id?: number): string {
      const avatarId = id !== undefined ? id : this.userProfile()?.avatarId;
      return this.funkyAvatars.find(a => a.id === avatarId)?.color || 'rgba(255,255,255,0.05)';
  }

  incrementTrackCount() {
    this.sessionTracksPlayed.update(v => v + 1);
  }

  getSessionPlaytime() {
    const minutes = Math.floor((Date.now() - this.sessionStartTime) / 60000);
    if (minutes < 60) return `${minutes}m`;
    return `${(minutes / 60).toFixed(1)}h`;
  }

  updateFunkyProfile(alias: string, avatarId: number) {
    const current = this.userProfile();
    const token = this.accessToken();
    if (current) {
        const updated = { ...current, alias, avatarId };
        this.userProfile.set(updated);
        localStorage.setItem(`melody_identity_${current.email}`, JSON.stringify({ alias, avatarId }));
        
        if (token) {
            this.saveToCloud(token, alias, avatarId);
        }
    }
  }

  login() {
    const scopes = [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/drive.appdata'
    ];
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${environment.googleClientId}&redirect_uri=${environment.googleRedirectUri}&response_type=token&scope=${encodeURIComponent(scopes.join(' '))}&prompt=consent`;
    window.location.href = url;
  }

  private async checkToken() {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        localStorage.setItem('melody_google_token', token);
        this.accessToken.set(token);
        window.history.replaceState({}, document.title, window.location.pathname);
        await this.fetchProfile(token);
      }
    } else {
        const savedToken = localStorage.getItem('melody_google_token');
        if (savedToken) {
            this.accessToken.set(savedToken);
            await this.fetchProfile(savedToken);
        }
    }
  }

  private async fetchProfile(token: string) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Auth failed');
      const data = await response.json();
      const email = data.email;
      
      this.cloudSyncStatus.set('pending');
      const cloudProfile = await this.syncFromCloud(token);
      
      let alias = cloudProfile?.alias || '';
      let avatarId = cloudProfile?.avatarId || 0;

      if (!cloudProfile) {
          const savedIdentity = localStorage.getItem(`melody_identity_${email}`);
          if (savedIdentity) {
              const parsed = JSON.parse(savedIdentity);
              alias = parsed.alias;
              avatarId = parsed.avatarId;
              this.saveToCloud(token, alias, avatarId);
          }
      }

      this.userProfile.set({
        name: data.given_name || data.name || 'Vasu',
        email: email,
        picture: data.picture,
        alias: alias,
        avatarId: avatarId
      });
    } catch (e) {
      this.accessToken.set(null);
      localStorage.removeItem('melody_google_token');
      this.cloudSyncStatus.set('error');
    }
  }

  private async syncFromCloud(token: string): Promise<{ alias: string, avatarId: number } | null> {
    try {
        const searchUrl = 'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D%27aether_profile.json%27';
        const searchRes = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (searchRes.status === 403) {
            this.cloudSyncStatus.set('missing_permission');
            return null;
        }

        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
            const fileId = searchData.files[0].id;
            const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (contentRes.ok) {
                this.cloudSyncStatus.set('active');
                return await contentRes.json();
            }
        } else {
            this.cloudSyncStatus.set('active'); // Connection works, just no file yet
        }
    } catch (e) {
        console.error('Cloud Sync Failed', e);
        this.cloudSyncStatus.set('error');
    }
    return null;
  }

  private async saveToCloud(token: string, alias: string, avatarId: number) {
    try {
        const searchUrl = 'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D%27aether_profile.json%27';
        const searchRes = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (searchRes.status === 403) {
            this.cloudSyncStatus.set('missing_permission');
            return;
        }

        const searchData = await searchRes.json();
        const content = JSON.stringify({ alias, avatarId });

        if (searchData.files && searchData.files.length > 0) {
            const fileId = searchData.files[0].id;
            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: content
            });
        } else {
            const metadata = JSON.stringify({
                name: 'aether_profile.json',
                parents: ['appDataFolder']
            });
            const boundary = 'foo_bar_baz';
            const multipartBody = 
                `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
                `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n` +
                `--${boundary}--`;

            await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`
                },
                body: multipartBody
            });
        }
        this.cloudSyncStatus.set('active');
    } catch (e) {
        console.error('Cloud Save Failed', e);
        this.cloudSyncStatus.set('error');
    }
  }

  getToken() { return this.accessToken(); }
  logout() { localStorage.removeItem('melody_google_token'); window.location.href = '/'; }
}
