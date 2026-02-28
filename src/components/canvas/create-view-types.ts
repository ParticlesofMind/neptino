export type Mode = "build" | "animate"

export type BuildTool =
  | "selection"
  | "pen"
  | "brush"
  | "text"
  | "shapes"
  | "tables"
  | "generate"
  | "eraser"

export type AnimateTool = "selection" | "scene" | "path" | "modify"

export type SnapReference = "canvas" | "object" | "grid"

export type InspectorPanelView = "layers" | "navigation"

export interface CanvasLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  indent: number
}

export interface OverlayUi {
  headerPadding: string
  headerTitle: string
  headerMeta: string
  headerChip: string
  blockPadding: string
  blockLabel: string
  blockCount: string
  cellLabel: string
  cellValue: string
  nestedLabel: string
  nestedValue: string
  footerText: string
  footerChip: string
  nestedLines: string
  low: boolean
  panelHeaderPadding: string
  panelHeaderText: string
  panelHeaderIcon: string
  panelSearchPadding: string
  panelSearchInput: string
  panelContentPadding: string
  panelItemPadding: string
  panelItemText: string
  panelItemIcon: string
  mediaCategoryPadding: string
  mediaCategoryIcon: string
  mediaCategoryLabel: string
  toolbarPadding: string
  toolbarGap: string
  toolButtonPadding: string
  toolButtonIcon: string
  toolButtonLabel: string
  controlLabel: string
  controlInput: string
  controlButton: string
  zoomButtonPadding: string
  zoomButtonIcon: string
  zoomValueText: string
  scrollButtonPadding: string
  scrollButtonIcon: string
  scrollInputText: string
  scrollPageText: string
}

export interface ToolItem<T extends string = string> {
  id: T
  label: string
  iconNode: React.ReactNode
}

export interface MediaAsset {
  id: string
  category: string
  mediaType: string
  title: string
  description: string
  url: string
}

export interface CanvasPageConfig {
  widthPx:   number
  heightPx:  number
  pageCount: number
  margins: { top: number; right: number; bottom: number; left: number }
}

export interface CanvasViewportInfo {
  pageRect:    { x: number; y: number; width: number; height: number }
  contentRect: { x: number; y: number; width: number; height: number }
  scale:   number
  zoomPct: number
}

export interface ToolConfig {
  brushSize:        number
  brushColor:       string
  penSize:          number
  penColor:         string
  penFill:          string
  fontSize:         string
  fontFamily:       string
  fontBold:         boolean
  fontItalic:       boolean
  textColor:        string
  shapeType:        string
  shapeStrokeWidth: number
  shapeStrokeColor: string
  shapeFillColor:   string
  eraserSize:       number
  tableRows:        number
  tableCols:        number
}
