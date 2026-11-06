const https = require('https');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function resolveYoutubeId(query) {
  return new Promise((resolve) => {
    const refinedQuery = `${query} official audio`;
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(refinedQuery)}`;

    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const match = data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
          if (match && match[1]) {
            return resolve(match[1]);
          }
        } catch {}
        resolve(null);
      });
    }).on('error', () => resolve(null));
  });
}

async function searchItunes(query, limit = 15) {
  let url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`;
  let data = await fetchJson(url);

  if (!data || !data.results || data.results.length === 0) {
    // If complex multi-word query fails, strip common noise words ('hits', 'songs', 'audio', 'music')
    const cleaned = query.replace(/\b(hits|songs|official|audio|music|playlist)\b/gi, '').trim();
    if (cleaned && cleaned !== query) {
      url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleaned)}&entity=song&limit=${limit}`;
      data = await fetchJson(url);
    }
  }

  if (!data || !data.results || data.results.length === 0) {
    // If still empty, try the primary artist/phrase (first 2 words)
    const words = query.split(/\s+/).filter(w => !['hits', 'songs', 'audio', 'mix', 'music'].includes(w.toLowerCase()));
    if (words.length >= 2) {
      const firstArtist = words.slice(0, 2).join(' ');
      url = `https://itunes.apple.com/search?term=${encodeURIComponent(firstArtist)}&entity=song&limit=${limit}`;
      data = await fetchJson(url);
    }
  }

  if (!data || !data.results || data.results.length === 0) {
    return [];
  }

  const tracks = [];
  const seen = new Set();

  for (const item of data.results) {
    if (item.wrapperType !== 'track' || item.kind !== 'song') continue;
    const key = (item.trackName + ' ' + item.artistName).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    // Upgrade to 600x600 high definition square studio album cover
    const art = (item.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg');

    tracks.push({
      id: `itunes_${item.trackId}`,
      name: item.trackName,
      artists: [{ name: item.artistName }],
      album: {
        name: item.collectionName || 'Official Studio Release',
        images: [{ url: art }]
      },
      previewUrl: item.previewUrl,
      duration: Math.round((item.trackTimeMillis || 210000) / 1000)
    });
  }

  // Pre-resolve YouTube video IDs for the top 5 tracks in parallel for instant playback
  const topCount = Math.min(tracks.length, 5);
  const resolvePromises = [];
  for (let i = 0; i < topCount; i++) {
    const q = `${tracks[i].artists[0].name} - ${tracks[i].name}`;
    resolvePromises.push(
      resolveYoutubeId(q).then(ytId => {
        if (ytId) {
          tracks[i].id = ytId;
        }
      })
    );
  }
  await Promise.all(resolvePromises);

  return tracks;
}

function parseDurationSecs(str) {
  if (!str) return 0;
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function cleanTitle(title) {
  if (!title) return 'Aether Track';
  return title
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\[.*?\]/g, '')
    .replace(/\(Official.*?\)/gi, '')
    .replace(/\(Music Video.*?\)/gi, '')
    .replace(/\(Audio.*?\)/gi, '')
    .replace(/\(Visualizer.*?\)/gi, '')
    .replace(/\(Lyric.*?\)/gi, '')
    .replace(/\(4K.*?\)/gi, '')
    .replace(/\|.*/g, '')
    .trim();
}

function cleanArtist(channel) {
  if (!channel) return 'Aether Soundscape';
  return channel
    .replace(/ - Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/ Official$/i, '')
    .replace(/ Records$/i, '')
    .trim();
}

const UNLICENSED_MASHUP_BLACKLIST = [
  'mashup', 'mash up', 'mash-up', 'compilation', 'jukebox', 'nonstop', 'non stop',
  'full album', 'greatest hits', 'best of', 'best songs of', 'playlist', 'fan edit',
  'fan-made', 'fanmade', 'unlicensed', 'slowed', 'reverb', 'slowed + reverb',
  'slowed & reverb', 'bass boosted', 'nightcore', 'status video', 'ringtone',
  '10 hours', '1 hour loop', 'cover by', 'tribute to', 'parody'
];

async function searchWithScraper(query, limit = 15) {
  const refinedQuery = `${query} official audio`;
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(refinedQuery)}`;
  
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        try {
          const match = html.match(/var ytInitialData = ({.*?});<\/script>/) || html.match(/ytInitialData = ({.*?});/);
          if (!match) return resolve([]);

          const json = JSON.parse(match[1]);
          const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
          if (!contents || !Array.isArray(contents)) return resolve([]);

          const tracks = [];
          for (const item of contents) {
            const vr = item.videoRenderer;
            if (vr && vr.videoId && vr.title?.runs?.[0]?.text) {
              const rawTitle = vr.title.runs[0].text;
              const channelTitle = vr.ownerText?.runs?.[0]?.text || '';
              const durationStr = vr.lengthText?.simpleText || '';
              const durationSecs = parseDurationSecs(durationStr);
              const lowerTitle = rawTitle.toLowerCase();

              // Reject long mixes and mashups
              if (durationSecs > 450 || durationSecs < 60) continue;
              if (UNLICENSED_MASHUP_BLACKLIST.some(t => lowerTitle.includes(t))) continue;

              const videoId = vr.videoId;
              tracks.push({
                id: videoId,
                name: cleanTitle(rawTitle),
                artists: [{ name: cleanArtist(channelTitle) }],
                album: {
                  images: [{ url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` }]
                }
              });

              if (tracks.length >= limit) break;
            }
          }
          resolve(tracks);
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = (req.query.q || req.query.query || '').trim();
  const limit = Math.min(parseInt(req.query.limit || '15', 10), 30);

  if (!query) {
    return res.status(200).json([]);
  }

  // 1 hour browser cache, 2 hour CDN cache
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400');

  try {
    // 1. Prioritize iTunes Official Music Catalog for genuine studio releases & 1:1 HD square album art
    const itunesTracks = await searchItunes(query, limit);
    if (itunesTracks.length > 0) {
      return res.status(200).json(itunesTracks);
    }

    // 2. Fall back to filtered YouTube official audio if needed
    const ytTracks = await searchWithScraper(query, limit);
    return res.status(200).json(ytTracks);
  } catch (err) {
    console.error('Search error:', err);
    return res.status(200).json([]);
  }
};
