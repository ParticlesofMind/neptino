import Image from "next/image"

type CourseImagePreviewProps = {
  imageUrl: string | null
  alt: string
  emptyText: string
  emptyTextClassName?: string
  frameClassName?: string
  loading?: "eager" | "lazy"
}

export function CourseImagePreview({
  imageUrl,
  alt,
  emptyText,
  emptyTextClassName = "text-xs italic text-muted-foreground/50",
  frameClassName = "w-full aspect-[4/3]",
  loading = "eager",
}: CourseImagePreviewProps) {
  if (!imageUrl) {
    return (
      <div className={`relative ${frameClassName} flex items-center justify-center bg-muted/50`}>
        <span className={emptyTextClassName}>{emptyText}</span>
      </div>
    )
  }

  return (
    <div className={`relative ${frameClassName} overflow-hidden`}>
      <Image
        src={imageUrl}
        alt={alt}
        fill
        unoptimized
        className="object-cover"
        loading={loading}
        sizes="(max-width: 768px) 100vw, 560px"
      />
    </div>
  )
}
