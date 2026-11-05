const https = require('https');

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
  'mashup',
  'mash up',
  'mash-up',
  'compilation',
  'jukebox',
  'nonstop',
  'non stop',
  'full album',
  'greatest hits',
  'best of',
  'best songs of',
  'playlist',
  'fan edit',
  'fan-made',
  'fanmade',
  'unlicensed',
  'slowed',
  'reverb',
  'slowed + reverb',
  'slowed & reverb',
  'bass boosted',
  'nightcore',
  'status video',
  'ringtone',
  '10 hours',
  '1 hour loop',
  'cover by',
  'tribute to',
  'parody'
];

function isUnlicensedOrMashup(title, channel, durationSecs) {
  const lowerTitle = (title || '').toLowerCase();
  const lowerChannel = (channel || '').toLowerCase();

  // 1. Single songs are practically always between 60s and 450s (7.5 mins).
  // Anything longer is a multi-song compilation, album, or mashup set.
  if (durationSecs > 450 || durationSecs < 60) {
    return true;
  }

  // 2. Reject bootleg compilations, playlists, and mashup sets
  if (UNLICENSED_MASHUP_BLACKLIST.some(term => lowerTitle.includes(term))) {
    return true;
  }

  // 3. Reject fan-edit channels
  if (lowerChannel.includes('fan edits') || lowerChannel.includes('status video') || lowerChannel.includes('remix hub')) {
    return true;
  }

  return false;
}

function fetchWithHeaders(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function searchWithScraper(query, limit = 15) {
  // Append 'official' to prompt YouTube search algorithms towards verified master recordings
  const refinedQuery = query.toLowerCase().includes('official') ? query : `${query} official audio`;
  const encoded = encodeURIComponent(refinedQuery.trim());
  const url = `https://www.youtube.com/results?search_query=${encoded}`;
  
  const response = await fetchWithHeaders(url, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
  });

  const html = response.body;
  const match = html.match(/var ytInitialData = ({.*?});<\/script>/) || html.match(/ytInitialData = ({.*?});/);
  if (!match) return [];

  const json = JSON.parse(match[1]);
  const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
  if (!contents || !Array.isArray(contents)) return [];

  const tracks = [];

  for (const item of contents) {
    const vr = item.videoRenderer;
    if (vr && vr.videoId && vr.title?.runs?.[0]?.text) {
      const rawTitle = vr.title.runs[0].text;
      const channelTitle = vr.ownerText?.runs?.[0]?.text || '';
      const durationStr = vr.lengthText?.simpleText || '';
      const durationSecs = parseDurationSecs(durationStr);

      // Enforce strict authenticity filter
      if (isUnlicensedOrMashup(rawTitle, channelTitle, durationSecs)) {
        continue;
      }

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

  return tracks;
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const query = (req.query.q || req.query.query || '').trim();
  const limit = Math.min(parseInt(req.query.limit || '15', 10), 30);

  if (!query) {
    return res.status(200).json([]);
  }

  // 30 min browser cache, 1 hour CDN cache
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');

  try {
    const tracks = await searchWithScraper(query, limit);
    return res.status(200).json(tracks);
  } catch (err) {
    console.error('Search failed:', err);
    return res.status(200).json([]);
  }
};
