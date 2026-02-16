#!/usr/bin/env python3
"""Replace the create section in coursebuilder.html with Tailwind-only rewrite."""

import pathlib

HTML_FILE = pathlib.Path(__file__).resolve().parent.parent / "src/pages/teacher/coursebuilder.html"

CREATE_START = 1583 - 1  # 0-indexed
CREATE_END   = 1915      # exclusive; line 1916 is "<!-- Preview View -->"

# ── Shared Tailwind class fragments ──
# Media type buttons (sidebar col 1): vertical, icon above text, rectangular
BTN_MEDIA = (
    "flex flex-col items-center gap-1 rounded-lg border border-neutral-300 "
    "bg-white px-3 py-2 shadow-sm transition-all "
    "hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 "
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 "
    "disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
)

# Compact buttons (overlay perspective / scroll / tools): same style, tighter
BTN_COMPACT = (
    "flex flex-col items-center gap-0.5 rounded-lg border border-neutral-300 "
    "bg-white px-2.5 py-1.5 shadow-sm transition-all "
    "hover:bg-neutral-50 hover:text-neutral-900 text-neutral-700 "
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 "
    "disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
)

# Inline mini buttons (Bold / Italic text style)
BTN_INLINE = (
    "inline-flex items-center justify-center rounded border border-neutral-300 "
    "bg-white px-2 py-1 text-xs font-bold shadow-sm transition-all "
    "hover:bg-neutral-50 text-neutral-700 "
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
)

# Tool option input (number, select)
OPT_INPUT = (
    "w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm "
    "text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 "
    "focus:border-primary-500 transition-colors"
)

# Icon sizes
ICO = "h-5 w-5"           # prominent icon in media buttons
ICO_SM = "h-4 w-4"        # compact overlay buttons
LBL = "text-[10px] leading-tight font-medium"   # small label under icon
LBL_SM = "text-[9px] leading-tight font-medium"  # even smaller for compact

