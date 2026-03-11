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
        content: `You are a startup news researcher. Your job is to find the LATEST and MOST RECENT news about "${company}", a ${sector} company headquartered in ${locationHint}.

Run these specific web searches one by one:
1. "${company}" acquisition OR acquired OR acquires 2024 OR 2025
2. "${company}" funding OR raised OR investment OR series 2024 OR 2025
3. "${company}" site:inc42.com OR site:yourstory.com OR site:entrackr.com OR site:economictimes.com
4. "${company}" ${locationHint} startup news 2025

CRITICAL RULES:
- Only return news about THIS exact company "${company}" — not any other company with a similar name
- Prioritize the MOST RECENT articles first (2025 > 2024 > older)
- If Inc42, YourStory, Entrackr or Economic Times covered this company, those MUST be included
- Include acquisitions, fundraises, partnerships, product launches, expansions — anything newsworthy
- Be specific: include exact amounts, investor names, acquisition targets, dates

Return ONLY raw JSON, no markdown, no backticks:
{"articles":[{"headline":"specific factual headline","snippet":"2-3 sentence summary with specific details like amounts, names, what happened","source":"Publication name","date":"Month Year","url":"direct article url","category":"funding|expansion|partnership|general"}]}

Categories: funding=raised money/valuation, expansion=new markets/global, partnership=deals/tie-ups/acquisitions, general=product/awards/leadership.
Find up to 4 real distinct articles. Return valid JSON only.`
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
