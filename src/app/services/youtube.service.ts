import { Injectable, signal, inject } from '@angular/core';
import { environment } from '../../environments/environment';

declare var YT: any;

export interface SearchOptions {
  useCache?: boolean;
  isUserSearch?: boolean;
  type?: 'video' | 'playlist';
  maxResults?: number;
}

@Injectable({
  providedIn: 'root'
})
export class YoutubeService {
  private player: any;
  public isPlayerReady = signal(false);
  public apiError = signal<string | null>(null);
  
  // Public for debugging
  public activeKeyHint = signal<string>('N/A');
  private useBackupKey = false;
  private previewAudio: HTMLAudioElement | null = null;

  constructor() {
    this.loadApi();
  }

  private loadApi() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if ((window as any).YT && (window as any).YT.Player) {
      this.isPlayerReady.set(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const scripts = document.getElementsByTagName('script');
    if (scripts.length > 0 && scripts[0].parentNode) {
      scripts[0].parentNode.insertBefore(tag, scripts[0]);
    } else if (document.head) {
      document.head.appendChild(tag);
    } else if (document.body) {
      document.body.appendChild(tag);
    }

    (window as any).onYouTubeIframeAPIReady = () => {
      this.isPlayerReady.set(true);
    };
  }

  initPlayer(elementId: string, videoId: string, onStateChange: (state: any) => void) {
    if (!this.isPlayerReady() || typeof YT === 'undefined' || !YT.Player) return;
    try {
      this.player = new YT.Player(elementId, {
        height: '360', 
        width: '640',
        videoId: videoId,
        playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, origin: typeof window !== 'undefined' ? window.location.origin : '', mute: 0, enablejsapi: 1 },
        events: {
          onReady: (event: any) => { event.target.unMute(); if (videoId) event.target.playVideo(); },
          onStateChange: (event: any) => onStateChange(event.data)
        }
      });
    } catch (e) {
      console.warn('YouTube Player initialization postponed or failed:', e);
    }
  }

  async playVideo(trackOrId: any) {
    let videoId = typeof trackOrId === 'string' ? trackOrId : trackOrId?.id;
    const track = typeof trackOrId === 'object' ? trackOrId : null;

    // Check if we need to resolve a YouTube ID for an iTunes official song
    if (!videoId || videoId.startsWith('itunes_') || videoId.length !== 11) {
      const q = track ? `${track.artists?.[0]?.name || ''} ${track.name}` : videoId;
      
      // Start instantaneous preview playback for 0ms latency
      if (track?.previewUrl && typeof window !== 'undefined') {
        this.playPreviewAudio(track.previewUrl);
      }

      try {
        const res = await fetch(`/api/resolve?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.id) {
            videoId = json.id;
          }
        }
      } catch (err) {
        console.warn('Resolution notice:', err);
      }
    }

    if (this.player && this.player.loadVideoById && videoId && videoId.length === 11) {
      this.stopPreviewAudio();
      this.player.loadVideoById(videoId);
      this.player.unMute();
      this.player.playVideo();
    }
  }

  playPreviewAudio(url: string) {
    if (typeof window === 'undefined') return;
    this.stopPreviewAudio();
    try {
      this.previewAudio = new Audio(url);
      this.previewAudio.play().catch(() => {});
    } catch {}
  }

  stopPreviewAudio() {
    if (this.previewAudio) {
      try {
        this.previewAudio.pause();
        this.previewAudio = null;
      } catch {}
    }
  }

  unMute() {
    if (this.player && this.player.unMute) this.player.unMute();
    if (this.previewAudio) this.previewAudio.muted = false;
  }

  pause() {
    if (this.player && this.player.pauseVideo) this.player.pauseVideo();
    if (this.previewAudio) this.previewAudio.pause();
  }

  resume() {
    if (this.player && this.player.playVideo) {
      this.player.unMute();
      this.player.playVideo();
    }
    if (this.previewAudio) this.previewAudio.play().catch(() => {});
  }

  setVolume(volume: number) {
    if (this.player && this.player.setVolume) {
      this.player.unMute();
      this.player.setVolume(volume);
    }
    if (this.previewAudio) this.previewAudio.volume = Math.max(0, Math.min(1, volume / 100));
  }

  getCurrentTime() {
    if (this.previewAudio && !this.previewAudio.paused) {
      return this.previewAudio.currentTime;
    }
    return (this.player && this.player.getCurrentTime) ? this.player.getCurrentTime() : 0;
  }

  getDuration() {
    if (this.previewAudio && !this.previewAudio.paused && this.previewAudio.duration) {
      return this.previewAudio.duration;
    }
    return (this.player && this.player.getDuration) ? this.player.getDuration() : 0;
  }

  seekTo(seconds: number) {
    if (this.previewAudio && !this.previewAudio.paused) {
      this.previewAudio.currentTime = seconds;
    }
    if (this.player && this.player.seekTo) this.player.seekTo(seconds, true);
  }

  async searchMusic(query: string, options: SearchOptions = {}): Promise<any[]> {
    this.apiError.set(null);
    const { useCache = false, isUserSearch = false, maxResults = 15 } = options;

    if (!query) query = 'trending hits 2026';
    
    if (useCache && typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`melody_cache_${query}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 86400000 && parsed.data?.length > 0) {
            return parsed.data;
          }
        } catch {}
      }
    }