NEW_CREATE = f'''<!-- Create View -->
<div aria-hidden="true" class="hidden h-full" data-coursebuilder-section="create" id="create">
<div class="engine grid h-full min-h-0 overflow-hidden">

  <!-- ═══ Col 1+2: Media sidebar (shared background) ═══ -->
  <div class="flex h-full min-h-0 bg-white border-r border-neutral-200" data-engine-content="">

    <!-- Col 1 – Media Type Toolbar -->
    <div class="flex flex-col gap-1.5 p-2 border-r border-neutral-100 bg-neutral-50/50 overflow-y-auto" data-engine-media="">
      <button class="{BTN_MEDIA}" data-media="files" title="Files">
        <img alt="" class="{ICO}" src="/src/assets/icons/coursebuilder/media/media-files.svg"/>
        <span class="{LBL}">Files</span>
      </button>
      <button class="{BTN_MEDIA}" data-media="images" title="Images">
        <img alt="" class="{ICO}" src="/src/assets/icons/coursebuilder/media/media-image.svg"/>
        <span class="{LBL}">Images</span>
      </button>
      <button class="{BTN_MEDIA}" data-media="videos" title="Videos">
        <img alt="" class="{ICO}" src="/src/assets/icons/coursebuilder/media/media-video.svg"/>
        <span class="{LBL}">Videos</span>
      </button>
      <button class="{BTN_MEDIA}" data-media="audio" title="Audio">
        <img alt="" class="{ICO}" src="/src/assets/icons/coursebuilder/media/media-audio.svg"/>
        <span class="{LBL}">Audio</span>
      </button>
      <button class="{BTN_MEDIA}" data-media="text" title="Text">
        <img alt="" class="{ICO}" src="/src/assets/icons/coursebuilder/media/media-text.svg"/>
        <span class="{LBL}">Text</span>
      </button>
      <button class="{BTN_MEDIA}" data-media="plugin" title="Plugins">
        <img alt="" class="{ICO}" src="/src/assets/icons/coursebuilder/media/media-plugins.svg"/>
        <span class="{LBL}">Plugins</span>
      </button>
      <button class="{BTN_MEDIA}" data-media="links" title="Links">
        <img alt="" class="{ICO}" src="/src/assets/icons/coursebuilder/media/media-link.svg"/>
        <span class="{LBL}">Links</span>
      </button>
      <button class="{BTN_MEDIA}" data-media="games" title="Games">
        <img alt="" class="{ICO}" src="/src/assets/icons/joystick-icon.svg"/>
        <span class="{LBL}">Games</span>
      </button>
      <button class="{BTN_MEDIA}" data-media="graphs" title="Graphs">
        <img alt="" class="{ICO}" src="/src/assets/icons/chart-area-icon.svg"/>
        <span class="{LBL}">Graphs</span>
      </button>
    </div>

    <!-- Col 2 – Media Content Area -->
    <div class="flex flex-col flex-1 min-w-0 min-h-0 p-3 gap-2" data-engine-search="">
      <input class="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" id="media-search-input" placeholder="Search media…" type="search"/>
      <!-- Results appended by MediaInterface.ts -->
    </div>
  </div>

  <!-- ═══ Grabber: sidebar ↔ canvas ═══ -->
  <button aria-label="Resize search column" class="flex items-center justify-center w-full cursor-col-resize border-none bg-primary-200 transition-colors hover:bg-primary-400 focus-visible:bg-primary-400 focus-visible:outline-none" data-engine-resizer="search" type="button"></button>

  <!-- ═══ Col 3: Canvas (largest) ═══ -->
  <div class="relative min-h-0 overflow-hidden bg-neutral-100" data-engine-canvas="" id="canvas-container">
    <!-- PIXI canvas inserted by JS -->

    <!-- View controls – left overlay -->
    <div class="absolute left-3 top-3 z-10 flex flex-col gap-1.5" data-engine-perspective="">
      <div class="rounded-md bg-white/80 px-2 py-1 text-xs font-semibold text-neutral-600 shadow-sm backdrop-blur-sm" data-engine-perspective-zoom="" title="Current zoom level">100%</div>
      <button class="{BTN_COMPACT}" data-perspective="zoom-in" title="Focus">
        <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/perspective/zoomin-icon.svg"/>
        <span class="{LBL_SM}">Focus</span>
      </button>
      <button class="{BTN_COMPACT}" data-perspective="zoom-out" title="Expand">
        <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/perspective/zoomout-icon.svg"/>
        <span class="{LBL_SM}">Expand</span>
      </button>
      <button class="{BTN_COMPACT}" data-perspective="reset" title="Reset View">
        <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/perspective/reset-icon.svg"/>
        <span class="{LBL_SM}">Reset</span>
      </button>
      <button class="{BTN_COMPACT}" data-perspective="grab" title="Grab">
        <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/perspective/grab-icon.svg"/>
        <span class="{LBL_SM}">Grab</span>
      </button>
      <button class="{BTN_COMPACT}" data-perspective="grid" data-snap-anchor="" title="Grid">
        <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/perspective/grid-icon.svg"/>
        <span class="{LBL_SM}">Grid</span>
      </button>
    </div>

    <!-- Scroll nav – right overlay -->
    <div class="absolute right-3 top-3 z-10 flex flex-col gap-1.5" data-engine-scroll="">
      <button class="{BTN_COMPACT}" data-scroll="first" title="Go to first canvas">
        <svg class="{ICO_SM}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6"/><path d="M18 9l-6-6-6 6"/></svg>
        <span class="{LBL_SM}">First</span>
      </button>
      <button class="{BTN_COMPACT}" data-scroll="prev" title="Previous canvas">
        <svg class="{ICO_SM}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6"/></svg>
        <span class="{LBL_SM}">Prev</span>
      </button>
      <div class="flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 shadow-sm" data-engine-scroll-display="">
        <input aria-label="Current canvas number" class="w-10 bg-transparent text-center text-sm text-neutral-700 focus:outline-none" data-engine-scroll-input="" id="engine-scroll-input" min="1" name="engine-scroll-input" title="Current canvas number" type="number" value="1"/>
        <span class="text-xs text-neutral-400">/</span>
        <span class="text-xs text-neutral-500" data-engine-scroll-total="" title="Total canvases">45</span>
      </div>
      <button class="{BTN_COMPACT}" data-scroll="next" title="Next canvas">
        <svg class="{ICO_SM}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
        <span class="{LBL_SM}">Next</span>
      </button>
      <button class="{BTN_COMPACT}" data-scroll="last" title="Go to last canvas">
        <svg class="{ICO_SM}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/><path d="M6 15l6 6 6-6"/></svg>
        <span class="{LBL_SM}">Last</span>
      </button>
    </div>

    <!-- Toolbar – bottom overlay -->
    <div class="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 flex-col gap-2" data-engine-controls="">

      <!-- Tool options row (contextual, above tool buttons) -->
      <div class="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm" data-engine-tools="">
        <div class="flex flex-wrap items-center gap-2" data-engine-tools-options="">
          <!-- Pen -->
          <div class="flex items-center gap-2" data-engine-tool-options="pen" data-engine-tool-options-layout="horizontal" style="display:none;">
            <input aria-label="Pen size" class="{OPT_INPUT}" data-setting="size" id="pen-size-input" max="15" min="1" name="pen-size" type="number" value="2"/>
            <div class="color-selector" data-color-selector="pen-stroke" data-initial-color="#282a29"></div>
            <div class="color-selector" data-allow-transparent="true" data-color-selector="pen-fill" data-initial-color="#fef6eb"></div>
          </div>
          <!-- Text -->
          <div class="flex items-center gap-2" data-engine-tool-options="text" data-engine-tool-options-layout="horizontal" style="display:none;">
            <select class="{OPT_INPUT}" data-setting="fontSize" id="text-size-select">
              <option data-label="Normal" value="12">Normal (12pt)</option>
              <option data-label="Title" value="26">Title (26pt)</option>
              <option data-label="Header1" value="20">H1 (20pt)</option>
              <option data-label="Header2" selected="" value="16">H2 (16pt)</option>
              <option data-label="Header3" value="14">H3 (14pt)</option>
            </select>
            <div aria-label="Text Style" class="flex items-center gap-1" data-engine-text-style-controls="">
              <button class="{BTN_INLINE}" data-engine-text-style="bold" type="button">B</button>
              <button class="{BTN_INLINE}" data-engine-text-style="italic" type="button">I</button>
            </div>
            <select class="{OPT_INPUT}" data-setting="fontFamily" id="font-family-select">
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Tahoma">Tahoma</option>
            </select>
            <div class="color-selector" data-color-selector="text" data-initial-color="#282a29"></div>
          </div>
          <!-- Brush -->
          <div class="flex items-center gap-2" data-engine-tool-options="brush" data-engine-tool-options-layout="horizontal" style="display:none;">
            <input aria-label="Brush size" class="{OPT_INPUT}" data-setting="size" id="brush-size-input" max="50" min="10" name="brush-size" type="number" value="20"/>
            <div class="color-selector" data-color-selector="brush" data-initial-color="#2b8059"></div>
          </div>
          <!-- Shapes -->
          <div class="flex items-center gap-2" data-engine-tool-options="shapes" data-engine-tool-options-layout="horizontal" style="display:none;">
            <div class="shape-selector" data-initial-shape="rectangle" data-shape-selector="shapes"></div>
            <input aria-label="Stroke width" class="{OPT_INPUT}" data-setting="strokeWidth" id="shape-stroke-width-input" max="20" min="1" name="shape-stroke-width" type="number" value="2"/>
            <div class="color-selector" data-color-selector="shapes-stroke" data-initial-color="#282a29"></div>
            <div class="color-selector" data-allow-transparent="true" data-color-selector="shapes-fill" data-initial-color="transparent"></div>
          </div>
          <!-- Eraser -->
          <div class="flex items-center gap-2" data-engine-tool-options="eraser" data-engine-tool-options-layout="horizontal" style="display:none;">
            <input aria-label="Eraser size" class="{OPT_INPUT}" data-setting="size" id="eraser-size-input" max="50" min="5" name="eraser-size" type="number" value="20"/>
          </div>
          <!-- Tables -->
          <div class="flex items-center gap-2" data-engine-tool-options="tables" data-engine-tool-options-layout="horizontal" style="display:none;">
            <input aria-label="Table size" class="{OPT_INPUT}" data-setting="size" id="table-size-input" max="20" min="1" name="table-size" type="number" value="3"/>
            <select aria-label="Table type" class="{OPT_INPUT}" data-setting="tableType" id="table-type-select" name="table-type">
              <option value="basic">Basic</option>
              <option value="bordered">Bordered</option>
              <option value="striped">Striped</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Mode selector + Tool buttons row -->
      <div class="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm" data-engine-tools="">
        <!-- Modes (left) -->
        <div class="flex items-center gap-1 border-r border-neutral-200 pr-3" data-engine-modes="">
          <button class="{BTN_COMPACT}" data-mode="build">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/modes/mode-build.svg"/>
            <span class="{LBL_SM}">Build</span>
          </button>
          <button class="{BTN_COMPACT}" data-mode="animate">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/modes/mode-animate.svg"/>
            <span class="{LBL_SM}">Animate</span>
          </button>
        </div>
        <!-- Tool buttons (right of modes) -->
        <div class="flex flex-wrap items-center gap-1" data-engine-tools-selection="">
          <!-- Build tools -->
          <button class="{BTN_COMPACT}" aria-label="Select" data-mode="build" data-tool="selection">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/tools/tool-select.svg"/>
            <span class="{LBL_SM}">Select</span>
          </button>
          <button class="{BTN_COMPACT}" aria-label="Pen" data-mode="build" data-tool="pen">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/tools/tool-pen.svg"/>
            <span class="{LBL_SM}">Pen</span>
          </button>
          <button class="{BTN_COMPACT}" aria-label="Brush" data-mode="build" data-tool="brush">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/tools/tool-brush.svg"/>
            <span class="{LBL_SM}">Brush</span>
          </button>
          <button class="{BTN_COMPACT}" aria-label="Text" data-mode="build" data-tool="text">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/tools/tool-write.svg"/>
            <span class="{LBL_SM}">Text</span>
          </button>
          <button class="{BTN_COMPACT}" aria-label="Shapes" data-mode="build" data-tool="shapes">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/tools/tool-shapes.svg"/>
            <span class="{LBL_SM}">Shapes</span>
          </button>
          <button class="{BTN_COMPACT}" aria-label="Tables" data-mode="build" data-tool="tables">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/media/media-table.svg"/>
            <span class="{LBL_SM}">Tables</span>
          </button>
          <button class="{BTN_COMPACT}" aria-label="Generate" data-mode="build" data-tool="generate">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/bot-icon.svg"/>
            <span class="{LBL_SM}">Generate</span>
          </button>
          <button class="{BTN_COMPACT}" aria-label="Eraser" data-mode="build" data-tool="eraser">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/tools/tool-eraser.svg"/>
            <span class="{LBL_SM}">Eraser</span>
          </button>
          <!-- Animate tools -->
          <button class="{BTN_COMPACT}" aria-label="Select" data-mode="animate" data-tool="selection" style="display:none;">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/tools/tool-select.svg"/>
            <span class="{LBL_SM}">Select</span>
          </button>
          <button class="{BTN_COMPACT}" aria-label="Scene" data-mode="animate" data-tool="scene" style="display:none;">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/modes/mode-animate.svg"/>
            <span class="{LBL_SM}">Scene</span>
          </button>
          <button class="{BTN_COMPACT}" aria-label="Path" data-mode="animate" data-tool="path" style="display:none;">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/tools/tool-pen.svg"/>
            <span class="{LBL_SM}">Path</span>
          </button>
          <button class="{BTN_COMPACT}" aria-label="Modify" data-mode="animate" data-tool="modify" style="display:none;">
            <img alt="" class="{ICO_SM}" src="/src/assets/icons/coursebuilder/tools/tool-shapes.svg"/>
            <span class="{LBL_SM}">Modify</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Snap Menu (popover, inside canvas) -->
    <div class="absolute right-6 top-24 z-20 hidden w-72 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg" data-snap-menu="" id="snap-menu">
      <div class="flex items-center gap-2 text-sm font-medium text-neutral-800" data-snap-option="smart">
        <input checked="" class="h-4 w-4 shrink-0 cursor-pointer accent-primary-600" id="smart-guides-toggle" type="checkbox"/>
        <span>Smart Guides</span>
      </div>
      <div class="mt-4 space-y-3" data-snap-section="">
        <div class="flex items-center gap-2 text-sm text-neutral-700" data-smart-setting="showDistToAll">
          <input checked="" class="h-4 w-4 shrink-0 cursor-pointer accent-primary-600" id="showDistToAll" type="checkbox"/>
          <label for="showDistToAll">Distance Labels</label>
        </div>
        <div class="flex items-center gap-2 text-sm text-neutral-700" data-smart-setting="enableResizeGuides">
          <input checked="" class="h-4 w-4 shrink-0 cursor-pointer accent-primary-600" id="enableResizeGuides" type="checkbox"/>
          <label for="enableResizeGuides">Resize Guides</label>
        </div>
        <div class="flex items-center gap-2 text-sm text-neutral-700" data-smart-setting="enableSmartSelection">
          <input checked="" class="h-4 w-4 shrink-0 cursor-pointer accent-primary-600" id="enableSmartSelection" type="checkbox"/>
          <label for="enableSmartSelection">Smart Selection</label>
        </div>
        <div class="flex items-center gap-2 text-sm text-neutral-700" data-smart-setting="enableColorCoding">
          <input checked="" class="h-4 w-4 shrink-0 cursor-pointer accent-primary-600" id="enableColorCoding" type="checkbox"/>
          <label for="enableColorCoding">Color Coding</label>
        </div>
      </div>
      <div class="my-4 h-px bg-neutral-200"></div>
      <div class="grid gap-2">
        <div class="flex items-center gap-2 text-sm text-neutral-700" data-distribute="horizontal">
          <img alt="" class="h-4 w-4" src="/src/assets/icons/coursebuilder/perspective/snap-smart.svg"/><span>Distribute Horizontally</span>
        </div>
        <div class="flex items-center gap-2 text-sm text-neutral-700" data-distribute="vertical">
          <img alt="" class="h-4 w-4" src="/src/assets/icons/coursebuilder/perspective/snap-smart.svg"/><span>Distribute Vertically</span>
        </div>
      </div>
      <div class="my-4 h-px bg-neutral-200"></div>
      <div class="space-y-2" data-snap-guide-modes="">
        <label class="text-xs font-semibold uppercase tracking-wide text-neutral-500">Smart Guide Reference</label>
        <div class="grid gap-2">
          <div class="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700" data-reference-mode="canvas">
            <img alt="" class="h-4 w-4" src="/src/assets/icons/coursebuilder/perspective/canvas-icon.svg"/><span>Canvas Reference</span>
          </div>
          <div class="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700" data-reference-mode="object">
            <img alt="" class="h-4 w-4" src="/src/assets/icons/coursebuilder/perspective/selection-icon.svg"/><span>Object Reference</span>
          </div>
          <div class="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700" data-reference-mode="grid">
            <img alt="" class="h-4 w-4" src="/src/assets/icons/coursebuilder/perspective/grid-icon.svg"/><span>Grid Reference</span>
          </div>
        </div>
      </div>
      <div class="mt-4 space-y-3" data-snap-grid-options="" id="grid-options" style="display:none;">
        <div class="flex items-center gap-2 text-sm text-neutral-700">
          <input checked="" class="h-4 w-4 shrink-0 cursor-pointer accent-primary-600" id="show-grid" type="checkbox"/>
          <label for="show-grid">Show grid</label>
        </div>
        <div class="flex items-center gap-2 text-sm text-neutral-700">
          <label for="grid-spacing">Grid spacing:</label>
          <input class="{OPT_INPUT}" id="grid-spacing" max="100" min="1" type="number" value="20"/>
          <span class="text-xs text-neutral-500">px</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ Grabber: canvas ↔ panel ═══ -->
  <button aria-label="Resize inspector panel" class="flex items-center justify-center w-full cursor-col-resize border-none bg-primary-200 transition-colors hover:bg-primary-400 focus-visible:bg-primary-400 focus-visible:outline-none" data-engine-resizer="panel" type="button"></button>

  <!-- ═══ Col 4: Layers / Navigation Panel ═══ -->
  <div class="flex flex-col min-h-0 overflow-hidden border-l border-neutral-200 bg-white" data-engine-panel="">
    <div class="flex items-center gap-1 border-b border-neutral-200 px-3 py-2" data-engine-panel-header="">
      <div class="flex items-center gap-1" data-engine-panel-toggle="">
        <button aria-label="Show Layers panel" aria-pressed="true" class="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" data-panel-view="layers" data-engine-panel-toggle-btn="">Layers</button>
        <button aria-label="Show Navigation panel" aria-pressed="false" class="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" data-panel-view="navigation" data-engine-panel-toggle-btn="">Navigation</button>
      </div>
    </div>
    <div class="flex-1 min-h-0 overflow-y-auto p-3" data-engine-panel-content="">
      <!-- Layers -->
      <div class="" data-engine-panel-view="" data-view="layers">
        <ol class="layers-list" id="layers-list-root"></ol>
      </div>
      <!-- Navigation (scrollable thumbnails) -->
      <div class="hidden" data-engine-panel-view="" data-view="navigation">
        <div class="space-y-2">
          <p class="text-sm text-neutral-500">Loading course outline…</p>
        </div>
      </div>
    </div>
  </div>

</div>
</div>
'''

lines = HTML_FILE.read_text().splitlines(keepends=True)
total_before = len(lines)

new_lines = lines[:CREATE_START] + [NEW_CREATE] + lines[CREATE_END:]
HTML_FILE.write_text("".join(new_lines))

total_after = len(HTML_FILE.read_text().splitlines())
print(f"Done. Lines before: {total_before}, after: {total_after}")
print(f"Replaced lines {CREATE_START+1}–{CREATE_END}")
