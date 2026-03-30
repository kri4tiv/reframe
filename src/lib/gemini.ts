import { GoogleGenAI, Modality } from '@google/genai'
import { FORMAT_SPECS, type Format, type GenerationResult } from '@/types'

const SYSTEM_PROMPT = `You are REFRAME — an intelligent creative recomposition engine for marketing teams.

Your job: take the uploaded image and recompose it perfectly for the target aspect ratio. Think like a senior art director.

RULES:
1. HEADINGS ARE SACRED — any text/headline must remain fully legible. Never crop it. Reposition to the strongest zone for the new format.
2. EXTEND BEFORE CROPPING — when the target needs more canvas, extend the background seamlessly. Never stretch or warp content.
3. CHARACTER QUALITY — all people, products, logos stay whole and undistorted.
4. HEADING PLACEMENT BY FORMAT:
   - 9:16 Story: heading upper third, logo bottom-centre
   - 1:1 Square: heading centre or lower half, logo bottom-right
   - 3:4 Portrait: heading upper third, logo bottom-right
   - 4:3 Landscape: heading left zone vertically centred, logo bottom-right
   - 16:9 Widescreen: heading left zone vertically centred, logo bottom-right
   - 21:9 Ultrawide: heading left third vertically centred, logo right side
5. PREMIUM OUTPUT — generous padding, clean composition, no crowding.

Output the recomposed image at exactly the target dimensions. High quality. Ready to use.`

export async function recomposeImage(
  imageBase64: string,
  mimeType: string,
  targetFormats: Format[],
  apiKey: string,
  filename: string
): Promise<GenerationResult[]> {
  const ai = new GoogleGenAI({ apiKey })
  const results: GenerationResult[] = []

  for (const format of targetFormats) {
    const spec = FORMAT_SPECS[format]

    const prompt = `${SYSTEM_PROMPT}

Recompose this image for ${spec.label} format (${spec.ratio}, ${spec.w}×${spec.h}px).
Use case: ${spec.platform}

Apply the correct heading placement for ${spec.ratio}. Extend the background if needed. Output at exactly ${spec.w}×${spec.h}px.`

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    })

    let imageData: string | null = null
    const parts = response.candidates?.[0]?.content?.parts || []
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageData = part.inlineData.data ?? null
        break
      }
    }

    if (!imageData) throw new Error(`No image returned for format ${format}`)

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const baseName = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()

    results.push({
      ratio: format,
      slug: spec.slug,
      px: `${spec.w}×${spec.h}`,
      filename: `${baseName}_${spec.slug}_${date}.png`,
      dataUrl: `data:image/png;base64,${imageData}`,
      method: 'recompose',
    })
  }

  return results
}
