import { GoogleGenAI, Modality } from '@google/genai'
import { FORMAT_SPECS, type Format, type GenerationResult } from '@/types'

const SYSTEM_PROMPT = `You are REFRAME - a professional image recomposition engine. Your job is to reformat an existing image into a new aspect ratio with photorealistic quality.

ABSOLUTE RULES - follow these without exception:

1. NEVER ADD TEXT
Do not add any text, headings, labels, titles, captions, or typographic elements that were not already present in the original image. If the original has no text, output no text. If it has text, preserve it exactly - same font style, same colour, same content, same relative position.

2. LOGO AND BRAND ELEMENTS - EXACT POSITION PRESERVATION
Detect where any logo or brand mark sits in the original (top-left, top-right, bottom-left, bottom-right, centre, etc). Place it in the exact same positional zone in the output. If the logo is bottom-right in the original, it must be bottom-right in the output. Do not move it.

3. PHOTOREALISTIC BACKGROUND EXTENSION
When the target ratio requires more canvas than the source provides, extend the background with photorealistic quality. The extension must:
- Match the lighting, colour temperature, depth of field, and atmosphere of the original exactly
- Continue any architectural elements, sky, ground, or environmental features naturally
- Be indistinguishable from the original - no AI artefacts, no blurry edges, no colour shift
- Use the same camera perspective and focal length as the original

4. NEVER CROP THE SUBJECT
The primary subject (person, product, object) must remain fully visible and intact in all outputs. Centre the subject appropriately for the format.

5. NO HALLUCINATION
Do not add people, objects, products, shadows, reflections, or any element that was not in the original image. Only extend what is already there.

6. OUTPUT QUALITY
Output must be high resolution, sharp, and indistinguishable from a professionally recomposed image. No compression artefacts, no blurring, no visible seams at extension boundaries.`

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isRetryable = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand') || msg.includes('overloaded')
      if (isRetryable && i < retries - 1) {
        await new Promise(r => setTimeout(r, delayMs * (i + 1)))
        continue
      }
      throw err
    }
  }
  throw new Error('Max retries exceeded')
}

export async function recomposeImage(
  imageBase64: string,
  mimeType: string,
  targetFormats: Format[],
  apiKey: string,
  filename: string
): Promise<GenerationResult[]> {
  const ai = new GoogleGenAI({ apiKey })
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const baseName = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()

  const results = await Promise.all(targetFormats.map(async (format) => {
    const spec = FORMAT_SPECS[format]

    const prompt = `Recompose this image into ${spec.label} format (${spec.ratio}, exactly ${spec.w}×${spec.h}px).

TASK:
- Reframe the composition for ${spec.ratio} aspect ratio
- If canvas extension is needed (the new ratio is wider or taller than the source): extend the background with photorealistic quality matching the original scene's lighting, atmosphere and environment
- If canvas reduction is needed: crop from the edges only, never from the subject
- Preserve all existing text and logos at their exact original positions - do not move, resize, or restyle them
- Do not add any new text, logos, or graphical elements whatsoever
- Subject must remain fully visible and centred appropriately

Output a single high-quality image at exactly ${spec.w}×${spec.h}px. Nothing else.`

    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: prompt },
          ],
        },
      ],
    }))

    let imageData: string | null = null
    const parts = response.candidates?.[0]?.content?.parts || []
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageData = part.inlineData.data ?? null
        break
      }
    }

    if (!imageData) throw new Error(`No image returned for format ${format}`)

    return {
      ratio: format,
      slug: spec.slug,
      px: `${spec.w}×${spec.h}`,
      filename: `${baseName}_${spec.slug}_${date}.png`,
      dataUrl: `data:image/png;base64,${imageData}`,
      method: 'recompose',
    } as GenerationResult
  }))

  return results
}
