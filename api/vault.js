export default {
  async fetch(request, env) {
    const UPSTASH_URL = 'https://selected-monkey-148490.upstash.io';
    const UPSTASH_TOKEN = 'gQAAAAAAAkQKAAIgcDExMTUxZWYyNjk4MDQ0MGY0YTRlZmZhMjQ3MzUwMGU3Zg';

    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    async function redisCommand(cmd, ...args) {
      const path = args.map(a => encodeURIComponent(a)).join('/');
      const res = await fetch(`${UPSTASH_URL}/${cmd}/${path}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      return res.json();
    }

    if (request.method === 'GET') {
      const user = url.searchParams.get('user');
      const pass = url.searchParams.get('pass');
      if (!user || !pass) {
        return new Response(JSON.stringify({ error: 'Missing credentials' }), {
          status: 400, headers: corsHeaders
        });
      }
      const key = 'vault:user:' + user;
      const result = await redisCommand('get', key);
      if (result.result) {
        try {
          const data = JSON.parse(result.result);
          if (data.pass === pass) {
            return new Response(JSON.stringify({ passwords: data.passwords }), {
              status: 200, headers: corsHeaders
            });
          }
          return new Response(JSON.stringify({ error: 'Wrong password' }), {
            status: 403, headers: corsHeaders
          });
        } catch(e) {}
      }
      return new Response(JSON.stringify({ passwords: null }), {
        status: 200, headers: corsHeaders
      });
    }

    if (request.method === 'POST') {
      try {
        const body = await request.json();
        if (!body.user || !body.pass) {
          return new Response(JSON.stringify({ error: 'Missing credentials' }), {
            status: 400, headers: corsHeaders
          });
        }
        const key = 'vault:user:' + body.user;
        const data = JSON.stringify({
          pass: body.pass,
          passwords: body.passwords,
          updated: Date.now()
        });
        await redisCommand('set', key, data);
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: corsHeaders
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 400, headers: corsHeaders
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders
    });
  }
};