#!/usr/bin/env python3
"""Replace the create section in coursebuilder.html with a clean rewrite."""

import pathlib

HTML_FILE = pathlib.Path(__file__).resolve().parent.parent / "src/pages/teacher/coursebuilder.html"

# Lines are 1-indexed in the editor, 0-indexed in Python lists
CREATE_START = 1583 - 1  # "<!-- Create View -->"
CREATE_END   = 1912      # line 1912 is the last line of create section (before Preview View line 1913)

NEW_CREATE = r'''<!-- Create View -->
<div aria-hidden="true" class="hidden h-full" data-coursebuilder-section="create" id="create">
<div class="engine">

  <!-- ═══ Col 1+2: Media types + Media content (shared background) ═══ -->
  <div class="engine-sidebar" data-engine-content="">

    <!-- Col 1 – Media Type Toolbar -->
    <div class="engine-type-bar" data-engine-media="">
      <button class="engine-btn" data-media="files" title="Files">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/media/media-files.svg"/>
        <span class="engine-btn__label">Files</span>
      </button>
      <button class="engine-btn" data-media="images" title="Images">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/media/media-image.svg"/>
        <span class="engine-btn__label">Images</span>
      </button>
      <button class="engine-btn" data-media="videos" title="Videos">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/media/media-video.svg"/>
        <span class="engine-btn__label">Videos</span>
      </button>
      <button class="engine-btn" data-media="audio" title="Audio">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/media/media-audio.svg"/>
        <span class="engine-btn__label">Audio</span>
      </button>
      <button class="engine-btn" data-media="text" title="Text">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/media/media-text.svg"/>
        <span class="engine-btn__label">Text</span>
      </button>
      <button class="engine-btn" data-media="plugin" title="Plugins">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/media/media-plugins.svg"/>
        <span class="engine-btn__label">Plugins</span>
      </button>
      <button class="engine-btn" data-media="links" title="Links">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/media/media-link.svg"/>
        <span class="engine-btn__label">Links</span>
      </button>
      <button class="engine-btn" data-media="games" title="Games">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/joystick-icon.svg"/>
        <span class="engine-btn__label">Games</span>
      </button>
      <button class="engine-btn" data-media="graphs" title="Graphs">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/chart-area-icon.svg"/>
        <span class="engine-btn__label">Graphs</span>
      </button>
    </div>

    <!-- Col 2 – Media Content Area -->
    <div class="engine-media-content" data-engine-search="">
      <input class="engine-search-input" id="media-search-input" placeholder="Search media…" type="search"/>
      <!-- Results appended by MediaInterface.ts -->
    </div>
  </div>

  <!-- ═══ Grabber: sidebar ↔ canvas ═══ -->
  <button aria-label="Resize search column" class="engine-grabber" data-engine-resizer="search" type="button">
    <span class="engine-grabber__dots"></span>
  </button>

  <!-- ═══ Col 3: Canvas (largest) ═══ -->
  <div class="engine-canvas" data-engine-canvas="" id="canvas-container">
    <!-- PIXI canvas inserted by JS -->

    <!-- View controls – left overlay, unscrollable -->
    <div class="engine-overlay engine-overlay--left" data-engine-perspective="">
      <div class="engine-zoom-label" data-engine-perspective-zoom="" title="Current zoom level">100%</div>
      <button class="engine-btn engine-btn--compact" data-perspective="zoom-in" title="Focus">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/perspective/zoomin-icon.svg"/>
        <span class="engine-btn__label">Focus</span>
      </button>
      <button class="engine-btn engine-btn--compact" data-perspective="zoom-out" title="Expand">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/perspective/zoomout-icon.svg"/>
        <span class="engine-btn__label">Expand</span>
      </button>
      <button class="engine-btn engine-btn--compact" data-perspective="reset" title="Reset View">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/perspective/reset-icon.svg"/>
        <span class="engine-btn__label">Reset</span>
      </button>
      <button class="engine-btn engine-btn--compact" data-perspective="grab" title="Grab">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/perspective/grab-icon.svg"/>
        <span class="engine-btn__label">Grab</span>
      </button>
      <button class="engine-btn engine-btn--compact" data-perspective="grid" data-snap-anchor="" title="Grid">
        <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/perspective/grid-icon.svg"/>
        <span class="engine-btn__label">Grid</span>
      </button>
    </div>

    <!-- Scroll nav – right overlay, unscrollable -->
    <div class="engine-overlay engine-overlay--right" data-engine-scroll="">
      <button class="engine-btn engine-btn--compact" data-scroll="first" title="Go to first canvas">
        <svg class="engine-btn__icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6"/><path d="M18 9l-6-6-6 6"/></svg>
        <span class="engine-btn__label">First</span>
      </button>
      <button class="engine-btn engine-btn--compact" data-scroll="prev" title="Previous canvas">
        <svg class="engine-btn__icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6"/></svg>
        <span class="engine-btn__label">Prev</span>
      </button>
      <div class="engine-scroll-indicator" data-engine-scroll-display="">
        <input aria-label="Current canvas number" class="engine-scroll-indicator__input" data-engine-scroll-input="" id="engine-scroll-input" min="1" name="engine-scroll-input" title="Current canvas number" type="number" value="1"/>
        <span class="engine-scroll-indicator__sep">/</span>
        <span class="engine-scroll-indicator__total" data-engine-scroll-total="" title="Total canvases">45</span>
      </div>
      <button class="engine-btn engine-btn--compact" data-scroll="next" title="Next canvas">
        <svg class="engine-btn__icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
        <span class="engine-btn__label">Next</span>
      </button>
      <button class="engine-btn engine-btn--compact" data-scroll="last" title="Go to last canvas">
        <svg class="engine-btn__icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/><path d="M6 15l6 6 6-6"/></svg>
        <span class="engine-btn__label">Last</span>
      </button>
    </div>

    <!-- Toolbar – bottom overlay, unscrollable -->
    <div class="engine-overlay engine-overlay--bottom" data-engine-controls="">
      <!-- Tool options row (contextual, above tool buttons) -->
      <div class="engine-toolbar" data-engine-tools="">
        <div class="engine-toolbar__options" data-engine-tools-options="">
          <!-- Pen -->
          <div class="engine-option-group" data-engine-tool-options="pen" data-engine-tool-options-layout="horizontal" style="display:none;">
            <input aria-label="Pen size" class="engine-option-input" data-setting="size" id="pen-size-input" max="15" min="1" name="pen-size" type="number" value="2"/>
            <div class="color-selector" data-color-selector="pen-stroke" data-initial-color="#282a29"></div>
            <div class="color-selector" data-allow-transparent="true" data-color-selector="pen-fill" data-initial-color="#fef6eb"></div>
          </div>
          <!-- Text -->
          <div class="engine-option-group" data-engine-tool-options="text" data-engine-tool-options-layout="horizontal" style="display:none;">
            <select class="engine-option-input" data-setting="fontSize" id="text-size-select">
              <option data-label="Normal" value="12">Normal (12pt)</option>
              <option data-label="Title" value="26">Title (26pt)</option>
              <option data-label="Header1" value="20">H1 (20pt)</option>
              <option data-label="Header2" selected="" value="16">H2 (16pt)</option>
              <option data-label="Header3" value="14">H3 (14pt)</option>
            </select>
            <div aria-label="Text Style" class="engine-option-group" data-engine-text-style-controls="">
              <button class="engine-btn engine-btn--inline" data-engine-text-style="bold" type="button">B</button>
              <button class="engine-btn engine-btn--inline" data-engine-text-style="italic" type="button">I</button>
            </div>
            <select class="engine-option-input" data-setting="fontFamily" id="font-family-select">
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Tahoma">Tahoma</option>
            </select>
            <div class="color-selector" data-color-selector="text" data-initial-color="#282a29"></div>
          </div>
          <!-- Brush -->
          <div class="engine-option-group" data-engine-tool-options="brush" data-engine-tool-options-layout="horizontal" style="display:none;">
            <input aria-label="Brush size" class="engine-option-input" data-setting="size" id="brush-size-input" max="50" min="10" name="brush-size" type="number" value="20"/>
            <div class="color-selector" data-color-selector="brush" data-initial-color="#2b8059"></div>
          </div>
          <!-- Shapes -->
          <div class="engine-option-group" data-engine-tool-options="shapes" data-engine-tool-options-layout="horizontal" style="display:none;">
            <div class="shape-selector" data-initial-shape="rectangle" data-shape-selector="shapes"></div>
            <input aria-label="Stroke width" class="engine-option-input" data-setting="strokeWidth" id="shape-stroke-width-input" max="20" min="1" name="shape-stroke-width" type="number" value="2"/>
            <div class="color-selector" data-color-selector="shapes-stroke" data-initial-color="#282a29"></div>
            <div class="color-selector" data-allow-transparent="true" data-color-selector="shapes-fill" data-initial-color="transparent"></div>
          </div>
          <!-- Eraser -->
          <div class="engine-option-group" data-engine-tool-options="eraser" data-engine-tool-options-layout="horizontal" style="display:none;">
            <input aria-label="Eraser size" class="engine-option-input" data-setting="size" id="eraser-size-input" max="50" min="5" name="eraser-size" type="number" value="20"/>
          </div>
          <!-- Tables -->
          <div class="engine-option-group" data-engine-tool-options="tables" data-engine-tool-options-layout="horizontal" style="display:none;">
            <input aria-label="Table size" class="engine-option-input" data-setting="size" id="table-size-input" max="20" min="1" name="table-size" type="number" value="3"/>
            <select aria-label="Table type" class="engine-option-input" data-setting="tableType" id="table-type-select" name="table-type">
              <option value="basic">Basic</option>
              <option value="bordered">Bordered</option>
              <option value="striped">Striped</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Mode selector + Tool buttons row -->
      <div class="engine-toolbar">
        <div class="engine-mode-group" data-engine-modes="">
          <button class="engine-btn engine-btn--compact" data-mode="build">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/modes/mode-build.svg"/>
            <span class="engine-btn__label">Build</span>
          </button>
          <button class="engine-btn engine-btn--compact" data-mode="animate">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/modes/mode-animate.svg"/>
            <span class="engine-btn__label">Animate</span>
          </button>
        </div>

        <div class="engine-tool-group" data-engine-tools-selection="">
          <!-- Build tools -->
          <button class="engine-btn engine-btn--compact" aria-label="Select" data-mode="build" data-tool="selection">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/tools/tool-select.svg"/>
            <span class="engine-btn__label">Select</span>
          </button>
          <button class="engine-btn engine-btn--compact" aria-label="Pen" data-mode="build" data-tool="pen">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/tools/tool-pen.svg"/>
            <span class="engine-btn__label">Pen</span>
          </button>
          <button class="engine-btn engine-btn--compact" aria-label="Brush" data-mode="build" data-tool="brush">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/tools/tool-brush.svg"/>
            <span class="engine-btn__label">Brush</span>
          </button>
          <button class="engine-btn engine-btn--compact" aria-label="Text" data-mode="build" data-tool="text">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/tools/tool-write.svg"/>
            <span class="engine-btn__label">Text</span>
          </button>
          <button class="engine-btn engine-btn--compact" aria-label="Shapes" data-mode="build" data-tool="shapes">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/tools/tool-shapes.svg"/>
            <span class="engine-btn__label">Shapes</span>
          </button>
          <button class="engine-btn engine-btn--compact" aria-label="Tables" data-mode="build" data-tool="tables">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/media/media-table.svg"/>
            <span class="engine-btn__label">Tables</span>
          </button>
          <button class="engine-btn engine-btn--compact" aria-label="Generate" data-mode="build" data-tool="generate">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/bot-icon.svg"/>
            <span class="engine-btn__label">Generate</span>
          </button>
          <button class="engine-btn engine-btn--compact" aria-label="Eraser" data-mode="build" data-tool="eraser">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/tools/tool-eraser.svg"/>
            <span class="engine-btn__label">Eraser</span>
          </button>
          <!-- Animate tools -->
          <button class="engine-btn engine-btn--compact" aria-label="Select" data-mode="animate" data-tool="selection" style="display:none;">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/tools/tool-select.svg"/>
            <span class="engine-btn__label">Select</span>
          </button>
          <button class="engine-btn engine-btn--compact" aria-label="Scene" data-mode="animate" data-tool="scene" style="display:none;">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/modes/mode-animate.svg"/>
            <span class="engine-btn__label">Scene</span>
          </button>
          <button class="engine-btn engine-btn--compact" aria-label="Path" data-mode="animate" data-tool="path" style="display:none;">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/tools/tool-pen.svg"/>
            <span class="engine-btn__label">Path</span>
          </button>
          <button class="engine-btn engine-btn--compact" aria-label="Modify" data-mode="animate" data-tool="modify" style="display:none;">
            <img alt="" class="engine-btn__icon" src="/src/assets/icons/coursebuilder/tools/tool-shapes.svg"/>
            <span class="engine-btn__label">Modify</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Snap Menu (popover, inside canvas) -->
    <div class="absolute right-6 top-24 hidden w-72 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg" data-snap-menu="" id="snap-menu">
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
          <input class="engine-option-input" id="grid-spacing" max="100" min="1" type="number" value="20"/>
          <span class="text-xs text-neutral-500">px</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ Grabber: canvas ↔ panel ═══ -->
  <button aria-label="Resize inspector panel" class="engine-grabber" data-engine-resizer="panel" type="button">
    <span class="engine-grabber__dots"></span>
  </button>

  <!-- ═══ Col 4: Layers / Navigation Panel ═══ -->
  <div class="engine-panel" data-engine-panel="">
    <div class="engine-panel__header" data-engine-panel-header="">
      <div class="engine-panel__tabs" data-engine-panel-toggle="">
        <button aria-label="Show Layers panel" aria-pressed="true" class="engine-panel__tab engine-panel__tab--active" data-panel-view="layers" data-engine-panel-toggle-btn="">Layers</button>
        <button aria-label="Show Navigation panel" aria-pressed="false" class="engine-panel__tab" data-panel-view="navigation" data-engine-panel-toggle-btn="">Navigation</button>
      </div>
    </div>
    <div class="engine-panel__body" data-engine-panel-content="">
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

# Replace lines [CREATE_START, CREATE_END) with NEW_CREATE
new_lines = lines[:CREATE_START] + [NEW_CREATE] + lines[CREATE_END:]
HTML_FILE.write_text("".join(new_lines))

total_after = len(HTML_FILE.read_text().splitlines())
print(f"Done. Lines before: {total_before}, after: {total_after}")
print(f"Replaced lines {CREATE_START+1}–{CREATE_END}")
