"use client"

import { Tldraw } from "tldraw"
import "tldraw/tldraw.css"

interface WhiteboardCardInnerProps {
  persistenceKey: string
}

export default function WhiteboardCardInner({ persistenceKey }: WhiteboardCardInnerProps) {
  return (
    <div className="h-full w-full">
      <Tldraw persistenceKey={persistenceKey} />
    </div>
  )
}