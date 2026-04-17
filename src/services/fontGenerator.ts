import { GoogleGenAI, Type } from '@google/genai';
import opentype from 'opentype.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const AZ_CHARS = "ABCÇDEƏFGĞHXIİJKQLMNOÖPRSŞTUÜVYZabcçdeəfgğhxıijkqlmnoöprsştuüvyz0123456789.,!?";

const glyphSchema = {
  type: Type.OBJECT,
  properties: {
    glyphs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          char: { type: Type.STRING },
          advanceWidth: { type: Type.NUMBER },
          commands: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                cmd: { type: Type.STRING },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                x1: { type: Type.NUMBER },
                y1: { type: Type.NUMBER },
                x2: { type: Type.NUMBER },
                y2: { type: Type.NUMBER }
              },
              required: ["cmd"]
            }
          }
        },
        required: ["char", "advanceWidth", "commands"]
      }
    }
  },
  required: ["glyphs"]
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function safeJsonParse(text: string) {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from markdown blocks if present
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e2) {
        // Still failed
      }
    }
    
    // Try to find the first '{' and last '}'
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (e3) {
        // Still failed
      }
    }
    
    throw e; // Re-throw original error if all attempts fail
  }
}

async function generateWithRetry(requestFn: () => Promise<any>, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await requestFn();
      // Validate that we can parse the response if it's expected to be JSON
      if (response && typeof response.text === 'string') {
        safeJsonParse(response.text);
      }
      return response;
    } catch (error: any) {
      const errorString = String(error?.message || error) + JSON.stringify(error);
      const isRateLimit = error?.status === 429 || 
                          error?.status === 'RESOURCE_EXHAUSTED' ||
                          error?.error?.code === 429 ||
                          error?.error?.status === 'RESOURCE_EXHAUSTED' ||
                          errorString.includes('429') || 
                          errorString.includes('quota') ||
                          errorString.includes('RESOURCE_EXHAUSTED');
      
      const isJsonError = error instanceof SyntaxError || errorString.includes('JSON');
                          
      if ((isRateLimit || isJsonError) && attempt < maxRetries - 1) {
        const waitTime = (isRateLimit ? 5000 : 2000) * Math.pow(2, attempt);
        console.warn(`${isRateLimit ? 'Rate limit' : 'JSON error'} hit. Retrying in ${waitTime}ms...`);
        await delay(waitTime);
      } else {
        throw error;
      }
    }
  }
}

