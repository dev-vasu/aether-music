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
      const cached = localStorage.getItem(`melody_cache_v12_${query}`);
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
              localStorage.setItem(`melody_cache_v12_${query}`, JSON.stringify({ timestamp: Date.now(), data: liveTracks }));
            } catch {}
          }
          return liveTracks;
        }
      }
    } catch {
      // Serverless API not available
    }

    // 2. Fallback to rich curated official studio database
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
        { id: 'fHI8X4OXluQ', name: 'Blinding Lights', artists: [{ name: 'The Weeknd' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/03/2d/c1/032dc13a-dce4-672a-b501-d16d3b31be07/23UMGIM20988.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'L0X03zR0rQk', name: 'Levitating', artists: [{ name: 'Dua Lipa' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg' }] } },
        { id: 'kJQP7kiw5Fk', name: 'Despacito', artists: [{ name: 'Luis Fonsi' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e2/ef/f0/e2eff0bc-c51d-7de5-9280-6891ddcee71b/18UMGIM85289.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'hT_nvWreIhg', name: 'One Dance', artists: [{ name: 'Drake' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f2/0d/8b/f20d8bff-a927-ae98-6784-20a1f51cb23e/16UMGIM27642.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'yKNxeF4KMsY', name: 'Yellow', artists: [{ name: 'Coldplay' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/f5/93/8c/f5938c49-964c-31d1-4b33-78b634f71fb7/190295978075.jpg/600x600bb.jpg' }] } },
        { id: '4NRXx6U8ABQ', name: 'Starboy', artists: [{ name: 'The Weeknd' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'JGwWNGJdvx8', name: 'Shape of You', artists: [{ name: 'Ed Sheeran' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/15/e6/e8/15e6e8a4-4190-6a8b-86c3-ab4a51b88288/190295851286.jpg/600x600bb.jpg' }] } }
      ],
      hindi: [
        { id: 'BddP6PYo2gs', name: 'Kesariya', artists: [{ name: 'Arijit Singh & Pritam' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/9f/13/ca/9f13ca3b-e533-03e0-f19a-f0aaa774581d/196589311191.jpg/600x600bb.jpg' }] } },
        { id: 'h7GyfX_68T8', name: 'Raataan Lambiyan', artists: [{ name: 'Jubin Nautiyal' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/61/65/ae/6165aee9-8bb9-0bd4-02b0-5d0f1e6257a3/886449510238.jpg/600x600bb.jpg' }] } },
        { id: 'YxWlaYCA8MU', name: 'Tum Hi Ho', artists: [{ name: 'Arijit Singh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/bb/23/ee/bb23eeed-0c35-4f1d-2b11-485622777ae4/8902894353007_cover.jpg/600x600bb.jpg' }] } },
        { id: 'ElZfdU54Cp8', name: 'Apna Bana Le', artists: [{ name: 'Arijit Singh & Sachin-Jigar' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/2e/0b/c0/2e0bc070-112f-a827-6ad8-6bc64f7caaff/840214460180.png/600x600bb.jpg' }] } },
        { id: 'V7LwfY5U5WI', name: 'Chaleya', artists: [{ name: 'Arijit Singh & Anirudh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/1e/ff/32/1eff3216-190d-6fd9-8f68-acbba846e6ee/8903431956026_cover.jpg/600x600bb.jpg' }] } },
        { id: 'RLzC55ai0eo', name: 'Heeriye', artists: [{ name: 'Jasleen Royal & Arijit Singh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/f0/8c/2a/f08c2aeb-3903-8738-d0a5-8c2e4547eed7/5054197711039.jpg/600x600bb.jpg' }] } },
        { id: '6MgsHSAcI98', name: 'Tum Se Hi', artists: [{ name: 'Mohit Chauhan' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/3d/c7/43/3dc74387-e7f4-2342-397c-4cf2037c69a5/8902894623223_cover.jpg/600x600bb.jpg' }] } }
      ],
      english: [
        { id: 'yJg-Y5byMMw', name: 'As It Was', artists: [{ name: 'Harry Styles' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2a/19/fb/2a19fb85-2f70-9e44-f2a9-82abe679b88e/886449990061.jpg/600x600bb.jpg' }] } },
        { id: 'TUVcZfQe-Kw', name: 'Flowers', artists: [{ name: 'Miley Cyrus' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/8c/67/ff/8c67ff91-31c3-3fef-1884-ce3ec89f3af4/196589946874.jpg/600x600bb.jpg' }] } },
        { id: '0Vw-P_yA8Fk', name: 'Circles', artists: [{ name: 'Post Malone' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/7b/1b/1b/7b1b1b0b-7ce2-b223-f9e0-8e36abe51877/19UMGIM78325.rgb.jpg/600x600bb.jpg' }] } },
        { id: '7ysFgElQtjI', name: 'Birds of a Feather', artists: [{ name: 'Billie Eilish' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/600x600bb.jpg' }] } },
        { id: '2Vv-BfVoq4g', name: 'Perfect', artists: [{ name: 'Ed Sheeran' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/15/e6/e8/15e6e8a4-4190-6a8b-86c3-ab4a51b88288/190295851286.jpg/600x600bb.jpg' }] } }
      ],
      punjabi: [
        { id: 'cl0a3i2wDzQ', name: '295', artists: [{ name: 'Sidhu Moose Wala' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/97/69/58/976958ae-725e-bd41-6755-f0921c697840/810063889609_cover.jpg/600x600bb.jpg' }] } },
        { id: '3xkxA_f-jpc', name: 'Lover', artists: [{ name: 'Diljit Dosanjh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/8a/89/e4/8a89e445-d2c6-f8ac-a828-27818b0c1afe/859749638209_cover.jpg/600x600bb.jpg' }] } },
        { id: 'vX2cDW8LUWk', name: 'Proper Patola', artists: [{ name: 'Diljit Dosanjh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/a9/f7/b4/a9f7b4e7-6ec1-5c95-1d56-ec08e038ca5a/886447356036.jpg/600x600bb.jpg' }] } },
        { id: 'dCmp56tSSmA', name: 'Brown Munde', artists: [{ name: 'AP Dhillon & Gurinder Gill' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/26/a3/ac/26a3ac64-69e4-95ec-80ab-1f5a477537d2/859742042973_cover.jpg/600x600bb.jpg' }] } },
        { id: 'E07s5ZYygmg', name: 'Softly', artists: [{ name: 'Karan Aujla' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/d3/08/bc/d308bc6a-20e1-6532-d933-35d1b429210e/5054197755538.jpg/600x600bb.jpg' }] } }
      ],
      instaViral: [
        { id: 'vA8O09P5_zo', name: 'Metamorphosis', artists: [{ name: 'INTERWORLD' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b6/cf/d9/b6cfd931-53d8-4d61-f7e6-26938e5f1144/197190164596.jpg/600x600bb.jpg' }] } },
        { id: 'u_p0nN1FvRE', name: 'Midnight', artists: [{ name: 'PLAYAMANE' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/80/1b/ac/801baced-d29d-2843-63f1-4ff3aac3098b/196777410910.jpg/600x600bb.jpg' }] } },
        { id: 'rUf7yC_zJ-U', name: 'Sahara', artists: [{ name: 'Hensonn' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/a7/35/24/a73524b3-55b0-f54a-82d1-2dec22e76aab/197227375872.png/600x600bb.jpg' }] } },
        { id: 'mU_E3n9q7iY', name: 'Murder In My Mind', artists: [{ name: 'Kordhell' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/7a/de/1c/7ade1c79-db22-f0f1-6962-c390fa2c80f7/199999370628.png/600x600bb.jpg' }] } },
        { id: '6Dh-RL__uN4', name: 'Close Eyes', artists: [{ name: 'DVRST' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/f2/c9/7f/f2c97f51-f479-6036-ada1-f23bd60b160e/0.jpg/600x600bb.jpg' }] } }
      ],
      devotional: [
        { id: 'Hy55Ij78amM', name: 'Ramayan', artists: [{ name: 'Jagjit Singh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/10/98/8d/10988d3c-a1a7-ee3e-38b8-ac0d7fc3f021/8901854013258.jpg/600x600bb.jpg' }] } },
        { id: '5Eqb_-j3FDA', name: 'Pasoori', artists: [{ name: 'Ali Sethi & Shae Gill' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/f3/f9/06/f3f906c3-79d5-ac9a-5fdd-262048f955f9/cover.jpg/600x600bb.jpg' }] } },
        { id: '7d_hL0T3mDk', name: 'Tu Jhoom', artists: [{ name: 'Abida Parveen & Naseebo Lal' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/fa/82/17/fa8217ec-19e8-000f-4d60-851adb8de44a/cover.jpg/600x600bb.jpg' }] } },
        { id: '0_C_T3U8k5k', name: 'Afreen Afreen', artists: [{ name: 'Rahat Fateh Ali Khan & Momina' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music71/v4/95/ff/b0/95ffb0d1-ba72-767e-a4e4-6e7989524b03/190394811402.jpg/600x600bb.jpg' }] } },
        { id: 'ibpA4e6Lg4g', name: 'Kun Faya Kun', artists: [{ name: 'A.R. Rahman & Javed Ali' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/56/ac/41/56ac41f7-99f3-3eae-3b07-443167292c4e/8902894697408_cover.jpg/600x600bb.jpg' }] } },
        { id: 'A0pLe-f9EHA', name: 'Hanuman Chalisa', artists: [{ name: 'Hariharan' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/c5/3a/8d/c53a8d9b-23d8-5cc1-ec14-6ed0ce7920a0/8902894137256_cover.jpg/600x600bb.jpg' }] } }
      ]
    };
  }
}
