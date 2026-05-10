import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();
const OCR_KEY = process.env.OCR_SPACE_API_KEY || 'helloworld';

router.post('/', async (req, res) => {
  const { base64Image } = req.body;
  if (!base64Image) return res.status(400).json({ error: 'base64Image required' });

  try {
    const formData = new URLSearchParams();
    formData.append('apikey', OCR_KEY);
    formData.append('language', 'eng');
    formData.append('base64image', base64Image);

    const resp = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(500).json({ error: 'OCR API error', details: errText });
    }

    const data = await resp.json();
    const text = data?.ParsedResults?.[0]?.ParsedText ?? 'No text found';
    res.json({ text: text.trim() });
  } catch (e) {
    console.error('[OCR] error:', e);
    res.status(500).json({ error: 'OCR failed' });
  }
});

export default router;
