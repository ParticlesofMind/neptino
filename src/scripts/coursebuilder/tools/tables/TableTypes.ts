/**
 * Table Tool Type Definitions
 * Interfaces and types used across the table tool components
 */

import { Graphics, Text } from "pixi.js";

export interface TableSettings {
    rows: number;
    columns: number;
    cellWidth: number;
    cellHeight: number;
    borderColor: string;
    backgroundColor: string;
    borderWidth: number;
    cellPadding: number;
    fontSize: number;
    fontColor: string;
}

export interface TableCell {
    graphics: Graphics;
    text: Text;
    row: number;
    column: number;
    isEditing: boolean;
    bounds: { x: number; y: number; width: number; height: number };
}

export interface PixiTableData {
    container: Graphics;
    cells: TableCell[][];
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    cellWidth: number;
    cellHeight: number;
    activeCell: TableCell | null;
}
