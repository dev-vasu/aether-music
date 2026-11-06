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
  private pendingVideoId: string | null = null;
  private pendingQuery: string | null = null;

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
          onReady: (event: any) => { 
            event.target.unMute(); 
            if (this.pendingVideoId) {
              event.target.loadVideoById(this.pendingVideoId);
              event.target.playVideo();
              this.pendingVideoId = null;
            } else if (this.pendingQuery) {
              event.target.loadPlaylist({ listType: 'search', list: this.pendingQuery });
              this.pendingQuery = null;
            } else if (videoId) {
              event.target.playVideo();
            }
          },
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
    const q = track ? `${track.artists?.[0]?.name || ''} ${track.name}`.trim() : (videoId || '');

    // Resolve YouTube full video ID for iTunes tracks
    if (!videoId || videoId.startsWith('itunes_') || videoId.length !== 11) {
      try {
        const res = await fetch(`/api/resolve?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.id && json.id.length === 11) {
            videoId = json.id;
          }
        }
      } catch (err) {
        console.warn('Resolution notice:', err);
      }
    }

    if (this.player && this.player.loadVideoById && videoId && videoId.length === 11) {
      this.player.loadVideoById(videoId);
      this.player.unMute();
      this.player.playVideo();
    } else if (this.player && this.player.loadPlaylist && q) {
      // Guaranteed full song playback using embedded search playlist
      this.player.loadPlaylist({
        listType: 'search',
        list: `${q} official audio`
      });
      this.player.unMute();
    } else {
      if (videoId && videoId.length === 11) {
        this.pendingVideoId = videoId;
      } else if (q) {
        this.pendingQuery = `${q} official audio`;
      }
    }
  }

  unMute() {
    if (this.player && this.player.unMute) this.player.unMute();
  }

  pause() {
    if (this.player && this.player.pauseVideo) this.player.pauseVideo();
  }

  resume() {
    if (this.player && this.player.playVideo) {
      this.player.unMute();
      this.player.playVideo();
    }
  }

  setVolume(volume: number) {
    if (this.player && this.player.setVolume) {
      this.player.unMute();
      this.player.setVolume(volume);
    }
  }

  getCurrentTime(): number {
    return (this.player && this.player.getCurrentTime) ? this.player.getCurrentTime() : 0;
  }

  getDuration(): number {
    return (this.player && this.player.getDuration) ? this.player.getDuration() : 0;
  }

  seekTo(seconds: number) {
    if (this.player && this.player.seekTo) this.player.seekTo(seconds, true);
  }

  async searchMusic(query: string, options: SearchOptions = {}): Promise<any[]> {
    this.apiError.set(null);
    const { useCache = false, isUserSearch = false, maxResults = 15 } = options;

    if (!query) query = 'trending hits 2026';
    
    if (useCache && typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`melody_cache_v13_${query}`);
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
              localStorage.setItem(`melody_cache_v13_${query}`, JSON.stringify({ timestamp: Date.now(), data: liveTracks }));
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

  async getCategorizedHomeMusic(): Promise<any> {
    try {
      // Dynamic timestamp guarantees fresh multi-artist rotations on refresh/reload
      const res = await fetch(`/api/home?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const requiredCategories = ['trending', 'hindi', 'english', 'punjabi', 'instaViral', 'devotional'];
        const isValid = requiredCategories.every(cat => Array.isArray(data[cat]) && data[cat].length >= 3);
        if (isValid) {
          return data;
        }
      }
    } catch (e) {
      console.warn('API /api/home unavailable or offline, activating curated multi-artist catalogue:', e);
    }
    return this.getCuratedMockData();
  }

  getCuratedMockData() {
    const rawData = {
      trending: [
        { id: 'fHI8X4OXluQ', name: 'Blinding Lights', artists: [{ name: 'The Weeknd' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/03/2d/c1/032dc13a-dce4-672a-b501-d16d3b31be07/23UMGIM20988.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'L0X03zR0rQk', name: 'Levitating', artists: [{ name: 'Dua Lipa' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg' }] } },
        { id: 'yKNxeF4KMsY', name: 'Yellow', artists: [{ name: 'Coldplay' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/f5/93/8c/f5938c49-964c-31d1-4b33-78b634f71fb7/190295978075.jpg/600x600bb.jpg' }] } },
        { id: 'UqyT8IEBkvY', name: '24K Magic', artists: [{ name: 'Bruno Mars' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/79/11/b0/7911b0fb-7788-b77e-2ee7-25e1358c2f1f/075679901460.jpg/600x600bb.jpg' }] } },
        { id: 'hT_nvWreIhg', name: 'One Dance', artists: [{ name: 'Drake' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f2/0d/8b/f20d8bff-a927-ae98-6784-20a1f51cb23e/16UMGIM27642.rgb.jpg/600x600bb.jpg' }] } },
        { id: '0Vw-P_yA8Fk', name: 'Circles', artists: [{ name: 'Post Malone' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/7b/1b/1b/7b1b1b0b-7ce2-b223-f9e0-8e36abe51877/19UMGIM78325.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'ic8j13piAhQ', name: 'Cruel Summer', artists: [{ name: 'Taylor Swift' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/5b/4b/36/5b4b360f-e683-11ef-7e04-c36195861aa8/19UMGIM53909.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'JGwWNGJdvx8', name: 'Shape of You', artists: [{ name: 'Ed Sheeran' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/15/e6/e8/15e6e8a4-4190-6a8b-86c3-ab4a51b88288/190295851286.jpg/600x600bb.jpg' }] } }
      ],
      hindi: [
        { id: 'BddP6PYo2gs', name: 'Kesariya', artists: [{ name: 'Pritam & Arijit Singh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/9f/13/ca/9f13ca3b-e533-03e0-f19a-f0aaa774581d/196589311191.jpg/600x600bb.jpg' }] } },
        { id: 'zRtPUIumXcY', name: 'Deewani Mastani', artists: [{ name: 'Shreya Ghoshal' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/33/c9/29/33c929a7-4b77-cfc4-e69c-cb14cfc96e24/886445612660.jpg/600x600bb.jpg' }] } },
        { id: 'x_7fR972b2o', name: 'Pehli Nazar Mein', artists: [{ name: 'Atif Aslam' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/09/b8/0a/09b80a1c-92b4-e460-705b-80126a1ca4d6/8902894611596_cover.jpg/600x600bb.jpg' }] } },
        { id: '6MgsHSAcI98', name: 'Tum Se Hi', artists: [{ name: 'Mohit Chauhan' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/3d/c7/43/3dc74387-e7f4-2342-397c-4cf2037c69a5/8902894623223_cover.jpg/600x600bb.jpg' }] } },
        { id: 'qFkNATtc3mc', name: 'Ghungroo', artists: [{ name: 'Vishal-Shekhar' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/e0/b3/ef/e0b3efb9-4a9f-3ef8-be7f-6872fa9982fb/8902894356497_cover.jpg/600x600bb.jpg' }] } },
        { id: 'ElZfdU54Cp8', name: 'Apna Bana Le', artists: [{ name: 'Sachin-Jigar & Arijit Singh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/2e/0b/c0/2e0bc070-112f-a827-6ad8-6bc64f7caaff/840214460180.png/600x600bb.jpg' }] } },
        { id: 'h7GyfX_68T8', name: 'Raataan Lambiyan', artists: [{ name: 'Jubin Nautiyal' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/61/65/ae/6165aee9-8bb9-0bd4-02b0-5d0f1e6257a3/886449510238.jpg/600x600bb.jpg' }] } },
        { id: 'g0eO74NUQBs', name: 'Kal Ho Naa Ho', artists: [{ name: 'Sonu Nigam' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/0d/99/3a/0d993af1-2fe6-7cf7-8dbd-a16f39d22497/886444053914.jpg/600x600bb.jpg' }] } },
        { id: 'dZ0fwJojhrs', name: 'Zara Sa', artists: [{ name: 'KK' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/67/68/d8/6768d83d-3df7-b3f7-df2b-c85e2b028678/886444054041.jpg/600x600bb.jpg' }] } }
      ],
      english: [
        { id: '7ysFgElQtjI', name: 'Birds of a Feather', artists: [{ name: 'Billie Eilish' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'eVli-tFD36Q', name: 'Espresso', artists: [{ name: 'Sabrina Carpenter' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/90/e5/2d/90e52dd0-ec27-b586-3dd2-8eb1297e68ee/24UMGIM41843.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'yJg-Y5byMMw', name: 'As It Was', artists: [{ name: 'Harry Styles' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2a/19/fb/2a19fb85-2f70-9e44-f2a9-82abe679b88e/886449990061.jpg/600x600bb.jpg' }] } },
        { id: 'GZ3zL7kT6_c', name: 'Lose Control', artists: [{ name: 'Teddy Swims' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/36/ae/ea/36aeea6a-04ae-1614-b153-659f1311b5ee/093624855798.jpg/600x600bb.jpg' }] } },
        { id: 'ZlJq_w7-WbE', name: 'Vampire', artists: [{ name: 'Olivia Rodrigo' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/a4/09/b6/a409b6ce-b778-8314-b9aa-7822d56a076d/23UMGIM70020.rgb.jpg/600x600bb.jpg' }] } },
        { id: 'TUVcZfQe-Kw', name: 'Flowers', artists: [{ name: 'Miley Cyrus' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/8c/67/ff/8c67ff91-31c3-3fef-1884-ce3ec89f3af4/196589946874.jpg/600x600bb.jpg' }] } },
        { id: '1KzFlCNrS2U', name: 'Good Luck, Babe!', artists: [{ name: 'Chappell Roan' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/c3/ef/11/c3ef11ba-b258-294c-fe84-a169992c6e61/24UM1IM02484.rgb.jpg/600x600bb.jpg' }] } }
      ],
      punjabi: [
        { id: 'cl0a3i2wDzQ', name: '295', artists: [{ name: 'Sidhu Moose Wala' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/97/69/58/976958ae-725e-bd41-6755-f0921c697840/810063889609_cover.jpg/600x600bb.jpg' }] } },
        { id: '3xkxA_f-jpc', name: 'Lover', artists: [{ name: 'Diljit Dosanjh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/8a/89/e4/8a89e445-d2c6-f8ac-a828-27818b0c1afe/859749638209_cover.jpg/600x600bb.jpg' }] } },
        { id: 'E07s5ZYygmg', name: 'Softly', artists: [{ name: 'Karan Aujla' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/d3/08/bc/d308bc6a-20e1-6532-d933-35d1b429210e/5054197755538.jpg/600x600bb.jpg' }] } },
        { id: 'dCmp56tSSmA', name: 'Brown Munde', artists: [{ name: 'AP Dhillon & Gurinder Gill' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/26/a3/ac/26a3ac64-69e4-95ec-80ab-1f5a477537d2/859742042973_cover.jpg/600x600bb.jpg' }] } },
        { id: '4tywp83zkmk', name: 'Cheques', artists: [{ name: 'Shubh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/4a/5b/4b/4a5b4ba5-c40d-d419-74d1-4eeef34b455b/859772877521_cover.jpg/600x600bb.jpg' }] } },
        { id: 'ZssA_b0dffc', name: 'Filhall', artists: [{ name: 'B Praak' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/7c/18/d5/7c18d533-333e-e6a3-f09b-61019a897e93/8903431776518_cover.jpg/600x600bb.jpg' }] } },
        { id: 'f0uWvJq2L_0', name: 'Judaa', artists: [{ name: 'Amrinder Gill' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/4e/4f/98/4e4f9811-1e96-a88a-faec-33671f76ca09/886443419995.jpg/600x600bb.jpg' }] } },
        { id: 'dZ_v7G_vTfs', name: 'Kya Baat Ay', artists: [{ name: 'Harrdy Sandhu' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/a5/d7/a7/a5d7a7ff-4e76-3cf1-97b7-506be55b77ee/886447285640.jpg/600x600bb.jpg' }] } }
      ],
      instaViral: [
        { id: 'vA8O09P5_zo', name: 'Metamorphosis', artists: [{ name: 'INTERWORLD' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b6/cf/d9/b6cfd931-53d8-4d61-f7e6-26938e5f1144/197190164596.jpg/600x600bb.jpg' }] } },
        { id: 'mU_E3n9q7iY', name: 'Murder In My Mind', artists: [{ name: 'Kordhell' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/7a/de/1c/7ade1c79-db22-f0f1-6962-c390fa2c80f7/199999370628.png/600x600bb.jpg' }] } },
        { id: '6Dh-RL__uN4', name: 'Close Eyes', artists: [{ name: 'DVRST' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/f2/c9/7f/f2c97f51-f479-6036-ada1-f23bd60b160e/0.jpg/600x600bb.jpg' }] } },
        { id: 'rUf7yC_zJ-U', name: 'Sahara', artists: [{ name: 'Hensonn' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/a7/35/24/a73524b3-55b0-f54a-82d1-2dec22e76aab/197227375872.png/600x600bb.jpg' }] } },
        { id: 'u_p0nN1FvRE', name: 'Midnight', artists: [{ name: 'PLAYAMANE' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/80/1b/ac/801baced-d29d-2843-63f1-4ff3aac3098b/196777410910.jpg/600x600bb.jpg' }] } },
        { id: 'x_79A57c6bU', name: 'Cowbell Goth', artists: [{ name: 'SXMPRA' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/d9/3d/8c/d93d8ce3-4f93-c918-0955-e4ea511c5e9f/196871032179.jpg/600x600bb.jpg' }] } }
      ],
      devotional: [
        { id: 'Hy55Ij78amM', name: 'Hey Ram', artists: [{ name: 'Jagjit Singh' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/10/98/8d/10988d3c-a1a7-ee3e-38b8-ac0d7fc3f021/8901854013258.jpg/600x600bb.jpg' }] } },
        { id: 'ibpA4e6Lg4g', name: 'Kun Faya Kun', artists: [{ name: 'A.R. Rahman & Javed Ali' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/56/ac/41/56ac41f7-99f3-3eae-3b07-443167292c4e/8902894697408_cover.jpg/600x600bb.jpg' }] } },
        { id: '0_C_T3U8k5k', name: 'Afreen Afreen', artists: [{ name: 'Rahat Fateh Ali Khan & Momina' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music71/v4/95/ff/b0/95ffb0d1-ba72-767e-a4e4-6e7989524b03/190394811402.jpg/600x600bb.jpg' }] } },
        { id: 'A0pLe-f9EHA', name: 'Hanuman Chalisa', artists: [{ name: 'Hariharan' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/c5/3a/8d/c53a8d9b-23d8-5cc1-ec14-6ed0ce7920a0/8902894137256_cover.jpg/600x600bb.jpg' }] } },
        { id: '7d_hL0T3mDk', name: 'Tu Jhoom', artists: [{ name: 'Abida Parveen & Naseebo Lal' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/fa/82/17/fa8217ec-19e8-000f-4d60-851adb8de44a/cover.jpg/600x600bb.jpg' }] } },
        { id: '8K0Z828WfXU', name: 'Dam Mast Qalandar', artists: [{ name: 'Nusrat Fateh Ali Khan' }], album: { images: [{ url: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/55/96/9c/55969c3a-21e1-e940-1ec6-ec1469e71ce4/5016958043621.jpg/600x600bb.jpg' }] } }
      ]
    };

    // Rotate lists slightly so even fallback mock changes order dynamically on reload
    const rotate = <T>(arr: T[]): T[] => {
      if (arr.length <= 1) return arr;
      const shift = Math.floor(Math.random() * arr.length);
      return [...arr.slice(shift), ...arr.slice(0, shift)];
    };

    return {
      trending: rotate(rawData.trending),
      hindi: rotate(rawData.hindi),
      english: rotate(rawData.english),
      punjabi: rotate(rawData.punjabi),
      instaViral: rotate(rawData.instaViral),
      devotional: rotate(rawData.devotional)
    };
  }

  async getVibeRecommendations(currentTrack?: any): Promise<{ tracks: any[]; vibeProfile: string }> {
    const curated = this.getCuratedMockData();
    let vibeProfile = 'GLOBAL CURATION // TOP ECHOES';
    let vibeTag = 'VIBE MATCH';
    let basePool: any[] = [];

    if (currentTrack) {
      const trackId = currentTrack.id;
      const trackName = (currentTrack.name || '').toLowerCase();
      const artist = (currentTrack.artists?.[0]?.name || '').toLowerCase();

      // Classify vibe signature
      if (curated.instaViral.some(t => t.id === trackId || t.name.toLowerCase() === trackName) || artist.includes('phonk') || artist.includes('interworld') || artist.includes('kordhell')) {
        vibeProfile = 'DARK PHONK // 140 BPM BASS FLOW';
        vibeTag = 'DRIFT';
        basePool = [...curated.instaViral, ...curated.trending];
      } else if (curated.hindi.some(t => t.id === trackId || t.name.toLowerCase() === trackName) || artist.includes('arijit') || artist.includes('jubin') || artist.includes('pritam') || artist.includes('singh')) {
        vibeProfile = 'BOLLYWOOD SOUL // ACOUSTIC WARMTH';
        vibeTag = 'MELODIC';
        basePool = [...curated.hindi, ...curated.devotional];
      } else if (curated.punjabi.some(t => t.id === trackId || t.name.toLowerCase() === trackName) || artist.includes('diljit') || artist.includes('moose') || artist.includes('dhillon') || artist.includes('aujla')) {
        vibeProfile = 'PUNJABI DRIFT // URBAN BASS';
        vibeTag = 'PUNJABI';
        basePool = [...curated.punjabi, ...curated.trending];
      } else if (curated.devotional.some(t => t.id === trackId || t.name.toLowerCase() === trackName) || artist.includes('jagjit') || artist.includes('rahman') || artist.includes('ali') || artist.includes('hariharan')) {
        vibeProfile = 'SUFI & SPIRITUAL // MEDITATIVE';
        vibeTag = 'SUFI';
        basePool = [...curated.devotional, ...curated.hindi];
      } else if (curated.english.some(t => t.id === trackId || t.name.toLowerCase() === trackName) || artist.includes('styles') || artist.includes('malone') || artist.includes('cyrus') || artist.includes('eilish')) {
        vibeProfile = 'INDIE CHILL // HARMONIC ECHO';
        vibeTag = 'INDIE';
        basePool = [...curated.english, ...curated.trending];
      } else {
        vibeProfile = 'GLOBAL SYNTHPOP // 120 BPM';
        vibeTag = 'SYNTH';
        basePool = [...curated.trending, ...curated.english];
      }
    } else {
      vibeProfile = 'GLOBAL CURATION // TOP ECHOES';
      vibeTag = 'TRENDING';
      basePool = [...curated.trending, ...curated.instaViral];
    }

    // Try live matching via API if track has artist
    let liveTracks: any[] = [];
    if (currentTrack && currentTrack.artists?.[0]?.name) {
      try {
        const query = `${currentTrack.artists[0].name} vibe`;
        const res = await this.searchMusic(query, { useCache: true, maxResults: 8 });
        if (Array.isArray(res) && res.length > 0) {
          liveTracks = res;
        }
      } catch {}
    }

    const combined = [...liveTracks, ...basePool];
    const seen = new Set<string>();
    const currentId = currentTrack?.id;
    const currentName = (currentTrack?.name || '').toLowerCase().trim();

    const result: any[] = [];
    const matchScores = [99, 97, 95, 93, 91, 88, 86, 84];

    for (const t of combined) {
      if (!t || !t.id) continue;
      // Do not recommend currently playing track
      if (currentId && t.id === currentId) continue;
      if (currentName && t.name && t.name.toLowerCase().trim() === currentName) continue;

      const normKey = ((t.name || '') + ' ' + (t.artists?.[0]?.name || '')).toLowerCase();
      if (seen.has(normKey)) continue;
      seen.add(normKey);

      const score = matchScores[result.length] || 85;
      result.push({
        ...t,
        vibeMatchScore: `${score}%`,
        vibeTag: t.vibeTag || vibeTag
      });

      if (result.length >= 8) break;
    }

    return { tracks: result, vibeProfile };
  }
}
