/**
 * Minimal table renderer types for curriculum helpers.
 * These are intentionally lightweight placeholders so the curriculum
 * utilities can structure table data without depending on the full canvas UI.
 */

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableRow {
  depth?: number;
  cells: Record<string, string | number | null | undefined>;
}

export interface TableData {
  columns: TableColumn[];
  rows: TableRow[];
  emptyMessage?: string;
}

/**
 * Tiny renderer shim – in the previous implementation this handled DOM updates.
 * We expose a no-op class for compatibility so callers can check for its presence.
 */
export class TableRenderer {
  public render(_data: TableData): void {
    // Intentionally empty – rendering will be handled by future implementations.
  }
}

export default TableRenderer;
