/**
 * Type definitions for CourseBuilder Dropdown System
 */

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  code?: string;
}

export interface DropdownElements {
  toggle: HTMLElement;
  menu: HTMLElement;
  hiddenInput: HTMLInputElement;
  textElement: HTMLElement;
  loading?: HTMLElement;
}

export interface DropdownConfig {
  id: string;
  hasDescription: boolean;
  hasCode: boolean;
  emptyMessage?: string;
  placeholderText?: string;
}

export interface DropdownRenderOptions {
  showHeader?: boolean;
  headerText?: string;
  emptyMessage?: string;
}

export type DataLoader<T = any> = (...args: any[]) => Promise<T>;
export type SyncDataLoader<T = any> = (...args: any[]) => T;

export interface DropdownDataConfig {
  loader: DataLoader | SyncDataLoader;
  dataKey?: string; // Key to extract data from loaded object
  isAsync: boolean;
}

// Cascading dropdown relationships
export interface CascadingConfig {
  dependsOn: string[];
  resets: string[];
  populateMethod: (parentValues: Record<string, string>) => void;
}

// Error states
export interface DropdownError {
  dropdownId: string;
  message: string;
  timestamp: Date;
}

// Event types
export type DropdownEventType = 'open' | 'close' | 'select' | 'error' | 'populate';

export interface DropdownEvent {
  type: DropdownEventType;
  dropdownId: string;
  value?: string;
  text?: string;
  error?: string;
}
