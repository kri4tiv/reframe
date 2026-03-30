export type Format = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9'

export interface FormatSpec {
  ratio:    Format
  slug:     string
  label:    string
  w:        number
  h:        number
  platform: string
}

// Pixel dimensions are the industry-standard sizes for each ratio.
// All are exact — no rounding that breaks the ratio.
export const FORMAT_SPECS: Record<Format, FormatSpec> = {
  '1:1':  { ratio: '1:1',  slug: '1x1',   label: 'Square',     w: 1080, h: 1080, platform: 'Instagram Feed · Meta Ads' },
  '3:4':  { ratio: '3:4',  slug: '3x4',   label: 'Portrait',   w: 1080, h: 1440, platform: 'Pinterest · Stories · Print' },
  '4:3':  { ratio: '4:3',  slug: '4x3',   label: 'Landscape',  w: 1080, h:  810, platform: 'Facebook · Presentations' },
  '9:16': { ratio: '9:16', slug: '9x16',  label: 'Story',      w: 1080, h: 1920, platform: 'Stories · Reels · TikTok' },
  '16:9': { ratio: '16:9', slug: '16x9',  label: 'Widescreen', w: 1920, h: 1080, platform: 'YouTube · Display · Hero' },
  '21:9': { ratio: '21:9', slug: '21x9',  label: 'Ultrawide',  w: 2520, h: 1080, platform: 'Cinematic · Billboard · OOH' },
}

export interface GenerationResult {
  ratio:        Format
  slug:         string
  px:           string
  filename:     string
  dataUrl:      string
  method:       'crop' | 'extend' | 'recompose'
}

export interface GenerationJob {
  id:          string
  userId?:     string
  sessionId:   string
  formats:     Format[]
  results:     GenerationResult[]
  sourceUrl:   string
  createdAt:   string
  status:      'pending' | 'processing' | 'done' | 'failed'
}

export interface User {
  id:                string
  email:             string
  freeGensUsed:      number
  freeGensTotal:     number
  totalGenerations:  number
  apiKeySet:         boolean
  createdAt:         string
}

export interface ApiResponse<T> {
  success: boolean
  data?:   T
  error?:  string
}
