import { Film } from "lucide-react"
import type { RefObject } from "react"

import { EditorPreviewFrame } from "./editor-preview-frame"
import type { VideoFitMode, VideoProvider } from "./video-utils"

interface VideoEditorPreviewProps {
  url: string
  title: string
  ytId: string | null
  vimeoId: string | null
  provider: VideoProvider
  startAtSeconds: number
  autoplay: boolean
  muted: boolean
  loop: boolean
  showControls: boolean
  poster: string
  captionsUrl: string
  isHlsStream: boolean
  streamStatus: "idle" | "native" | "hls" | "error"
  fitMode: VideoFitMode
  previewAspectRatioClass: string
  videoRef: RefObject<HTMLVideoElement | null>
  onTitleChange: (title: string) => void
  onDurationChange: (event: React.SyntheticEvent<HTMLVideoElement>) => void
}

export function VideoEditorPreview({
  url,
  title,
  ytId,
  vimeoId,
  provider,
  startAtSeconds,
  autoplay,
  muted,
  loop,
  showControls,
  poster,
  captionsUrl,
  isHlsStream,
  streamStatus,
  fitMode,
  previewAspectRatioClass,
  videoRef,
  onTitleChange,
  onDurationChange,
}: VideoEditorPreviewProps) {
  return (
    <div className="min-h-0 min-w-0 md:w-[min(44rem,40vw)] md:max-w-[44rem] md:flex-none bg-[#f5f7fb]">
      <div className="flex min-h-full flex-col justify-center px-2 py-2 md:px-3 md:py-3">
        {!url ? (
          <EditorPreviewFrame
            cardType="video"
            title={title}
            onTitleChange={onTitleChange}
            className="mx-auto w-full max-w-2xl"
            bodyClassName={["flex items-center justify-center text-center", previewAspectRatioClass].join(" ")}
          >
            <div className="flex flex-col items-center gap-3 px-8 py-8">
              <Film size={30} className="text-neutral-300" />
              <p className="text-[13px] font-medium text-neutral-700">No video loaded</p>
              <p className="text-[11px] text-neutral-400">YouTube, Vimeo, MP4, and HLS sources are supported.</p>
            </div>
          </EditorPreviewFrame>
        ) : (
          <EditorPreviewFrame
            cardType="video"
            title={title}
            onTitleChange={onTitleChange}
            className="mx-auto w-full max-w-2xl"
            bodyClassName="overflow-hidden"
          >
            {ytId ? (
              <div className={previewAspectRatioClass}>
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?start=${startAtSeconds}&autoplay=${autoplay ? 1 : 0}&mute=${muted ? 1 : 0}&controls=${showControls ? 1 : 0}&rel=0&playsinline=1${loop ? `&loop=1&playlist=${ytId}` : ""}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                  title="YouTube preview"
                />
              </div>
            ) : vimeoId ? (
              <div className={previewAspectRatioClass}>
                <iframe
                  src={`https://player.vimeo.com/video/${vimeoId}?autoplay=${autoplay ? 1 : 0}&muted=${muted ? 1 : 0}&loop=${loop ? 1 : 0}&controls=${showControls ? 1 : 0}`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                  title="Vimeo preview"
                />
              </div>
            ) : provider === "direct" ? (
              <>
                <video
                  ref={videoRef}
                  controls={showControls}
                  autoPlay={autoplay}
                  muted={muted}
                  loop={loop}
                  playsInline
                  className={[previewAspectRatioClass, "w-full bg-white", fitMode === "cover" ? "object-cover" : "object-contain"].join(" ")}
                  poster={poster || undefined}
                  onDurationChange={onDurationChange}
                >
                  {captionsUrl && <track kind="captions" src={captionsUrl} default />}
                </video>
                {isHlsStream && (
                  <p className={`px-5 py-3 text-[10px] ${streamStatus === "error" ? "text-destructive" : "text-neutral-500"}`}>
                    {streamStatus === "hls" && "Adaptive streaming via hls.js"}
                    {streamStatus === "native" && "Adaptive streaming — native"}
                    {streamStatus === "error" && "HLS stream failed to load"}
                    {streamStatus === "idle" && "Loading stream…"}
                  </p>
                )}
              </>
            ) : null}
          </EditorPreviewFrame>
        )}
      </div>
    </div>
  )
}