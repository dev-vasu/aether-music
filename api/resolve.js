const https = require('https');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

// 1. Official YouTube Data API v3 resolver (Fastest & 100% reliable)
async function resolveViaApi(query, apiKey) {
  if (!apiKey) return null;
  const url = `https://www.googleapis.com/youtube/v3/search?part=id&maxResults=1&type=video&q=${encodeURIComponent(query + ' official audio')}&key=${apiKey}`;
  const data = await fetchJson(url);
  if (data && data.items && data.items.length > 0 && data.items[0].id?.videoId) {
    return data.items[0].id.videoId;
  }
  return null;
}

// 2. High-reliability fallback scraper with full headers, cookies & redirect support
function resolveWithScraper(query) {
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
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `https://www.youtube.com${redirectUrl}`;
        }
        return resolveWithScraperUrl(redirectUrl).then(resolve);
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

function resolveWithScraperUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+478'
      } 
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const match = data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
          if (match && match[1]) return resolve(match[1]);
        } catch {}
        resolve(null);
      });
    }).on('error', () => resolve(null));
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
  if (!query) {
    return res.status(400).json({ error: 'Query required' });
  }

  try {
    let videoId = null;

    // 1. Try official YouTube Data API keys first
    const primaryKey = process.env.YOUTUBE_API_KEY;
    const backupKey = process.env.YOUTUBE_API_KEY_BACKUP;

    if (primaryKey) {
      try {
        videoId = await resolveViaApi(query, primaryKey);
      } catch {}
    }
    if (!videoId && backupKey) {
      try {
        videoId = await resolveViaApi(query, backupKey);
      } catch {}
    }

    // 2. High-reliability fallback scraper
    if (!videoId) {
      videoId = await resolveWithScraper(query);
    }

    if (videoId && videoId.length === 11) {
      // Cache successful resolutions for 7 days
      res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=2592000');
      return res.status(200).json({ id: videoId, query, success: true });
    }

    // Do NOT cache null/failed resolutions so subsequent tries can resolve fresh
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).json({ id: null, query, success: false });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(500).json({ error: 'Resolution failed', id: null });
  }
};
