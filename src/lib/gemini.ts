import { FORMAT_SPECS, type Format, type GenerationResult } from '@/types'

const REFRAME_SYSTEM_PROMPT = `You are REFRAME — an intelligent creative recomposition engine for marketing teams.

Your job: take an uploaded image and recompose it perfectly for a new aspect ratio. You are not a crop tool. You think like a senior art director.

WHAT YOU DO
You receive an image and a target format. You analyse the composition — headline, logo, subject, background — and output a new high-quality image at the exact target dimensions, with everything preserved and intelligently repositioned.

COMPOSITION RULES

1. HEADINGS ARE SACRED
Any text/headline in the source must appear fully legible in the output. Never crop it. If it won't fit in the same position, move it to the strongest compositional zone for the new format:
  - 9:16 Story:     heading upper third, logo bottom-centre
  - 1:1 Square:     heading lower-centre or centre, logo bottom-right  
  - 3:4 Portrait:   heading upper third, logo bottom-right
  - 4:5 Instagram:  heading upper third, visual below, logo bottom-right
  - 16:9 Landscape: heading left zone vertically centred, logo bottom-right
  - 3:1 Banner:     heading left half vertically centred, logo right side

2. EXTEND BEFORE YOU CROP
When the target format needs more canvas than the source provides, extend the background first. Sample and continue the existing background colour, gradient or texture seamlessly. Never stretch or warp existing content.

3. CHARACTER AND SUBJECT QUALITY
All people, products, logos and branded elements must remain at full quality. No distortion, no blurring, no stretching. If a person or product is present, they stay whole and intact.

4. BRAND SIGNALS
Logos must be fully visible with clear space. If the original logo position gets cropped in the new format, move it to the nearest clean corner.

5. PREMIUM BALANCE
Generous padding around all text (minimum 5% of frame width). Clean composition. No crowding. Every output should feel intentional and high quality.

OUTPUT
Generate the recomposed image at exactly the specified dimensions. High quality. Ready to use.`

export async function recomposeImage(
  imageBase64: string,
  mimeType: string,
  targetFormats: Format[],
  apiKey: string,
  filename: string
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = []

  for (const format of targetFormats) {
    const spec = FORMAT_SPECS[format]

    const prompt = `Recompose this image for the ${spec.label} format (${spec.ratio}, ${spec.w}×${spec.h}px).

Target: ${spec.w}×${spec.h}px exactly
Use case: ${spec.platform}

Apply intelligent art direction:
- Analyse what's in this image (headings, logos, subjects, background)
- Determine the best recomposition strategy: extend canvas, smart crop, or reposition elements
- Apply correct heading placement for ${spec.ratio} format (see your rules)
- Ensure all text remains fully legible
- Maintain subject and character quality
- Output should feel premium, intentional, and ready for production

Generate the recomposed image now at exactly ${spec.w}×${spec.h}px.`

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: REFRAME_SYSTEM_PROMPT }] },
            contents: [
              {
                role: 'user',
                parts: [
                  { inline_data: { mime_type: mimeType, data: imageBase64 } },
                  { text: prompt },
                ],
              },
            ],
            generation_config: {
              response_modalities: ['image', 'text'],
            },
          }),
        }
      )

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err?.error?.message || `API error ${response.status}`)
      }

      const data = await response.json()

      // Extract image from response parts
      let imageData: string | null = null
      for (const part of data?.candidates?.[0]?.content?.parts || []) {
        if (part.inline_data?.mime_type?.startsWith('image/')) {
          imageData = part.inline_data.data
          break
        }
      }

      if (!imageData) throw new Error('No image returned for format ' + format)

      const date      = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const baseName  = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
      const outputFilename = `${baseName}_${spec.slug}_${date}.png`

      results.push({
        ratio:    format,
        slug:     spec.slug,
        px:       `${spec.w}×${spec.h}`,
        filename: outputFilename,
        dataUrl:  `data:image/png;base64,${imageData}`,
        method:   'recompose',
      })
    } catch (err) {
      console.error(`[reframe] Failed format ${format}:`, err)
      throw err
    }
  }

  return results
}
