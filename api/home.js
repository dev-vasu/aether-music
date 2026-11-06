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

async function resolveYoutubeId(query) {
  const primaryKey = process.env.YOUTUBE_API_KEY;
  const backupKey = process.env.YOUTUBE_API_KEY_BACKUP;

  // 1. Try official YouTube Data API
  const tryApi = (key) => new Promise((resolve) => {
    const url = `https://www.googleapis.com/youtube/v3/search?part=id&maxResults=1&type=video&q=${encodeURIComponent(query + ' official audio')}&key=${key}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j?.items?.[0]?.id?.videoId) return resolve(j.items[0].id.videoId);
        } catch {}
        resolve(null);
      });
    }).on('error', () => resolve(null));
  });

  if (primaryKey) {
    const apiId = await tryApi(primaryKey);
    if (apiId) return apiId;
  }
  if (backupKey) {
    const apiId = await tryApi(backupKey);
    if (apiId) return apiId;
  }

  // 2. High-reliability fallback scraper with proper headers, cookies & redirect support
  return new Promise((resolve) => {
    const refinedQuery = `${query} official audio`;
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(refinedQuery)}`;

    const req = https.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+478'
      } 
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) redirectUrl = `https://www.youtube.com${redirectUrl}`;
        https.get(redirectUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r2) => {
          let d2 = '';
          r2.on('data', c => d2 += c);
          r2.on('end', () => {
            const m = d2.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
            resolve(m ? m[1] : null);
          });
        }).on('error', () => resolve(null));
        return;
      }

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
    });
    req.on('error', () => resolve(null));
  });
}

const ARTIST_POOLS = {
  trending: [
    'The Weeknd', 'Dua Lipa', 'Coldplay', 'Bruno Mars', 'Drake', 
    'Post Malone', 'Taylor Swift', 'Ed Sheeran', 'Kendrick Lamar', 'SZA'
  ],
  hindi: [
    'Pritam', 'Arijit Singh', 'Shreya Ghoshal', 'Atif Aslam', 'Mohit Chauhan', 
    'Vishal-Shekhar', 'Sachin-Jigar', 'KK', 'Sonu Nigam', 'Sunidhi Chauhan'
  ],
  english: [
    'Billie Eilish', 'Sabrina Carpenter', 'Harry Styles', 'Teddy Swims', 
    'Olivia Rodrigo', 'Chappell Roan', 'Hozier', 'Benson Boone', 'Miley Cyrus'
  ],
  punjabi: [
    'Diljit Dosanjh', 'Karan Aujla', 'AP Dhillon', 'Sidhu Moose Wala', 
    'Shubh', 'Amrinder Gill', 'B Praak', 'Harrdy Sandhu'
  ],
  instaViral: [
    'INTERWORLD Phonk', 'Kordhell', 'DVRST', 'Hensonn', 'PLAYAMANE', 
    'SXMPRA', 'g3ox_em', 'Pharmacist Phonk'
  ],
  devotional: [
    'Jagjit Singh', 'A.R. Rahman Sufi', 'Rahat Fateh Ali Khan', 'Hariharan Bhajan', 
    'Nusrat Fateh Ali Khan', 'Abida Parveen', 'Anuradha Paudwal'
  ]
};

const MASHUP_TERMS = [
  'mashup', 'mash up', 'compilation', 'jukebox', 'nonstop', 'non stop', 
  'full album', 'fan edit', 'fan-made', 'slowed', 'reverb', 'remix'
];

async function searchArtistSongs(artistQuery, limit = 5) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artistQuery)}&entity=song&limit=${limit + 2}`;
  const data = await fetchJson(url);
  if (!data || !Array.isArray(data.results)) return [];

  const songs = [];
  const seenTitles = new Set();

  for (const item of data.results) {
    if (item.wrapperType !== 'track' || item.kind !== 'song') continue;
    const lowerName = (item.trackName || '').toLowerCase();
    if (MASHUP_TERMS.some(t => lowerName.includes(t))) continue;

    const normTitle = lowerName.replace(/[^a-z0-9]/g, '').slice(0, 15);
    if (seenTitles.has(normTitle)) continue;
    seenTitles.add(normTitle);

    // Guaranteed 1:1 HD 600x600 square studio artwork
    const art = (item.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg');

    songs.push({
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

    if (songs.length >= limit) break;
  }

  return songs;
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Prevent browser & CDN caching so reloading dynamically samples fresh rotations
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const categoryKeys = Object.keys(ARTIST_POOLS);
    const categoryResults = {};

    // For each category, select 3-4 diverse artists from the pool
    const categoryPromises = categoryKeys.map(async (catKey) => {
      const pool = ARTIST_POOLS[catKey];
      const selectedArtists = shuffleArray(pool).slice(0, 4);

      // Fetch songs for each selected artist in parallel
      const artistSongBatches = await Promise.all(
        selectedArtists.map(artist => searchArtistSongs(artist, 3))
      );

      // Interleave songs across artists so each row features varied artists
      // e.g. Artist 1 (Song 1), Artist 2 (Song 1), Artist 3 (Song 1), Artist 1 (Song 2)...
      const interleaved = [];
      const maxBatchLen = Math.max(...artistSongBatches.map(b => b.length), 0);

      for (let i = 0; i < maxBatchLen; i++) {
        for (const batch of artistSongBatches) {
          if (batch[i]) {
            interleaved.push(batch[i]);
          }
        }
      }

      // Pre-resolve YouTube IDs for top tracks in parallel for instant full-song playback
      const topCount = Math.min(interleaved.length, 4);
      const resolveTasks = [];
      for (let j = 0; j < topCount; j++) {
        const track = interleaved[j];
        if (track && track.artists?.[0]?.name && track.name) {
          resolveTasks.push(
            resolveYoutubeId(`${track.artists[0].name} - ${track.name}`).then(ytId => {
              if (ytId) track.id = ytId;
            })
          );
        }
      }
      await Promise.all(resolveTasks);

      categoryResults[catKey] = interleaved;
    });

    await Promise.all(categoryPromises);

    return res.status(200).json(categoryResults);
  } catch (err) {
    console.error('Home feed generation error:', err);
    return res.status(500).json({ error: 'Failed to generate home feed' });
  }
};