export async function generateFontBatches(
  theme: string,
  style: string,
  onProgress: (progress: number, message: string) => void
): Promise<opentype.Font> {
  const batches = [
    "ABCÇDEƏFGĞHXIİJKQLM",
    "NOÖPRSŞTUÜVYZ",
    "abcçdeəfgğhxıijkqlm",
    "noöprsştuüvyz0123456789.,!?"
  ];

  const allGlyphs: opentype.Glyph[] = [];

  allGlyphs.push(new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 500,
    path: new opentype.Path()
  }));

  allGlyphs.push(new opentype.Glyph({
    name: 'space',
    unicode: 32,
    advanceWidth: 300,
    path: new opentype.Path()
  }));

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    onProgress((i / batches.length) * 100, `Generating characters: ${batch}`);

    if (i > 0) {
      // Reduced delay to speed up process while still respecting rate limits
      await delay(2000);
    }

    try {
      const response = await generateWithRetry(() => ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `You are a typography expert and font designer. I need you to design a font based on the following theme: '${theme}', style: '${style}'.
Please generate the glyphs for the following characters: ${batch}.
The font should be highly stylized according to the theme (e.g., if the theme is 'Nordic runes', the letters should look like runes but still be recognizable as the original letters).
For each character, provide the drawing commands to construct its glyph on a 1000x1000 grid.
- IMPORTANT: The coordinate system has y pointing UP. y=0 is the baseline, y=800 is the ascender, y=-200 is the descender.
- Return a JSON object with a 'glyphs' array.
- Supported commands: M (move), L (line), Q (quadratic bezier), C (cubic bezier), Z (close).
- Ensure the paths are closed (end with Z) and filled properly.
- Keep the design simple but representative of the theme. Use straight lines for runes, brush strokes for Chinese, etc.
- IMPORTANT: The 'advanceWidth' should be appropriate for the character (e.g., 600 for most, 300 for I/i).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: glyphSchema,
          maxOutputTokens: 8192
        }
      }));

      const json = safeJsonParse(response.text || "{}");
      if (json && Array.isArray(json.glyphs)) {
        for (const g of json.glyphs) {
          if (!g || typeof g.char !== 'string' || g.char.length === 0 || !Array.isArray(g.commands)) continue;
          const path = new opentype.Path();
          for (const c of g.commands) {
            if (!c || typeof c.cmd !== 'string') continue;
            switch (c.cmd) {
              case 'M': 
                if (typeof c.x === 'number' && typeof c.y === 'number') path.moveTo(c.x, c.y); 
                break;
              case 'L': 
                if (typeof c.x === 'number' && typeof c.y === 'number') path.lineTo(c.x, c.y); 
                break;
              case 'Q': 
                if (typeof c.x1 === 'number' && typeof c.y1 === 'number' && typeof c.x === 'number' && typeof c.y === 'number') path.quadraticCurveTo(c.x1, c.y1, c.x, c.y); 
                break;
              case 'C': 
                if (typeof c.x1 === 'number' && typeof c.y1 === 'number' && typeof c.x2 === 'number' && typeof c.y2 === 'number' && typeof c.x === 'number' && typeof c.y === 'number') path.curveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y); 
                break;
              case 'Z': 
                path.close(); 
                break;
            }
          }
          allGlyphs.push(new opentype.Glyph({
            name: g.char,
            unicode: g.char.charCodeAt(0),
            advanceWidth: typeof g.advanceWidth === 'number' ? g.advanceWidth : 600,
            path: path
          }));
        }
      }
    } catch (e) {
      console.error("Failed to parse batch", batch, e);
      throw e; // Re-throw to be caught by the UI
    }
  }

  onProgress(100, "Compiling font...");

  const font = new opentype.Font({
    familyName: 'AzFont',
    styleName: style,
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: allGlyphs
  });

  return font;
}

export async function generateFontFromImage(
  base64Image: string,
  mimeType: string,
  style: string,
  onProgress: (progress: number, message: string) => void
): Promise<opentype.Font> {
  const batches = [
    "ABCÇDEƏFGĞHXIİJKQLM",
    "NOÖPRSŞTUÜVYZ",
    "abcçdeəfgğhxıijkqlm",
    "noöprsştuüvyz0123456789.,!?"
  ];

  const allGlyphs: opentype.Glyph[] = [];

  allGlyphs.push(new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 500,
    path: new opentype.Path()
  }));

  allGlyphs.push(new opentype.Glyph({
    name: 'space',
    unicode: 32,
    advanceWidth: 300,
    path: new opentype.Path()
  }));

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    onProgress((i / batches.length) * 100, `Extracting characters: ${batch}`);

    if (i > 0) {
      // Reduced delay to speed up process while still respecting rate limits
      await delay(2000);
    }

    try {
      const response = await generateWithRetry(() => ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: `You are a typography expert. I have provided an image containing handwritten text.
Please analyze the handwriting style and generate a complete font based on it.
The requested style variation is: '${style}'. Adjust the thickness or slant if Bold or Italic is requested.
Generate the glyphs for the following Azerbaijani characters: ${batch}.
For each character, provide the drawing commands to construct its glyph on a 1000x1000 grid.
- IMPORTANT: The coordinate system has y pointing UP. y=0 is the baseline, y=800 is the ascender, y=-200 is the descender.
- Return a JSON object with a 'glyphs' array.
- Supported commands: M (move), L (line), Q (quadratic bezier), C (cubic bezier), Z (close).
- Ensure the paths are closed (end with Z) and filled properly.
- The 'advanceWidth' should be appropriate for the character.`
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: glyphSchema,
          maxOutputTokens: 8192
        }
      }));

      const json = safeJsonParse(response.text || "{}");
      if (json && Array.isArray(json.glyphs)) {
        for (const g of json.glyphs) {
          if (!g || typeof g.char !== 'string' || g.char.length === 0 || !Array.isArray(g.commands)) continue;
          const path = new opentype.Path();
          for (const c of g.commands) {
            if (!c || typeof c.cmd !== 'string') continue;
            switch (c.cmd) {
              case 'M': 
                if (typeof c.x === 'number' && typeof c.y === 'number') path.moveTo(c.x, c.y); 
                break;
              case 'L': 
                if (typeof c.x === 'number' && typeof c.y === 'number') path.lineTo(c.x, c.y); 
                break;
              case 'Q': 
                if (typeof c.x1 === 'number' && typeof c.y1 === 'number' && typeof c.x === 'number' && typeof c.y === 'number') path.quadraticCurveTo(c.x1, c.y1, c.x, c.y); 
                break;
              case 'C': 
                if (typeof c.x1 === 'number' && typeof c.y1 === 'number' && typeof c.x2 === 'number' && typeof c.y2 === 'number' && typeof c.x === 'number' && typeof c.y === 'number') path.curveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y); 
                break;
              case 'Z': 
                path.close(); 
                break;
            }
          }
          allGlyphs.push(new opentype.Glyph({
            name: g.char,
            unicode: g.char.charCodeAt(0),
            advanceWidth: typeof g.advanceWidth === 'number' ? g.advanceWidth : 600,
            path: path
          }));
        }
      }
    } catch (e) {
      console.error("Failed to parse batch", batch, e);
      throw e; // Re-throw to be caught by the UI
    }
  }

  onProgress(100, "Compiling font...");

  const font = new opentype.Font({
    familyName: 'HandwrittenFont',
    styleName: style,
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: allGlyphs
  });

  return font;
}
