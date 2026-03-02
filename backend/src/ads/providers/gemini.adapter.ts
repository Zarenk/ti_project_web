import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import {
  ProductContext,
  ProductAnalysis,
  AdCopyVariation,
  AdTone,
  AdStyle,
  AdGenerationResult,
} from './interfaces';

@Injectable()
export class GeminiAdapter {
  private readonly logger = new Logger(GeminiAdapter.name);
  private _ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not set — ad generation will be unavailable');
    } else {
      this._ai = new GoogleGenAI({ apiKey });
    }
  }

  private get ai(): GoogleGenAI {
    if (!this._ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'GEMINI_API_KEY is not configured. Set it in your .env file to enable ad generation.',
        );
      }
      this._ai = new GoogleGenAI({ apiKey });
    }
    return this._ai;
  }

  /**
   * Step 1: Vision — analyze product image + data
   */
  async analyzeProduct(
    imageUrl: string,
    productData: ProductContext,
  ): Promise<ProductAnalysis> {
    const imageBase64 = await this.imageToBase64(imageUrl);

    const prompt = `Analiza esta imagen de producto y los siguientes datos para generar información publicitaria.

Datos del producto:
- Nombre: ${productData.name}
- Precio: S/ ${productData.price.toFixed(2)}
${productData.priceSell ? `- Precio de venta: S/ ${productData.priceSell.toFixed(2)}` : ''}
${productData.brand ? `- Marca: ${productData.brand}` : ''}
${productData.category ? `- Categoría: ${productData.category}` : ''}
${productData.description ? `- Descripción: ${productData.description}` : ''}
${productData.features?.length ? `- Características: ${productData.features.map((f) => f.title).join(', ')}` : ''}

Responde en JSON con esta estructura exacta:
{
  "dominantColors": ["color1", "color2", "color3"],
  "productType": "tipo de producto",
  "mood": "estado de ánimo que transmite",
  "targetAudience": "audiencia objetivo",
  "keyFeatures": ["característica1", "característica2", "característica3"]
}`;

    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (imageBase64) {
      parts.push({
        inlineData: { data: imageBase64, mimeType: 'image/jpeg' },
      });
    }

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts }],
      config: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });

    return this.parseJson<ProductAnalysis>(response.text || '{}');
  }

  /**
   * Step 2: Text — generate 3 ad copy variations
   */
  async generateAdCopy(
    analysis: ProductAnalysis,
    productData: ProductContext,
    tone: AdTone,
  ): Promise<AdCopyVariation[]> {
    const prompt = `Eres un experto en marketing digital para el mercado peruano.
Genera EXACTAMENTE 3 variaciones de copy publicitario para redes sociales.

Producto: ${productData.name}
Precio: S/ ${productData.price.toFixed(2)}
${productData.priceSell ? `Precio de venta: S/ ${productData.priceSell.toFixed(2)}` : ''}
${productData.brand ? `Marca: ${productData.brand}` : ''}
${productData.category ? `Categoría: ${productData.category}` : ''}
Tipo: ${analysis.productType ?? 'producto'}
Audiencia: ${analysis.targetAudience ?? 'público general'}
Mood: ${analysis.mood ?? 'neutro'}
Características clave: ${(analysis.keyFeatures ?? []).join(', ') || 'sin datos'}

Tono deseado: ${tone}

Reglas:
- Títulos máximo 60 caracteres
- Descripciones máximo 200 caracteres
- 5-10 hashtags relevantes para Perú
- CTAs atractivos en español
- Usar soles (S/) para precios
- Incluir jerga peruana cuando sea apropiado para el tono casual

Responde en JSON: array de 3 objetos con { title, description, hashtags, cta, tone }`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.8,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });

    const raw = this.parseJson<AdCopyVariation[]>(response.text || '[]');
    const variations = Array.isArray(raw) ? raw : [];
    return variations.map((v) => ({
      title: v.title ?? '',
      description: v.description ?? '',
      hashtags: Array.isArray(v.hashtags) ? v.hashtags : [],
      cta: v.cta ?? '',
      tone: v.tone ?? tone,
    }));
  }

  /**
   * Full pipeline: analyze → generate copy
   * Uses original product image (Imagen 3 requires paid Vertex AI).
   */
  async generateFromProduct(
    imageUrl: string,
    productData: ProductContext,
    tone: AdTone = 'profesional',
    _style: AdStyle = 'moderno',
  ): Promise<AdGenerationResult> {
    // Step 1: Analyze product with Vision
    const analysis = await this.analyzeProduct(imageUrl, productData);

    // Step 2: Generate copy variations
    const variations = await this.generateAdCopy(analysis, productData, tone);

    // Use original product image (AI image generation requires Vertex AI paid plan)
    const imageUrls = imageUrl ? [imageUrl] : [];

    // Cost: Vision ~$0.00015 + Text ~$0.0005
    const costUsd = 0.00065;

    return { analysis, variations, imageUrls, costUsd };
  }

  private async imageToBase64(imageUrl: string): Promise<string | null> {
    try {
      if (imageUrl.startsWith('http')) {
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        return buffer.toString('base64');
      }

      // Local file path
      const filePath = path.join(
        process.cwd(),
        imageUrl.replace(/^\//, ''),
      );
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath).toString('base64');
      }

      return null;
    } catch (err) {
      this.logger.warn(`Failed to read image: ${(err as Error).message}`);
      return null;
    }
  }

  private parseJson<T>(text: string): T {
    let jsonText = text.trim();

    // Strip markdown code fences (Gemini Known Issue #10)
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Extract JSON object/array if wrapped in extra text
    const objectMatch = jsonText.match(/(\{[\s\S]*\})/);
    const arrayMatch = jsonText.match(/(\[[\s\S]*\])/);
    if (!jsonText.startsWith('{') && !jsonText.startsWith('[')) {
      jsonText = objectMatch?.[1] || arrayMatch?.[1] || jsonText;
    }

    // Remove trailing commas before } or ] (common Gemini issue)
    jsonText = jsonText.replace(/,\s*([\]}])/g, '$1');

    // Remove control characters that break JSON.parse
    jsonText = jsonText.replace(/[\x00-\x1f\x7f]/g, (ch) =>
      ch === '\n' || ch === '\r' || ch === '\t' ? ch : '',
    );

    try {
      return JSON.parse(jsonText);
    } catch (err) {
      // Attempt truncation recovery: close unterminated strings, arrays, objects
      const repaired = this.repairTruncatedJson(jsonText);
      if (repaired !== jsonText) {
        try {
          this.logger.warn('JSON was truncated, repaired successfully');
          return JSON.parse(repaired);
        } catch {
          // repair didn't help
        }
      }
      this.logger.warn(`JSON parse failed, raw text: ${text.substring(0, 300)}`);
      throw err;
    }
  }

  /**
   * Attempt to repair truncated JSON by closing open strings, arrays, and objects.
   */
  private repairTruncatedJson(text: string): string {
    let result = text.trimEnd();

    // If ends mid-string (odd number of unescaped quotes), close the string
    let inString = false;
    for (let i = 0; i < result.length; i++) {
      if (result[i] === '\\' && inString) {
        i++; // skip escaped char
        continue;
      }
      if (result[i] === '"') inString = !inString;
    }
    if (inString) result += '"';

    // Remove trailing comma after closing the string
    result = result.replace(/,\s*$/, '');

    // Count open brackets/braces and close them
    const stack: string[] = [];
    inString = false;
    for (let i = 0; i < result.length; i++) {
      const ch = result[i];
      if (ch === '\\' && inString) {
        i++;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if (ch === '}' || ch === ']') stack.pop();
    }

    // Close in reverse order
    while (stack.length > 0) {
      result += stack.pop();
    }

    return result;
  }
}
