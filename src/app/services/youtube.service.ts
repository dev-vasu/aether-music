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

  playVideo(videoId: string) {
    if (this.player && this.player.loadVideoById) {
      this.player.loadVideoById(videoId);
      this.player.unMute();
      this.player.playVideo();
    }
  }

  unMute() { if (this.player && this.player.unMute) this.player.unMute(); }
  pause() { if (this.player && this.player.pauseVideo) this.player.pauseVideo(); }
  resume() { if (this.player && this.player.playVideo) { this.player.unMute(); this.player.playVideo(); } }
  setVolume(volume: number) { if (this.player && this.player.setVolume) { this.player.unMute(); this.player.setVolume(volume); } }
  getCurrentTime() { return (this.player && this.player.getCurrentTime) ? this.player.getCurrentTime() : 0; }
  getDuration() { return (this.player && this.player.getDuration) ? this.player.getDuration() : 0; }
  seekTo(seconds: number) { if (this.player && this.player.seekTo) this.player.seekTo(seconds, true); }

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

    // 1. Try our unified serverless endpoint /api/search (available on Vercel deployment)
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
      // Serverless API not available (e.g. offline, local dev without proxy)
    }

    // 2. Try direct Google YouTube Data API v3 if keys are available
    if (this.useBackupKey && (environment as any).youtubeApiKeyBackup) {
      const res = await this.executeSearch(query, options, true);
      if (res && res.length > 0) return res;
    }

    let tracks = await this.executeSearch(query, options, false);
    
    if (tracks === null && (environment as any).youtubeApiKeyBackup) {
      this.useBackupKey = true;
      tracks = await this.executeSearch(query, options, true);
    }

    if (tracks && tracks.length > 0) {
      return tracks;
    }

    // 3. Fallback to rich curated cosmic database with smart query filtering
    const curated = this.getCuratedMockData();
    const qLower = query.toLowerCase().trim();
    const allCurated = Object.values(curated).flat();

    if (isUserSearch) {
      const matches = allCurated.filter(t => 
        t.name.toLowerCase().includes(qLower) || 
        t.artists.some((a: any) => a.name.toLowerCase().includes(qLower))
      );
      if (matches.length > 0) return matches;
      // If user typed something not matched, return a vibrant mix of trending tracks
      return [...curated.trending, ...curated.instaViral];
    }

    return curated.trending;
  }

  private async executeSearch(query: string, options: SearchOptions, useBackup: boolean): Promise<any[] | null> {
    const { isUserSearch = false, maxResults = 15 } = options;
    const apiKey = useBackup ? (environment as any).youtubeApiKeyBackup : environment.youtubeApiKey;
    const engineName = useBackup ? 'BACKUP' : 'PRIMARY';
    
    // Update debug hint (first 3 chars)
    if (apiKey) this.activeKeyHint.set(apiKey.substring(0, 3));

    // Better Placeholder Check
    if (!apiKey || apiKey === 'V_PRIMARY_KEY' || apiKey === 'V_BACKUP_KEY' || apiKey === 'REPLACED_BY_VERCEL' || apiKey === 'YOUR_LOCAL_KEY_HERE') {
      return null; // Return null to trigger fallback
    }

    let refinedQuery = query;
    if (!isUserSearch && !query.toLowerCase().includes('official audio')) {
      refinedQuery = `${query} official audio -mashup -bhojpuri -khesari -pawan -haryanvi`;
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(refinedQuery)}&type=video&key=${apiKey}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        const reason = data.error.errors?.[0]?.reason;
        if (reason === 'quotaExceeded' || reason === 'accessNotConfigured' || reason === 'forbidden' || reason === 'keyInvalid') {
          return null; 
        }
        return [];
      }
      
      const blacklistedArtists = ['khesari', 'pawan singh', 'bhojpuri', 'haryanvi', 'sapna choudhary', 'shilpi raj', 'ritesh pandey', 'pramod premi', 'hits', 'billboard', 'top 100'];
      
      const tracks = (data.items || [])
        .filter((item: any) => {
          if (!item.id?.videoId) return false;
          if (!isUserSearch) {
            const title = item.snippet.title.toLowerCase();
            const channel = item.snippet.channelTitle.toLowerCase();
            if (blacklistedArtists.some(artist => title.includes(artist) || channel.includes(artist))) return false;
            if (title.includes('mashup') || title.includes('jukebox') || title.includes('nonstop') || title.includes('compilation') || title.includes('hits')) return false;
          }
          return true;
        })
        .map((item: any) => {
          const clean = (text: string) => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/\|.*/g, '').trim();
          const getThumb = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
          return {
            id: item.id.videoId,
            name: clean(item.snippet.title),
            artists: [{ name: item.snippet.channelTitle.replace(' - Topic', '') }],
            album: { images: [{ url: getThumb(item.id.videoId) }] }
          };
        });

      if (options.useCache && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(`melody_cache_${query}`, JSON.stringify({ timestamp: Date.now(), data: tracks }));
        } catch {}
      }
      return tracks;
    } catch (e) {
      console.error(`Network Error [${engineName}]:`, e);
      return [];
    }
  }

  getCuratedMockData() {
    const getUrl = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    return {
      trending: [
        { id: 'PfH7jq_uSCM', name: 'Die With A Smile', artists: [{ name: 'Lady Gaga & Bruno Mars' }], album: { images: [{ url: getUrl('PfH7jq_uSCM') }] } },
        { id: 'fHI8X4OXluQ', name: 'Blinding Lights', artists: [{ name: 'The Weeknd' }], album: { images: [{ url: getUrl('fHI8X4OXluQ') }] } },
        { id: 'L0X03zR0rQk', name: 'Levitating', artists: [{ name: 'Dua Lipa' }], album: { images: [{ url: getUrl('L0X03zR0rQk') }] } },
        { id: 'kJQP7kiw5Fk', name: 'Despacito', artists: [{ name: 'Luis Fonsi' }], album: { images: [{ url: getUrl('kJQP7kiw5Fk') }] } },
        { id: 'hT_nvWreIhg', name: 'One Dance', artists: [{ name: 'Drake' }], album: { images: [{ url: getUrl('hT_nvWreIhg') }] } },
        { id: 'yKNxeF4KMsY', name: 'Yellow', artists: [{ name: 'Coldplay' }], album: { images: [{ url: getUrl('yKNxeF4KMsY') }] } },
        { id: '4NRXx6U8ABQ', name: 'Starboy', artists: [{ name: 'The Weeknd' }], album: { images: [{ url: getUrl('4NRXx6U8ABQ') }] } },
        { id: 'JGwWNGJdvx8', name: 'Shape of You', artists: [{ name: 'Ed Sheeran' }], album: { images: [{ url: getUrl('JGwWNGJdvx8') }] } }
      ],
      instaViral: [
        { id: 'vA8O09P5_zo', name: 'Metamorphosis', artists: [{ name: 'INTERWORLD' }], album: { images: [{ url: getUrl('vA8O09P5_zo') }] } },
        { id: 'u_p0nN1FvRE', name: 'Midnight', artists: [{ name: 'PLAYAMANE' }], album: { images: [{ url: getUrl('u_p0nN1FvRE') }] } },
        { id: 'rUf7yC_zJ-U', name: 'Sahara', artists: [{ name: 'Hensonn' }], album: { images: [{ url: getUrl('rUf7yC_zJ-U') }] } },
        { id: 'mU_E3n9q7iY', name: 'Murder In My Mind', artists: [{ name: 'Kordhell' }], album: { images: [{ url: getUrl('mU_E3n9q7iY') }] } },
        { id: '6Dh-RL__uN4', name: 'Close Eyes', artists: [{ name: 'DVRST' }], album: { images: [{ url: getUrl('6Dh-RL__uN4') }] } },
        { id: 'Y848B0u_uEU', name: 'AVOID ME', artists: [{ name: 'KUTE' }], album: { images: [{ url: getUrl('Y848B0u_uEU') }] } },
        { id: 'w-sQRS-Um98', name: 'Why Not', artists: [{ name: 'Ghostface Playa' }], album: { images: [{ url: getUrl('w-sQRS-Um98') }] } }
      ],
      hindi: [
        { id: 'BddP6PYo2gs', name: 'Kesariya', artists: [{ name: 'Arijit Singh & Pritam' }], album: { images: [{ url: getUrl('BddP6PYo2gs') }] } },
        { id: 'h7GyfX_68T8', name: 'Raataan Lambiyan', artists: [{ name: 'Jubin Nautiyal' }], album: { images: [{ url: getUrl('h7GyfX_68T8') }] } },
        { id: 'YxWlaYCA8MU', name: 'Tum Hi Ho', artists: [{ name: 'Arijit Singh' }], album: { images: [{ url: getUrl('YxWlaYCA8MU') }] } },
        { id: 'ElZfdU54Cp8', name: 'Apna Bana Le', artists: [{ name: 'Arijit Singh & Sachin-Jigar' }], album: { images: [{ url: getUrl('ElZfdU54Cp8') }] } },
        { id: 'V7LwfY5U5WI', name: 'Chaleya', artists: [{ name: 'Arijit Singh & Anirudh' }], album: { images: [{ url: getUrl('V7LwfY5U5WI') }] } },
        { id: 'RLzC55ai0eo', name: 'Heeriye', artists: [{ name: 'Jasleen Royal & Arijit Singh' }], album: { images: [{ url: getUrl('RLzC55ai0eo') }] } },
        { id: '6MgsHSAcI98', name: 'Tum Se Hi', artists: [{ name: 'Mohit Chauhan' }], album: { images: [{ url: getUrl('6MgsHSAcI98') }] } }
      ],
      english: [
        { id: 'yJg-Y5byMMw', name: 'As It Was', artists: [{ name: 'Harry Styles' }], album: { images: [{ url: getUrl('yJg-Y5byMMw') }] } },
        { id: 'TUVcZfQe-Kw', name: 'Flowers', artists: [{ name: 'Miley Cyrus' }], album: { images: [{ url: getUrl('TUVcZfQe-Kw') }] } },
        { id: 'UnyLqlfe_3U', name: 'Starboy', artists: [{ name: 'The Weeknd' }], album: { images: [{ url: getUrl('UnyLqlfe_3U') }] } },
        { id: '0Vw-P_yA8Fk', name: 'Circles', artists: [{ name: 'Post Malone' }], album: { images: [{ url: getUrl('0Vw-P_yA8Fk') }] } },
        { id: '7ysFgElQtjI', name: 'Birds of a Feather', artists: [{ name: 'Billie Eilish' }], album: { images: [{ url: getUrl('7ysFgElQtjI') }] } },
        { id: '2Vv-BfVoq4g', name: 'Perfect', artists: [{ name: 'Ed Sheeran' }], album: { images: [{ url: getUrl('2Vv-BfVoq4g') }] } },
        { id: 'CevxZvSJLk8', name: 'Roar', artists: [{ name: 'Katy Perry' }], album: { images: [{ url: getUrl('CevxZvSJLk8') }] } }
      ],
      punjabi: [
        { id: 'cl0a3i2wDzQ', name: '295', artists: [{ name: 'Sidhu Moose Wala' }], album: { images: [{ url: getUrl('cl0a3i2wDzQ') }] } },
        { id: 'vX2cDW8LUWk', name: 'Proper Patola', artists: [{ name: 'Diljit Dosanjh' }], album: { images: [{ url: getUrl('vX2cDW8LUWk') }] } },
        { id: 'vL_Nn9KxV-Y', name: 'Excuses', artists: [{ name: 'AP Dhillon' }], album: { images: [{ url: getUrl('vL_Nn9KxV-Y') }] } },
        { id: 'dCmp56tSSmA', name: 'Brown Munde', artists: [{ name: 'AP Dhillon & Gurinder Gill' }], album: { images: [{ url: getUrl('dCmp56tSSmA') }] } },
        { id: 'xR3V5Os4-Ag', name: 'With You', artists: [{ name: 'AP Dhillon' }], album: { images: [{ url: getUrl('xR3V5Os4-Ag') }] } },
        { id: 'E07s5ZYygmg', name: 'Softly', artists: [{ name: 'Karan Aujla' }], album: { images: [{ url: getUrl('E07s5ZYygmg') }] } },
        { id: '3xkxA_f-jpc', name: 'Lover', artists: [{ name: 'Diljit Dosanjh' }], album: { images: [{ url: getUrl('3xkxA_f-jpc') }] } }
      ],
      devotional: [
        { id: '5Eqb_-j3FDA', name: 'Pasoori', artists: [{ name: 'Ali Sethi & Shae Gill' }], album: { images: [{ url: getUrl('5Eqb_-j3FDA') }] } },
        { id: '7d_hL0T3mDk', name: 'Tu Jhoom', artists: [{ name: 'Abida Parveen & Naseebo Lal' }], album: { images: [{ url: getUrl('7d_hL0T3mDk') }] } },
        { id: '0_C_T3U8k5k', name: 'Afreen Afreen', artists: [{ name: 'Rahat Fateh Ali Khan & Momina' }], album: { images: [{ url: getUrl('0_C_T3U8k5k') }] } },
        { id: 'ibpA4e6Lg4g', name: 'Kun Faya Kun', artists: [{ name: 'A.R. Rahman & Javed Ali' }], album: { images: [{ url: getUrl('ibpA4e6Lg4g') }] } },
        { id: 'A0pLe-f9EHA', name: 'Hanuman Chalisa', artists: [{ name: 'Hariharan' }], album: { images: [{ url: getUrl('A0pLe-f9EHA') }] } },
        { id: 'G-7U-m7P78E', name: 'Achutam Keshavan', artists: [{ name: 'Shreya Ghoshal' }], album: { images: [{ url: getUrl('G-7U-m7P78E') }] } },
        { id: 'kJ_mS35xXmY', name: 'Shiv Tandav', artists: [{ name: 'Sachet Tandon' }], album: { images: [{ url: getUrl('kJ_mS35xXmY') }] } }
      ]
    };
  }
}
