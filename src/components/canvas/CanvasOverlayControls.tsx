"use client"

import { useState } from "react"
import {
  Ban,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Clapperboard,
  Crosshair,
  Grid3x3,
  Hammer,
  Hand,
  RotateCcw,
  Target,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import type { Mode, OverlayUi, SnapReference, ToolItem } from "@/components/canvas/create-view-types"
import { CanvasIconBtn } from "@/components/canvas/canvas-icon-btn"

function SnapToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-0.5 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-primary"
      />
      {label}
    </label>
  )
}

function EngineBtn({
  active,
  onClick,
  label,
  iconNode,
  title,
  compact,
  overlayUi,
}: {
  active?: boolean
  onClick?: () => void
  label?: string
  iconNode?: React.ReactNode
  title?: string
  compact?: boolean
  overlayUi?: OverlayUi
}) {
  return (
    <CanvasIconBtn
      active={active}
      onClick={onClick}
      title={title}
      label={label}
      iconNode={iconNode}
      compact={compact}
      overlayUi={overlayUi}
    />
  )
}

function SnapMenu({
  open,
  onClose,
  snapReference,
  onChangeReference,
}: {
  open: boolean
  onClose: () => void
  snapReference: SnapReference
  onChangeReference: (r: SnapReference) => void
}) {
  const [smartGuides, setSmartGuides] = useState(true)
  const [distLabels, setDistLabels] = useState(true)
  const [resizeGuides, setResizeGuides] = useState(true)
  const [smartSel, setSmartSel] = useState(true)
  const [colorCoding, setColorCoding] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [gridSpacing, setGridSpacing] = useState(20)

  if (!open) return null

  const refModes: { id: SnapReference; label: string; icon: React.ReactNode }[] = [
    { id: "canvas", label: "Canvas", icon: <Crosshair className="h-4 w-4" /> },
    { id: "object", label: "Object", icon: <Target className="h-4 w-4" /> },
    { id: "grid", label: "Grid", icon: <Grid3x3 className="h-4 w-4" /> },
  ]

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute left-12 top-24 z-30 w-56 rounded-lg border border-border bg-popover p-3 shadow-lg space-y-2 text-sm text-foreground">
        <SnapToggle checked={smartGuides} onChange={() => setSmartGuides(!smartGuides)} label="Smart Guides" />
        <div className="pl-3 space-y-1 border-l border-border">
          <SnapToggle checked={distLabels} onChange={() => setDistLabels(!distLabels)} label="Distance Labels" />
          <SnapToggle checked={resizeGuides} onChange={() => setResizeGuides(!resizeGuides)} label="Resize Guides" />
          <SnapToggle checked={smartSel} onChange={() => setSmartSel(!smartSel)} label="Smart Selection" />
          <SnapToggle checked={colorCoding} onChange={() => setColorCoding(!colorCoding)} label="Color Coding" />
        </div>

        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pt-1">
          Smart Guide Reference
        </div>
        <div className="flex gap-1">
          {refModes.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onChangeReference(r.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded p-1 text-[10px] transition ${
                snapReference === r.id
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </div>

        {snapReference === "grid" && (
          <div className="space-y-2 border-t border-border pt-2">
            <SnapToggle checked={showGrid} onChange={() => setShowGrid(!showGrid)} label="Show grid" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Spacing:</span>
              <input
                type="number"
                min={1}
                max={100}
                value={gridSpacing}
                onChange={(e) => setGridSpacing(Number(e.target.value))}
                className="w-16 rounded border border-border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-2 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Distribute
          </div>
          <div className="flex gap-1">
            {["Horizontally", "Vertically"].map((dir) => (
              <button
                key={dir}
                type="button"
                className="flex-1 rounded border border-border px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/60 hover:text-foreground transition"
              >
                {dir}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

interface CanvasOverlayControlsProps {
  overlayUi: OverlayUi
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  panMode: boolean
  onTogglePanMode: () => void
  scrollDisabled: boolean
  onToggleScrollDisabled: () => void
  snapMenuOpen: boolean
  onToggleSnapMenu: () => void
  onCloseSnapMenu: () => void
  snapReference: SnapReference
  setSnapReference: (value: SnapReference) => void
  changePage: (page: number) => void
  clampedCurrentPage: number
  totalPages: number
  toolOptions: React.ReactNode
  mode: Mode
  onModeChange: (mode: Mode) => void
  currentTools: ToolItem[]
  selectedTool: string
  panActive: boolean
  onToolSelect: (id: string) => void
}

export function CanvasOverlayControls({
  overlayUi,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  panMode,
  onTogglePanMode,
  scrollDisabled,
  onToggleScrollDisabled,
  snapMenuOpen,
  onToggleSnapMenu,
  onCloseSnapMenu,
  snapReference,
  setSnapReference,
  changePage,
  clampedCurrentPage,
  totalPages,
  toolOptions,
  mode,
  onModeChange,
  currentTools,
  selectedTool,
  panActive,
  onToolSelect,
}: CanvasOverlayControlsProps) {
  return (
    <>
      <div className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-0.5 rounded-lg border border-border bg-background/90 ${overlayUi.toolButtonPadding} shadow-sm backdrop-blur-sm`}>
        <div
          title="Current zoom level — Ctrl/Cmd+scroll to zoom"
          className={`py-1 ${overlayUi.zoomValueText} font-semibold tabular-nums text-muted-foreground`}
        >
          {zoom}%
        </div>

        <EngineBtn
          label="Focus"
          iconNode={<ZoomIn className={overlayUi.zoomButtonIcon} />}
          onClick={onZoomIn}
          overlayUi={overlayUi}
        />
        <EngineBtn
          label="Expand"
          iconNode={<ZoomOut className={overlayUi.zoomButtonIcon} />}
          onClick={onZoomOut}
          overlayUi={overlayUi}
        />
        <EngineBtn
          label="Reset"
          iconNode={<RotateCcw className={overlayUi.zoomButtonIcon} />}
          onClick={onZoomReset}
          overlayUi={overlayUi}
        />
        <EngineBtn
          label="Grab"
          iconNode={<Hand className={overlayUi.zoomButtonIcon} />}
          active={panMode}
          onClick={onTogglePanMode}
          overlayUi={overlayUi}
        />
        <EngineBtn
          label="Grid"
          iconNode={<Grid3x3 className={overlayUi.zoomButtonIcon} />}
          active={snapMenuOpen}
          onClick={onToggleSnapMenu}
          overlayUi={overlayUi}
        />
        <EngineBtn
          label="No Scroll"
          iconNode={<Ban className={overlayUi.zoomButtonIcon} />}
          active={scrollDisabled}
          onClick={onToggleScrollDisabled}
          overlayUi={overlayUi}
        />
      </div>

      <SnapMenu
        open={snapMenuOpen}
        onClose={onCloseSnapMenu}
        snapReference={snapReference}
        onChangeReference={setSnapReference}
      />

      <div className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-0.5 rounded-lg border border-border bg-background/90 ${overlayUi.toolButtonPadding} shadow-sm backdrop-blur-sm`}>
        <EngineBtn
          label="First"
          onClick={() => changePage(1)}
          iconNode={<ChevronsUp className={overlayUi.scrollButtonIcon} />}
          overlayUi={overlayUi}
        />
        <EngineBtn
          label="Prev"
          onClick={() => changePage(clampedCurrentPage - 1)}
          iconNode={<ChevronUp className={overlayUi.scrollButtonIcon} />}
          overlayUi={overlayUi}
        />
        <div className={`flex flex-col items-center py-1 ${overlayUi.scrollPageText} text-muted-foreground`}>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={clampedCurrentPage}
            onChange={(e) => changePage(Number(e.target.value))}
            className={`${overlayUi.scrollInputText} rounded border border-border bg-background px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-ring`}
          />
          <span className="mt-0.5 opacity-60">/ {totalPages}</span>
        </div>
        <EngineBtn
          label="Next"
          onClick={() => changePage(clampedCurrentPage + 1)}
          iconNode={<ChevronDown className={overlayUi.scrollButtonIcon} />}
          overlayUi={overlayUi}
        />
        <EngineBtn
          label="Last"
          onClick={() => changePage(totalPages)}
          iconNode={<ChevronsDown className={overlayUi.scrollButtonIcon} />}
          overlayUi={overlayUi}
        />
      </div>

      {toolOptions ? (
        <div className={`absolute bottom-[5rem] left-1/2 z-10 -translate-x-1/2 flex items-center flex-wrap justify-center ${overlayUi.toolbarGap} rounded-xl border border-border bg-background/95 ${overlayUi.toolbarPadding} shadow-md backdrop-blur-sm`}>
          {toolOptions}
        </div>
      ) : null}

      <div className={`absolute bottom-2 left-1/2 z-10 -translate-x-1/2 flex items-center ${overlayUi.toolbarGap} rounded-xl border border-border bg-background/95 ${overlayUi.toolbarPadding} shadow-md backdrop-blur-sm`}>
        <div className="flex items-center gap-0.5 border-r border-border pr-3 mr-1">
          {(["build", "animate"] as const).map((m) => (
            <EngineBtn
              key={m}
              label={m.charAt(0).toUpperCase() + m.slice(1)}
              iconNode={m === "build" ? <Hammer className={overlayUi.toolButtonIcon} /> : <Clapperboard className={overlayUi.toolButtonIcon} />}
              active={mode === m}
              onClick={() => onModeChange(m)}
              compact
              overlayUi={overlayUi}
            />
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          {currentTools.map((tool) => (
            <EngineBtn
              key={tool.id}
              label={tool.label}
              iconNode={tool.iconNode}
              active={!panActive && selectedTool === tool.id}
              onClick={() => onToolSelect(tool.id)}
              compact
              overlayUi={overlayUi}
            />
          ))}
        </div>
      </div>
    </>
  )
}
