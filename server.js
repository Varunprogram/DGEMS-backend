const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/news', async (req, res) => {
  const { company, sector, hq } = req.body;
  if (!company) return res.status(400).json({ error: 'Company name required' });

  const locationHint = hq === 'India' ? 'India' : hq;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `You are a startup news researcher. Search for the latest news about "${company}", a ${sector} company headquartered in ${locationHint}.

Search using:
1. "${company}" ${locationHint} ${sector} news 2025
2. "${company}" funding raised investors
3. "${company}" expansion partnership deal

IMPORTANT: Only return news about THIS specific company. Ignore companies with similar names.
Look at: Economic Times, TechCrunch, YourStory, Inc42, Entrackr, Business Standard, Mint, Forbes India, Crunchbase.

Return ONLY raw JSON, no markdown, no backticks:
{"articles":[{"headline":"specific headline","snippet":"2-3 sentence summary with specific details like amounts and names","source":"Publication","date":"Month Year","url":"direct article url or google search url","category":"funding|expansion|partnership|general"}]}

Find up to 4 real articles. Be specific with numbers and names. Return valid JSON only.`
      }]
    });

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1) return res.json({ articles: [] });
    const parsed = JSON.parse(text.substring(start, end + 1));
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, articles: [] });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`DGEMS server running on port ${PORT}`));
