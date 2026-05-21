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
  
  private useBackupKey = false;

  constructor() {
    this.loadApi();
  }

  private loadApi() {
    if ((window as any).YT && (window as any).YT.Player) {
        this.isPlayerReady.set(true);
        return;
    }
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    (window as any).onYouTubeIframeAPIReady = () => {
      this.isPlayerReady.set(true);
    };
  }

  initPlayer(elementId: string, videoId: string, onStateChange: (state: any) => void) {
    if (!this.isPlayerReady()) return;
    this.player = new YT.Player(elementId, {
      height: '360', 
      width: '640',
      videoId: videoId,
      playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, origin: window.location.origin, mute: 0, enablejsapi: 1 },
      events: {
        onReady: (event: any) => { event.target.unMute(); if (videoId) event.target.playVideo(); },
        onStateChange: (event: any) => onStateChange(event.data)
      }
    });
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
    const { useCache = false, isUserSearch = false } = options;

    if (!query) query = 'premium hits 2026';
    
    if (useCache) {
        const cached = localStorage.getItem(`melody_cache_${query}`);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 86400000) return parsed.data;
        }
    }

    if (this.useBackupKey && (environment as any).youtubeApiKeyBackup) {
        const res = await this.executeSearch(query, options, true);
        return res || [];
    }

    let tracks = await this.executeSearch(query, options, false);
    
    if (tracks === null && (environment as any).youtubeApiKeyBackup) {
        console.warn('Aether: Primary API Engine exhausted. Switching to Backup Engine...');
        this.useBackupKey = true;
        tracks = await this.executeSearch(query, options, true);
    }

    if (tracks === null) {
        this.apiError.set('QUOTA_LIMIT_HIT');
        return [];
    }

    return tracks || [];
  }

  private async executeSearch(query: string, options: SearchOptions, useBackup: boolean): Promise<any[] | null> {
    const { isUserSearch = false, maxResults = 15 } = options;
    const apiKey = useBackup ? (environment as any).youtubeApiKeyBackup : environment.youtubeApiKey;
    const engineName = useBackup ? 'BACKUP' : 'PRIMARY';
    
    if (!apiKey || apiKey.includes('REPLACED') || apiKey.includes('YOUR_LOCAL')) {
        console.warn(`Aether: ${engineName} key is not configured.`);
        return [];
    }

    console.log(`Aether: Searching with ${engineName} engine... (Key: ${apiKey.substring(0, 5)}...)`);

    let refinedQuery = query;
    if (!isUserSearch && !query.toLowerCase().includes('official audio')) {
        refinedQuery = `${query} official audio -mashup -bhojpuri -khesari -pawan -haryanvi`;
    }

    // REMOVED: videoCategoryId=10 (This can sometimes be too strict for user searches)
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(refinedQuery)}&type=video&key=${apiKey}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
          const reason = data.error.errors?.[0]?.reason;
          const message = data.error.message;
          console.error(`YouTube API Error [${engineName}]:`, reason, message);

          if (reason === 'quotaExceeded' || reason === 'accessNotConfigured' || reason === 'forbidden') {
              return null; 
          }
          
          this.apiError.set(`${engineName}: ${message}`);
          return [];
      }
      
      const blacklistedArtists = ['khesari', 'pawan singh', 'bhojpuri', 'haryanvi', 'sapna choudhary', 'shilpi raj', 'ritesh pandey', 'pramod premi', 'hits', 'billboard', 'top 100'];
      
      const tracks = (data.items || [])
        .filter((item: any) => {
          if (!item.id.videoId) return false;
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
            artists: [{ name: item.snippet.channelTitle }],
            album: { images: [{ url: getThumb(item.id.videoId) }] }
          };
        });

      if (options.useCache) {
          localStorage.setItem(`melody_cache_${query}`, JSON.stringify({ timestamp: Date.now(), data: tracks }));
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
        { id: 'fHI8X4OXluQ', name: 'Blinding Lights', artists: [{ name: 'The Weeknd' }], album: { images: [{ url: getUrl('fHI8X4OXluQ') }] } },
        { id: 'kJQP7kiw5Fk', name: 'Despacito', artists: [{ name: 'Luis Fonsi' }], album: { images: [{ url: getUrl('kJQP7kiw5Fk') }] } },
        { id: 'L0X03zR0rQk', name: 'Levitating', artists: [{ name: 'Dua Lipa' }], album: { images: [{ url: getUrl('L0X03zR0rQk') }] } },
        { id: 'hT_nvWreIhg', name: 'One Dance', artists: [{ name: 'Drake' }], album: { images: [{ url: getUrl('hT_nvWreIhg') }] } }
      ],
      instaViral: [
        { id: 'vA8O09P5_zo', name: 'Metamorphosis', artists: [{ name: 'INTERWORLD' }], album: { images: [{ url: getUrl('vA8O09P5_zo') }] } },
        { id: 'u_p0nN1FvRE', name: 'Midnight', artists: [{ name: 'PLAYAMANE' }], album: { images: [{ url: getUrl('u_p0nN1FvRE') }] } },
        { id: 'rUf7yC_zJ-U', name: 'Sahara', artists: [{ name: 'Henson' }], album: { images: [{ url: getUrl('rUf7yC_zJ-U') }] } }
      ],
      hindi: [
        { id: 'VuG7ge_8I2Y', name: 'Kesariya', artists: [{ name: 'Arijit Singh' }], album: { images: [{ url: getUrl('VuG7ge_8I2Y') }] } },
        { id: 'h7GyfX_68T8', name: 'Raataan Lambiyan', artists: [{ name: 'Jubin Nautiyal' }], album: { images: [{ url: getUrl('h7GyfX_68T8') }] } },
        { id: 'YxWlaYCA8MU', name: 'Tum Hi Ho', artists: [{ name: 'Arijit Singh' }], album: { images: [{ url: getUrl('YxWlaYCA8MU') }] } }
      ],
      english: [
        { id: 'yJg-Y5byMMw', name: 'As It Was', artists: [{ name: 'Harry Styles' }], album: { images: [{ url: getUrl('yJg-Y5byMMw') }] } },
        { id: 'TUVcZfQe-Kw', name: 'Flowers', artists: [{ name: 'Miley Cyrus' }], album: { images: [{ url: getUrl('TUVcZfQe-Kw') }] } },
        { id: 'UnyLqlfe_3U', name: 'Starboy', artists: [{ name: 'The Weeknd' }], album: { images: [{ url: getUrl('UnyLqlfe_3U') }] } }
      ],
      punjabi: [
        { id: 'cl0a3i2wDzQ', name: '295', artists: [{ name: 'Sidhu Moose Wala' }], album: { images: [{ url: getUrl('cl0a3i2wDzQ') }] } },
        { id: 'vX2cDW8LUWk', name: 'Proper Patola', artists: [{ name: 'Diljit Dosanjh' }], album: { images: [{ url: getUrl('vX2cDW8LUWk') }] } },
        { id: 'vL_Nn9KxV-Y', name: 'Excuses', artists: [{ name: 'AP Dhillon' }], album: { images: [{ url: getUrl('vL_Nn9KxV-Y') }] } }
      ],
      devotional: [
        { id: 'A0pLe-f9EHA', name: 'Hanuman Chalisa', artists: [{ name: 'Hariharan' }], album: { images: [{ url: getUrl('A0pLe-f9EHA') }] } },
        { id: 'G-7U-m7P78E', name: 'Achutam Keshavan', artists: [{ name: 'Shreya Ghoshal' }], album: { images: [{ url: getUrl('G-7U-m7P78E') }] } },
        { id: 'kJ_mS35xXmY', name: 'Shiv Tandav', artists: [{ name: 'Sachet Tandon' }], album: { images: [{ url: getUrl('kJ_mS35xXmY') }] } }
      ]
    };
  }
}
