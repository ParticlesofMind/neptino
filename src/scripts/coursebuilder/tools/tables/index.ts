/**
 * Table Tools Index
 * Main export file for all table-related components
 */

export { TableManager } from "./TableManager";
export { TableCreator } from "./TableCreator";
export { TableCellEditor } from "./TableCellEditor";
export { TableContextMenu } from "./TableContextMenu";
export { TableEventHandler } from "./TableEventHandler";
export type { 
    TableSettings, 
    TableCell, 
    PixiTableData 
} from "./TableTypes";

// Re-export TableManager as the main interface for backwards compatibility
export { TableManager as default } from "./TableManager";
