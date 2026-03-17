export type VideoProvider = "youtube" | "vimeo" | "direct"
export type VideoAspectRatio = "16:9" | "4:3" | "1:1" | "9:16"
export type VideoFitMode = "contain" | "cover"

export interface VideoPlaybackOptions {
  startAtSeconds?: number
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  showControls?: boolean
}

export function detectVideoProvider(url: string): VideoProvider {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube"
  if (/vimeo\.com/.test(url)) return "vimeo"
  return "direct"
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return match ? match[1] : null
}

export function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/)
  return match ? match[1] : null
}

export function resolveVideoEmbedUrl(url: string, options: VideoPlaybackOptions = {}): string | null {
  if (!url) return null

  const youtubeId = extractYouTubeId(url)
  if (youtubeId) {
    const params = new URLSearchParams({
      start: String(options.startAtSeconds ?? 0),
      autoplay: options.autoplay ? "1" : "0",
      mute: options.muted ? "1" : "0",
      controls: options.showControls === false ? "0" : "1",
      rel: "0",
      playsinline: "1",
    })
    if (options.loop) {
      params.set("loop", "1")
      params.set("playlist", youtubeId)
    }
    return `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`
  }

  const vimeoId = extractVimeoId(url)
  if (vimeoId) {
    const params = new URLSearchParams({
      autoplay: options.autoplay ? "1" : "0",
      muted: options.muted ? "1" : "0",
      loop: options.loop ? "1" : "0",
      controls: options.showControls === false ? "0" : "1",
    })
    if ((options.startAtSeconds ?? 0) > 0) {
      params.set("t", `${options.startAtSeconds}s`)
    }
    return `https://player.vimeo.com/video/${vimeoId}?${params.toString()}`
  }

  return null
}

export function getAspectRatioPadding(aspectRatio: VideoAspectRatio): string {
  const map: Record<VideoAspectRatio, string> = {
    "16:9": "56.25%",
    "4:3": "75%",
    "1:1": "100%",
    "9:16": "177.7778%",
  }
  return map[aspectRatio]
}

export function getAspectRatioClass(aspectRatio: VideoAspectRatio): string {
  const map: Record<VideoAspectRatio, string> = {
    "16:9": "aspect-video",
    "4:3": "aspect-[4/3]",
    "1:1": "aspect-square",
    "9:16": "aspect-[9/16]",
  }
  return map[aspectRatio]
}