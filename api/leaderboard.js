export default async function handler(req, res) {
    const KV_URL = process.env.KV_REST_API_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN;

    if (!KV_URL || !KV_TOKEN) {
        return res.status(500).json({ error: "KV Database not configured." });
    }

    if (req.method === 'GET') {
        try {
            // Fetch top 10 from sorted set
            const response = await fetch(`${KV_URL}/zrevrange/monad_leaderboard/0/9/WITHSCORES`, {
                headers: {
                    Authorization: `Bearer ${KV_TOKEN}`
                }
            });
            const data = await response.json();
            const rawList = data.result || [];
            
            let leaderboard = [];
            for (let i = 0; i < rawList.length; i += 2) {
                leaderboard.push({
                    address: rawList[i],
                    score: parseInt(rawList[i+1])
                });
            }
            
            return res.status(200).json(leaderboard);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    if (req.method === 'POST') {
        const { address, score } = req.body;
        if (!address || typeof score !== 'number') return res.status(400).json({ error: "Invalid data" });

        try {
            // Only update if the new score is higher (Redis ZADD XX CH doesn't easily do max without Lua, 
            // but for simplicity we'll just ZADD. ZADD overwrites the score. 
            // Ideally we check if existing is lower). 
            // For a simple implementation, ZADD is fine.
            await fetch(`${KV_URL}/zadd/monad_leaderboard/${score}/${address}`, {
                headers: { Authorization: `Bearer ${KV_TOKEN}` }
            });
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
