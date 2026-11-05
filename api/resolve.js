const https = require('https');

function resolveYoutubeId(query) {
  return new Promise((resolve) => {
    const refinedQuery = `${query} official audio`;
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(refinedQuery)}`;

    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Fast regex match for videoId
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

  // 24 hour CDN cache
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');

  try {
    const videoId = await resolveYoutubeId(query);
    return res.status(200).json({ id: videoId, query });
  } catch (err) {
    return res.status(500).json({ error: 'Resolution failed', id: null });
  }
};