    // 1. Try our official iTunes-powered unified serverless endpoint /api/search
    try {
      const apiEndpoint = `/api/search?q=${encodeURIComponent(query)}&limit=${maxResults}`;
      const response = await fetch(apiEndpoint);
      if (response.ok) {
        const liveTracks = await response.json();
        if (Array.isArray(liveTracks) && liveTracks.length > 0) {
          if (useCache && typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem(`melody_cache_${query}`, JSON.stringify({ timestamp: Date.now(), data: liveTracks }));
            } catch {}
          }
          return liveTracks;
        }
      }
    } catch {
      // Serverless API not available
    }

    // 2. Fallback to rich curated cosmic database with smart query filtering
    const curated = this.getCuratedMockData();
    const qLower = query.toLowerCase().trim();
    const allCurated = Object.values(curated).flat();

    if (isUserSearch) {
      const matches = allCurated.filter(t => 
        t.name.toLowerCase().includes(qLower) || 
        t.artists.some((a: any) => a.name.toLowerCase().includes(qLower))
      );
      if (matches.length > 0) return matches;
      return [...curated.trending, ...curated.instaViral];
    }

    return curated.trending;
  }

  getCuratedMockData() {
    return {
      trending: [
        { id: 'fHI8X4OXluQ', name: 'Blinding Lights', artists: [{ name: 'The Weeknd' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/6f/bc/e6/6fbce6c4-c38c-72d8-4fd0-66cfff32f679/20UMGIM12176.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'L0X03zR0rQk', name: 'Levitating', artists: [{ name: 'Dua Lipa' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/c3/65/5d/c3655d88-8422-92a0-4ff6-99cf16c7f893/190295286101.jpg/600x600bb.jpg' }] } },
        { id: 'kJQP7kiw5Fk', name: 'Despacito', artists: [{ name: 'Luis Fonsi' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/05/cf/43/05cf43fa-0941-0dc5-a92c-e3a5cb48ef4e/00602557672522.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'hT_nvWreIhg', name: 'One Dance', artists: [{ name: 'Drake' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/2e/f1/87/2ef1879c-7e28-1ef9-813c-0e86b2067746/00602547940259.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'yKNxeF4KMsY', name: 'Yellow', artists: [{ name: 'Coldplay' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/48/2e/0e/482e0e0f-90be-d67b-117d-2b4cf6179069/0724352778351_1400.jpg/600x600bb.jpg' }] } },
        { id: '4NRXx6U8ABQ', name: 'Starboy', artists: [{ name: 'The Weeknd' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/09/a4/0c/09a40c6c-9dd6-0397-400e-26fce7c0f1b2/16UMGIM56475.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'JGwWNGJdvx8', name: 'Shape of You', artists: [{ name: 'Ed Sheeran' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/bf/25/7f/bf257f86-cf26-e41c-ffc7-fb1ff993e35a/190295851286.jpg/600x600bb.jpg' }] } }
      ],
      hindi: [
        { id: 'BddP6PYo2gs', name: 'Kesariya', artists: [{ name: 'Arijit Singh & Pritam' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/9f/13/ca/9f13ca3b-e533-03e0-f19a-f0aaa774581d/196589311191.jpg/600x600bb.jpg' }] } },
        { id: 'h7GyfX_68T8', name: 'Raataan Lambiyan', artists: [{ name: 'Jubin Nautiyal' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/2b/ef/c7/2befc7d0-1cfa-7c9b-ae7c-d3beec3c21a1/8902894360340.jpg/600x600bb.jpg' }] } },
        { id: 'YxWlaYCA8MU', name: 'Tum Hi Ho', artists: [{ name: 'Arijit Singh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/28/67/68/286768ec-3162-d278-f32a-592f6b3cfc73/8902894354028.jpg/600x600bb.jpg' }] } },
        { id: 'ElZfdU54Cp8', name: 'Apna Bana Le', artists: [{ name: 'Arijit Singh & Sachin-Jigar' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/64/00/6f/64006f1d-ee25-cb28-66ea-576f621142dc/196589578136.jpg/600x600bb.jpg' }] } },
        { id: 'V7LwfY5U5WI', name: 'Chaleya', artists: [{ name: 'Arijit Singh & Anirudh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/8e/3c/6f/8e3c6f4e-2895-ec58-1549-fb5ffea7a2d4/859754160498_cover.jpg/600x600bb.jpg' }] } },
        { id: 'RLzC55ai0eo', name: 'Heeriye', artists: [{ name: 'Jasleen Royal & Arijit Singh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/c2/f7/a2/c2f7a220-feef-eb83-e18e-49bca0217ec2/197189033322.jpg/600x600bb.jpg' }] } },
        { id: '6MgsHSAcI98', name: 'Tum Se Hi', artists: [{ name: 'Mohit Chauhan' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/06/f0/a5/06f0a5fb-3914-7221-50e5-79776f849a62/8902894350129.jpg/600x600bb.jpg' }] } }
      ],
      english: [
        { id: 'yJg-Y5byMMw', name: 'As It Was', artists: [{ name: 'Harry Styles' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/c5/4b/31/c54b31a3-2d57-3f8d-4f15-373d58ef8a94/196589031129.jpg/600x600bb.jpg' }] } },
        { id: 'TUVcZfQe-Kw', name: 'Flowers', artists: [{ name: 'Miley Cyrus' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b9/be/ba/b9beba85-f1c9-7df9-6b54-fc94a02be042/196589781666.jpg/600x600bb.jpg' }] } },
        { id: '0Vw-P_yA8Fk', name: 'Circles', artists: [{ name: 'Post Malone' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/7e/3e/d6/7e3ed6eb-9566-5085-3bc4-f31627c2f0f4/19UMGIM81561.rgb.jpg/600x600bb.jpg' }] } },
        { id: '7ysFgElQtjI', name: 'Birds of a Feather', artists: [{ name: 'Billie Eilish' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/21/df/f2/21dff225-78e7-ff1b-05b0-2b102ce85c5c/24UMGIM35308.rgb.jpg/600x600bb.jpg' }] } },
        { id: '2Vv-BfVoq4g', name: 'Perfect', artists: [{ name: 'Ed Sheeran' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/bf/25/7f/bf257f86-cf26-e41c-ffc7-fb1ff993e35a/190295851286.jpg/600x600bb.jpg' }] } }
      ],
      punjabi: [
        { id: 'cl0a3i2wDzQ', name: '295', artists: [{ name: 'Sidhu Moose Wala' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/8e/3c/6f/8e3c6f4e-2895-ec58-1549-fb5ffea7a2d4/859754160498_cover.jpg/600x600bb.jpg' }] } },
        { id: '3xkxA_f-jpc', name: 'Lover', artists: [{ name: 'Diljit Dosanjh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/8a/89/e4/8a89e445-d2c6-f8ac-a828-27818b0c1afe/859749638209_cover.jpg/600x600bb.jpg' }] } },
        { id: 'vX2cDW8LUWk', name: 'Proper Patola', artists: [{ name: 'Diljit Dosanjh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music6/v4/f7/a7/67/f7a7674d-c12e-13c5-f855-6e5a40b92395/8902894356022.jpg/600x600bb.jpg' }] } },
        { id: 'dCmp56tSSmA', name: 'Brown Munde', artists: [{ name: 'AP Dhillon & Gurinder Gill' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/83/c9/48/83c94806-ea78-ba61-ec46-5e263d91653e/859742467363_cover.jpg/600x600bb.jpg' }] } },
        { id: 'E07s5ZYygmg', name: 'Softly', artists: [{ name: 'Karan Aujla' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/cb/aa/24/cbaa247c-783b-e448-f58c-bb0f339cf0c9/197189196324.jpg/600x600bb.jpg' }] } }
      ],
      instaViral: [
        { id: 'vA8O09P5_zo', name: 'Metamorphosis', artists: [{ name: 'INTERWORLD' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/85/6f/52/856f5223-2895-c9fc-0777-a8fe8b108253/196626574718.jpg/600x600bb.jpg' }] } },
        { id: 'u_p0nN1FvRE', name: 'Midnight', artists: [{ name: 'PLAYAMANE' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/4a/1c/ca/4a1cca9c-ce1a-a068-12c5-7f9cf0f69a5e/196925574718.jpg/600x600bb.jpg' }] } },
        { id: 'rUf7yC_zJ-U', name: 'Sahara', artists: [{ name: 'Hensonn' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/19/52/a9/1952a975-f716-e42a-a92c-e3a5cb48ef4e/196626359551.jpg/600x600bb.jpg' }] } },
        { id: 'mU_E3n9q7iY', name: 'Murder In My Mind', artists: [{ name: 'Kordhell' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/f6/d8/1b/f6d81bc8-52ae-51fa-ef36-c0d1c47ea4e4/5056495449767.1.jpg/600x600bb.jpg' }] } },
        { id: '6Dh-RL__uN4', name: 'Close Eyes', artists: [{ name: 'DVRST' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c3/91/9f/c3919f44-8d48-7019-f55a-e713589b4334/196292552880.jpg/600x600bb.jpg' }] } }
      ],
      devotional: [
        { id: 'Hy55Ij78amM', name: 'Ramayan', artists: [{ name: 'Jagjit Singh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/10/98/8d/10988d3c-a1a7-ee3e-38b8-ac0d7fc3f021/8901854013258.jpg/600x600bb.jpg' }] } },
        { id: '5Eqb_-j3FDA', name: 'Pasoori', artists: [{ name: 'Ali Sethi & Shae Gill' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/a5/d8/4a/a5d84a77-33e1-e1cb-a034-782163b78f44/196626359551.jpg/600x600bb.jpg' }] } },
        { id: '7d_hL0T3mDk', name: 'Tu Jhoom', artists: [{ name: 'Abida Parveen & Naseebo Lal' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/e5/ee/3f/e5ee3fc7-ce16-c77c-a495-2015fa1dbe2a/196626574718.jpg/600x600bb.jpg' }] } },
        { id: '0_C_T3U8k5k', name: 'Afreen Afreen', artists: [{ name: 'Rahat Fateh Ali Khan & Momina' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music62/v4/e0/75/ca/e075caa9-79c2-ad7a-f604-0ee2169eb74b/886446115982.jpg/600x600bb.jpg' }] } },
        { id: 'ibpA4e6Lg4g', name: 'Kun Faya Kun', artists: [{ name: 'A.R. Rahman & Javed Ali' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/6b/c4/86/6bc486fa-ec66-a496-c4e9-11ba107b32c6/8902894353458.jpg/600x600bb.jpg' }] } },
        { id: 'A0pLe-f9EHA', name: 'Hanuman Chalisa', artists: [{ name: 'Hariharan' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/82/12/a1/8212a106-7074-ba4f-2307-4597e035eba9/8902633118553.jpg/600x600bb.jpg' }] } }
      ]
    };
  }
}
