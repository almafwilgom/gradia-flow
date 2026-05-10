import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;

router.post('/', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  try {
    const aiRes = await fetch(
      'https://text.pollinations.ai/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }]
        }),
      }
    );

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return res.status(500).json({ error: 'AI error', details: err });
    }

    const text = await aiRes.text();
    res.json({ answer: text });
  } catch (e) {
    console.error('[AI] error:', e);
    res.status(500).json({ error: 'internal error' });
  }
});

export default router;
