export const DRILLDOWN_STYLES = `
  .scd-top-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 14px; cursor: pointer;
    border-left: 2px solid transparent;
    transition: background 0.1s;
  }
  .scd-top-item:hover, .scd-top-item.scd-hov {
    background: var(--atlas-bg-elevated);
  }
  .scd-sub-item {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 14px; cursor: pointer;
    transition: background 0.1s;
  }
  .scd-sub-item:hover {
    background: var(--atlas-bg-elevated);
  }
  .scd-chip-x {
    background: transparent; border: none; cursor: pointer;
    color: inherit; opacity: 0.45; font-size: 13px; line-height: 1;
    padding: 0; transition: opacity 0.12s;
  }
  .scd-chip-x:hover { opacity: 1; }
  .scd-cat-pill {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 11px; border-radius: 4px;
    border: 1px solid var(--atlas-border);
    cursor: pointer; transition: all 0.12s;
    background: transparent; white-space: nowrap;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }
  .scd-cat-pill:hover {
    border-color: var(--atlas-border-hover);
    background: var(--atlas-bg-elevated);
  }
  .scd-cat-pill.scd-active {
    background: var(--atlas-bg-elevated);
  }
  .scd-panel {
    position: absolute; top: calc(100% + 1px); left: 0;
    background: var(--atlas-bg-elevated);
    border: 1px solid var(--atlas-border);
    border-top: none;
    border-radius: 0 0 8px 8px;
    overflow: hidden;
    box-shadow: 0 16px 48px rgba(0,0,0,0.12);
    z-index: 100; width: 100%;
    animation: scdIn 0.14s ease;
  }
  @keyframes scdIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: none; }
  }
  .scd-panel::-webkit-scrollbar { width: 3px; }
  .scd-panel::-webkit-scrollbar-thumb { background: var(--atlas-border); border-radius: 2px; }
`
