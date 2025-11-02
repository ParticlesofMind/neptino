/**
 * Tool Configuration for Engine Modes
 * Defines tools and their settings for each mode (build, animate)
 */

export interface ToolOption {
  id: string;
  type: 'number' | 'select' | 'color' | 'shape' | 'text-style';
  label: string;
  settings?: Record<string, any>;
}

export interface Tool {
  id: string;
  name: string;
  icon: string;
  options?: ToolOption[];
}

export interface ModeConfig {
  id: string;
  name: string;
  icon: string;
  tools: Tool[];
}

export const toolConfigs: Record<string, ModeConfig> = {
  build: {
    id: 'build',
    name: 'Build',
    icon: '/src/assets/icons/coursebuilder/modes/mode-build.svg',
    tools: [
      {
        id: 'selection',
        name: 'Select',
        icon: '/src/assets/icons/coursebuilder/tools/tool-select.svg',
      },
      {
        id: 'pen',
        name: 'Pen',
        icon: '/src/assets/icons/coursebuilder/tools/tool-pen.svg',
        options: [
          { id: 'size', type: 'number', label: 'Pen Size', settings: { min: 1, max: 15, value: 2 } },
          { id: 'stroke', type: 'color', label: 'Stroke Color', settings: { value: '#282a29' } },
          { id: 'fill', type: 'color', label: 'Fill Color', settings: { value: '#fef6eb', allowTransparent: true } },
        ],
      },
      {
        id: 'brush',
        name: 'Brush',
        icon: '/src/assets/icons/coursebuilder/tools/tool-brush.svg',
        options: [
          { id: 'size', type: 'number', label: 'Brush Size', settings: { min: 10, max: 50, value: 20 } },
          { id: 'color', type: 'color', label: 'Brush Color', settings: { value: '#2b8059' } },
        ],
      },
      {
        id: 'text',
        name: 'Text',
        icon: '/src/assets/icons/coursebuilder/tools/tool-write.svg',
        options: [
          {
            id: 'fontSize',
            type: 'select',
            label: 'Text Size',
            settings: {
              options: [
                { value: '12', label: 'Normal Text (12 pt)' },
                { value: '26', label: 'Title (26 pt)' },
                { value: '20', label: 'Header 1 (20 pt)' },
                { value: '16', label: 'Header 2 (16 pt)' },
                { value: '14', label: 'Header 3 (14 pt)' },
              ],
              value: '16',
            },
          },
          { id: 'textStyle', type: 'text-style', label: 'Text Style' },
          {
            id: 'fontFamily',
            type: 'select',
            label: 'Font Family',
            settings: {
              options: [
                { value: 'Arial', label: 'Arial' },
                { value: 'Times New Roman', label: 'Times New Roman' },
                { value: 'Georgia', label: 'Georgia' },
                { value: 'Verdana', label: 'Verdana' },
                { value: 'Tahoma', label: 'Tahoma' },
              ],
              value: 'Arial',
            },
          },
          { id: 'color', type: 'color', label: 'Text Color', settings: { value: '#282a29' } },
        ],
      },
      {
        id: 'shapes',
        name: 'Shapes',
        icon: '/src/assets/icons/coursebuilder/tools/tool-shapes.svg',
        options: [
          { id: 'shape', type: 'shape', label: 'Shape Type', settings: { value: 'rectangle' } },
          { id: 'strokeWidth', type: 'number', label: 'Thickness', settings: { min: 1, max: 20, value: 2 } },
          { id: 'stroke', type: 'color', label: 'Stroke', settings: { value: '#282a29' } },
          { id: 'fill', type: 'color', label: 'Fill', settings: { value: 'transparent', allowTransparent: true } },
        ],
      },
      {
        id: 'tables',
        name: 'Tables',
        icon: '/src/assets/icons/coursebuilder/media/media-table.svg',
        options: [
          { id: 'size', type: 'number', label: 'Table Size', settings: { min: 1, max: 20, value: 3 } },
          {
            id: 'tableType',
            type: 'select',
            label: 'Table Type',
            settings: {
              options: [
                { value: 'basic', label: 'Basic' },
                { value: 'bordered', label: 'Bordered' },
                { value: 'striped', label: 'Striped' },
              ],
              value: 'basic',
            },
          },
        ],
      },
      {
        id: 'generate',
        name: 'Generate',
        icon: '/src/assets/icons/bot-icon.svg',
        options: [
          // AI generation options can be added here
        ],
      },
      {
        id: 'eraser',
        name: 'Eraser',
        icon: '/src/assets/icons/coursebuilder/tools/tool-eraser.svg',
        options: [
          { id: 'size', type: 'number', label: 'Eraser Size', settings: { min: 5, max: 50, value: 20 } },
        ],
      },
    ],
  },
  animate: {
    id: 'animate',
    name: 'Animate',
    icon: '/src/assets/icons/coursebuilder/modes/mode-animate.svg',
    tools: [
      {
        id: 'selection',
        name: 'Select',
        icon: '/src/assets/icons/coursebuilder/tools/tool-select.svg',
      },
      {
        id: 'scene',
        name: 'Scene',
        icon: '/src/assets/icons/coursebuilder/modes/mode-animate.svg',
      },
      {
        id: 'path',
        name: 'Path',
        icon: '/src/assets/icons/coursebuilder/tools/tool-pen.svg',
      },
      {
        id: 'modify',
        name: 'Modify',
        icon: '/src/assets/icons/coursebuilder/tools/tool-shapes.svg',
      },
    ],
  },
};
