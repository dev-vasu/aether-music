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
  public gateDismissed = signal<boolean>(false);

  public funkyAvatars = [
    {
      id: 1,
      name: 'Monolith',
      subtitle: 'Resonance Prism',
      color: 'linear-gradient(135deg, #1f2026, #111215)',
      svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 6L54 18V46L32 58L10 46V18L32 6Z" fill="#1e2025" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/><path d="M32 6L54 18L32 30L10 18L32 6Z" fill="#292c34" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/><path d="M32 30V58L10 46V18L32 30Z" fill="#15171b"/><path d="M32 30L54 18V46L32 58V30Z" fill="#1b1d22"/><circle cx="32" cy="30" r="5" fill="#ff5722"/><path d="M32 20L44 26" stroke="#ff5722" stroke-width="2" stroke-linecap="round"/><path d="M32 40L44 34" stroke="#ff5722" stroke-width="2" stroke-linecap="round"/><path d="M32 48L44 42" stroke="rgba(255,87,34,0.5)" stroke-width="1.5" stroke-linecap="round"/></svg>`
    },
    {
      id: 2,
      name: 'Vinyl Stylus',
      subtitle: 'Microgroove Head',
      color: 'linear-gradient(135deg, #241d18, #130f0c)',
      svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="34" r="24" fill="#111215" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/><circle cx="30" cy="34" r="18" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"/><circle cx="30" cy="34" r="13" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"/><circle cx="30" cy="34" r="8" fill="#ff5722"/><circle cx="30" cy="34" r="3" fill="#ffffff"/><path d="M54 10L42 26L33 32" stroke="#e5e7eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="31" y="30" width="5" height="5" rx="1" transform="rotate(45 31 30)" fill="#ff5722"/><circle cx="54" cy="10" r="3.5" fill="#2a2b30" stroke="#ff5722" stroke-width="1.5"/></svg>`
    },
    {
      id: 3,
      name: 'Oscilloscope',
      subtitle: 'Cathode Waveform',
      color: 'linear-gradient(135deg, #152220, #0c1413)',
      svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="8" width="48" height="48" rx="8" fill="#111416" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/><line x1="32" y1="12" x2="32" y2="52" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><line x1="12" y1="32" x2="52" y2="32" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><path d="M16 32 C 16 16, 48 16, 48 32 C 48 48, 16 48, 16 32 Z" stroke="#ff5722" stroke-width="2.2" stroke-linecap="round"/><circle cx="32" cy="32" r="2.5" fill="#ffffff"/></svg>`
    },
    {
      id: 4,
      name: 'Tape Reel',
      subtitle: '15-IPS Master Hub',
      color: 'linear-gradient(135deg, #22232a, #131417)',
      svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="25" fill="#17181c" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/><path d="M32 14A18 18 0 0 0 16.4 41L24 37A9 9 0 0 1 32 23Z" fill="#25272e"/><path d="M47.6 41A18 18 0 0 0 32 14V23A9 9 0 0 1 40 37Z" fill="#25272e"/><path d="M16.4 41A18 18 0 0 0 47.6 41L40 37A9 9 0 0 1 24 37Z" fill="#25272e"/><circle cx="32" cy="32" r="8" fill="#ff5722"/><circle cx="32" cy="32" r="3" fill="#ffffff"/><circle cx="32" cy="18" r="1.5" fill="#ffffff"/><circle cx="20" cy="39" r="1.5" fill="#ffffff"/><circle cx="44" cy="39" r="1.5" fill="#ffffff"/></svg>`
    },
    {
      id: 5,
      name: 'Triode Valve',
      subtitle: 'Thermionic Tube',
      color: 'linear-gradient(135deg, #281c15, #140d09)',
      svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 10C22 7.8 23.8 6 26 6H38C40.2 6 42 7.8 42 10V46C42 48.2 40.2 50 38 50H26C23.8 50 22 48.2 22 46Z" fill="#141518" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/><rect x="25" y="50" width="14" height="6" rx="2" fill="#25272e"/><line x1="28" y1="56" x2="28" y2="60" stroke="#9ca3af" stroke-width="1.5"/><line x1="32" y1="56" x2="32" y2="60" stroke="#9ca3af" stroke-width="1.5"/><line x1="36" y1="56" x2="36" y2="60" stroke="#9ca3af" stroke-width="1.5"/><path d="M27 20H37V38H27Z" fill="rgba(255,87,34,0.12)" stroke="rgba(255,87,34,0.4)" stroke-width="1"/><path d="M30 16V40M34 16V40" stroke="#ff5722" stroke-width="1.8" stroke-linecap="round"/><circle cx="32" cy="28" r="3" fill="#ff7043"/></svg>`
    },
    {
      id: 6,
      name: 'Waveguide',
      subtitle: 'Acoustic Phase Lens',
      color: 'linear-gradient(135deg, #1c222b, #0f141a)',
      svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="25" fill="#15171b" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/><circle cx="32" cy="32" r="19" stroke="rgba(255,255,255,0.1)" stroke-width="1.2"/><circle cx="32" cy="32" r="13" stroke="rgba(255,255,255,0.1)" stroke-width="1.2"/><circle cx="32" cy="32" r="8" fill="#2b2d35" stroke="#ff5722" stroke-width="1.5"/><path d="M32 18V46M18 32H46" stroke="#ff5722" stroke-width="1.5" stroke-linecap="round"/><circle cx="32" cy="32" r="3" fill="#ff5722"/></svg>`
    },
    {
      id: 7,
      name: 'Transducer',
      subtitle: 'Spatial Matrix',
      color: 'linear-gradient(135deg, #241928, #120b15)',
      svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="14" width="36" height="36" rx="6" fill="#17181c" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/><rect x="22" y="22" width="20" height="20" rx="3" fill="#24262c" stroke="#ff5722" stroke-width="1.2"/><circle cx="32" cy="32" r="4" fill="#ff5722"/><line x1="32" y1="8" x2="32" y2="14" stroke="#ff5722" stroke-width="2" stroke-linecap="round"/><line x1="32" y1="50" x2="32" y2="56" stroke="#ff5722" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="32" x2="14" y2="32" stroke="#ff5722" stroke-width="2" stroke-linecap="round"/><line x1="50" y1="32" x2="56" y2="32" stroke="#ff5722" stroke-width="2" stroke-linecap="round"/></svg>`
    },
    {
      id: 8,
      name: 'Diaphragm',
      subtitle: 'Gold Condenser',
      color: 'linear-gradient(135deg, #272115, #14110a)',
      svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="25" fill="#191713" stroke="#f59e0b" stroke-width="1.5"/><circle cx="32" cy="32" r="21" stroke="rgba(245,158,11,0.3)" stroke-width="1.2" stroke-dasharray="2 3"/><circle cx="32" cy="32" r="14" fill="#282215" stroke="#f59e0b" stroke-width="1.5"/><circle cx="32" cy="32" r="5" fill="#ff5722"/><circle cx="32" cy="32" r="2" fill="#ffffff"/><circle cx="21" cy="21" r="1.5" fill="#f59e0b"/><circle cx="43" cy="21" r="1.5" fill="#f59e0b"/><circle cx="21" cy="43" r="1.5" fill="#f59e0b"/><circle cx="43" cy="43" r="1.5" fill="#f59e0b"/></svg>`
    },
    {
      id: 9,
      name: 'Acoustic Horn',
      subtitle: 'Fibonacci Spiral',
      color: 'linear-gradient(135deg, #1b2520, #0d1410)',
      svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="25" fill="#141816" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/><path d="M32 10C44.15 10 54 19.85 54 32C54 44.15 44.15 54 32 54C22.06 54 14 45.94 14 36C14 27.72 20.72 21 29 21C35.63 21 41 26.37 41 33C41 38.52 36.52 43 31 43C26.58 43 23 39.42 23 35C23 31.69 25.69 29 29 29C31.21 29 33 30.79 33 33" stroke="#10b981" stroke-width="2.2" stroke-linecap="round"/><circle cx="33" cy="33" r="2" fill="#ff5722"/></svg>`
    },
    {
      id: 10,
      name: 'Master Core',
      subtitle: 'Knurled Rotary Crown',
      color: 'linear-gradient(135deg, #2a221f, #15100e)',
      svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="26" fill="#1e1f24" stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/><circle cx="32" cy="32" r="21" stroke="rgba(255,87,34,0.4)" stroke-width="1.2" stroke-dasharray="3 3"/><circle cx="32" cy="32" r="16" fill="#282a32" stroke="rgba(255,255,255,0.15)" stroke-width="1.2"/><circle cx="32" cy="32" r="9" fill="#141518" stroke="#ff5722" stroke-width="1.5"/><circle cx="32" cy="32" r="4" fill="#ff5722"/><circle cx="32" cy="32" r="1.5" fill="#ffffff"/><line x1="32" y1="7" x2="32" y2="10" stroke="#ff5722" stroke-width="2" stroke-linecap="round"/></svg>`
    }
  ];

  public sessionTracksPlayed = signal<number>(0);
  public sessionStartTime = Date.now();

  constructor() {
    this.checkToken();
  }

  dismissGate() {
    this.gateDismissed.set(true);
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

  getAvatarMeta(id?: number): { name: string; subtitle: string } {
      const avatarId = id !== undefined ? id : this.userProfile()?.avatarId;
      const avatar = this.funkyAvatars.find(a => a.id === avatarId);
      return {
          name: avatar ? avatar.name : 'Acoustic Node',
          subtitle: avatar ? avatar.subtitle : 'Standard Entity'
      };
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
    if (typeof window === 'undefined') return;
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
        const savedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('melody_google_token') : null;
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

      if (!cloudProfile && typeof localStorage !== 'undefined') {
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
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('melody_google_token');
      }
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
  logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('melody_google_token');
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }
}
