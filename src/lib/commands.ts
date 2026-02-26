import React from 'react';
import { PageInstance, ContentBlock } from '@/types/template';

export interface EditorCommand {
  execute(): void;
  undo(): void;
  description: string;
}

export class AddBlockCommand implements EditorCommand {
  description: string;

  constructor(
    private setState: React.Dispatch<React.SetStateAction<PageInstance>>,
    private zoneId: string,
    private block: ContentBlock,
  ) {
    this.description = `Add ${this.block.type} to ${this.zoneId}`;
  }

  execute() {
    this.setState(prev => ({
      ...prev,
      zones: {
        ...prev.zones,
        [this.zoneId]: [...(prev.zones[this.zoneId] || []), this.block],
      },
    }));
  }

  undo() {
    this.setState(prev => ({
      ...prev,
      zones: {
        ...prev.zones,
        [this.zoneId]: (prev.zones[this.zoneId] || []).filter(b => b.id !== this.block.id),
      },
    }));
  }
}

export class RemoveBlockCommand implements EditorCommand {
  description: string;

  constructor(
    private setState: React.Dispatch<React.SetStateAction<PageInstance>>,
    private zoneId: string,
    private block: ContentBlock,
  ) {
    this.description = `Remove ${this.block.type} from ${this.zoneId}`;
  }

  execute() {
    this.setState(prev => ({
      ...prev,
      zones: {
        ...prev.zones,
        [this.zoneId]: (prev.zones[this.zoneId] || []).filter(b => b.id !== this.block.id),
      },
    }));
  }

  undo() {
    this.setState(prev => ({
      ...prev,
      zones: {
        ...prev.zones,
        [this.zoneId]: [...(prev.zones[this.zoneId] || []), this.block],
      },
    }));
  }
}

export class MoveBlockCommand implements EditorCommand {
  description = 'Move block';

  constructor(
    private setState: React.Dispatch<React.SetStateAction<PageInstance>>,
    private fromZone: string,
    private toZone: string,
    private block: ContentBlock,
    private toIndex: number,
  ) {}

  execute() {
    this.setState(prev => {
      const fromBlocks = prev.zones[this.fromZone] || [];
      const toBlocks = prev.zones[this.toZone] || [];

      return {
        ...prev,
        zones: {
          ...prev.zones,
          [this.fromZone]: fromBlocks.filter(b => b.id !== this.block.id),
          [this.toZone]: [
            ...toBlocks.slice(0, this.toIndex),
            { ...this.block, zoneId: this.toZone },
            ...toBlocks.slice(this.toIndex),
          ],
        },
      };
    });
  }

  undo() {
    // Reverse the move
    this.setState(prev => {
      const fromBlocks = prev.zones[this.toZone] || []; // It's currently in toZone
      const toBlocks = prev.zones[this.fromZone] || []; // We want to move it back to fromZone

      return {
        ...prev,
        zones: {
          ...prev.zones,
          [this.toZone]: fromBlocks.filter(b => b.id !== this.block.id),
          [this.fromZone]: [...toBlocks, { ...this.block, zoneId: this.fromZone }], // Simplified undo, just appends
        },
      };
    });
  }
}
