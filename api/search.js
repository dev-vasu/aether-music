const https = require('https');

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
    .replace(/\|.*/g, '')
    .trim();
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

async function searchWithApiKey(query, apiKey, limit = 15) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${limit}&q=${encodeURIComponent(query + ' official audio')}&type=video&key=${apiKey}`;
  const response = await fetchWithHeaders(url);
  const data = JSON.parse(response.body);

  if (data.error) {
    throw new Error(data.error.message || 'API Error');
  }

  return (data.items || [])
    .filter(item => item.id && item.id.videoId)
    .map(item => ({
      id: item.id.videoId,
      name: cleanTitle(item.snippet.title),
      artists: [{ name: item.snippet.channelTitle.replace(' - Topic', '') }],
      album: {
        images: [{ url: `https://i.ytimg.com/vi/${item.id.videoId}/maxresdefault.jpg` }]
      }
    }));
}

async function searchWithScraper(query, limit = 15) {
  const encoded = encodeURIComponent(query.trim());
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
  const blacklisted = ['mashup', 'jukebox', 'nonstop', 'compilation', '10 hours', '1 hour loop'];

  for (const item of contents) {
    const vr = item.videoRenderer;
    if (vr && vr.videoId && vr.title?.runs?.[0]?.text) {
      const rawTitle = vr.title.runs[0].text;
      const lowerTitle = rawTitle.toLowerCase();
      if (blacklisted.some(w => lowerTitle.includes(w))) continue;

      const channelTitle = vr.ownerText?.runs?.[0]?.text || 'Aether Soundscape';
      const videoId = vr.videoId;

      tracks.push({
        id: videoId,
        name: cleanTitle(rawTitle),
        artists: [{ name: channelTitle.replace(' - Topic', '') }],
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

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey && apiKey !== 'V_PRIMARY_KEY' && apiKey.length > 20) {
    try {
      const tracks = await searchWithApiKey(query, apiKey, limit);
      if (tracks.length > 0) {
        return res.status(200).json(tracks);
      }
    } catch (e) {
      // Fallback to scraper if quota exceeded or key invalid
    }
  }

  try {
    const tracks = await searchWithScraper(query, limit);
    return res.status(200).json(tracks);
  } catch (err) {
    console.error('Scraper search failed:', err);
    return res.status(200).json([]);
  }
};
