export const ERA_LABELS: Record<string, string> = {
  ancient:        "Ancient",
  "early-modern": "Early Modern",
  modern:         "Modern",
  contemporary:   "Contemporary",
}

export const ERA_RANGE_LABELS: Record<string, string> = {
  ancient:        "pre-500 CE",
  "early-modern": "1500–1800",
  modern:         "1800–1945",
  contemporary:   "1945–today",
}

export const ATLAS_FILTER_BAR_STYLES = `
  .afb-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 13px; border-radius: 5px; flex-shrink: 0;
    border: 1px solid var(--atlas-border);
    cursor: pointer; transition: all 0.12s;
    background: transparent; white-space: nowrap;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--atlas-text-dim);
  }
  .afb-pill:hover { border-color: var(--atlas-border-hover); background: var(--atlas-bg-elevated); }
  .afb-pill.afb-active { background: var(--atlas-bg-elevated); color: var(--atlas-text); }

  .afb-era-pill {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 4px 10px; border-radius: 20px; flex-shrink: 0;
    border: 1px solid var(--atlas-border);
    cursor: pointer; transition: all 0.12s;
    background: transparent; white-space: nowrap;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10px; letter-spacing: 0.04em; color: var(--atlas-text-dim);
  }
  .afb-era-pill:hover { border-color: var(--atlas-border-hover); color: var(--atlas-text); }
  .afb-era-pill.afb-era-active {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 10%, transparent);
    color: var(--primary);
  }

  .afb-mini-panel {
    position: fixed;
    min-width: 240px; max-width: 340px;
    background: var(--atlas-bg-elevated);
    border: 1px solid var(--atlas-border);
    border-radius: 8px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.12);
    z-index: 9999; overflow: hidden;
    animation: afbIn 0.13s ease;
  }
  .afb-mini-panel-item {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 12px; cursor: pointer; transition: background 0.08s;
    font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px;
    color: var(--atlas-text-dim);
  }
  .afb-mini-panel-item:hover { background: var(--atlas-bg); color: var(--atlas-text); }
  .afb-mini-panel-item.afb-item-active { color: var(--atlas-text); }

  .afb-sort-panel {
    position: absolute; left: 0; right: 0; top: 100%;
    background: var(--atlas-bg-elevated);
    border: 1px solid var(--atlas-border);
    border-radius: 0 0 8px 8px;
    overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.1);
    z-index: 9999;
    animation: afbIn 0.13s ease;
  }
  .afb-sort-top-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 7px 14px; cursor: pointer;
    border-left: 2px solid transparent; transition: background 0.08s;
  }
  .afb-sort-top-item:hover, .afb-sort-top-item.afb-hov { background: var(--atlas-bg); }
  .afb-sort-sub-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 14px; cursor: pointer; transition: background 0.08s;
  }
  .afb-sort-sub-item:hover { background: var(--atlas-bg); }

  @keyframes afbIn {
    from { opacity: 0; transform: translateY(-3px); }
    to   { opacity: 1; transform: none; }
  }
  .afb-chip-x {
    background: transparent; border: none; cursor: pointer;
    opacity: 0.45; font-size: 13px; line-height: 1; padding: 0;
    transition: opacity 0.1s;
  }
  .afb-chip-x:hover { opacity: 1; }
`
