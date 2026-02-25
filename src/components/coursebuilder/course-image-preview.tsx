import Image from "next/image"

type CourseImagePreviewProps = {
  imageUrl: string | null
  alt: string
  heightClassName: string
  emptyText: string
  emptyTextClassName?: string
}

export function CourseImagePreview({
  imageUrl,
  alt,
  heightClassName,
  emptyText,
  emptyTextClassName = "text-xs italic text-muted-foreground/50",
}: CourseImagePreviewProps) {
  if (!imageUrl) {
    return (
      <div className={`relative ${heightClassName} flex items-center justify-center bg-muted/50`}>
        <span className={emptyTextClassName}>{emptyText}</span>
      </div>
    )
  }

  return (
    <div className={`relative ${heightClassName} overflow-hidden`}>
      <Image
        src={imageUrl}
        alt={alt}
        fill
        unoptimized
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 560px"
      />
    </div>
  )
}
