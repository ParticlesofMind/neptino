export interface TemplateBlockConfig {
  id: string;
  type: 'header' | 'program' | 'resources' | 'content' | 'assignment' | 'footer';
  label: string;
  icon: string;
  defaultConfig: Record<string, any>;
  configFields: TemplateConfigField[];
}

export interface TemplateConfigField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'color' | 'number';
  options?: { value: string; label: string }[];
  defaultValue?: any;
  required?: boolean;
}

export const TEMPLATE_BLOCKS: TemplateBlockConfig[] = [
  {
    id: 'header',
    type: 'header',
    label: 'Header',
    icon: 'header',
    defaultConfig: {
      showTitle: true,
      showSubtitle: true,
      backgroundColor: '#ffffff',
      textColor: '#333333'
    },
    configFields: [
      {
        name: 'showTitle',
        label: 'Show Title',
        type: 'checkbox',
        defaultValue: true
      },
      {
        name: 'showSubtitle',
        label: 'Show Subtitle',
        type: 'checkbox',
        defaultValue: true
      },
      {
        name: 'backgroundColor',
        label: 'Background Color',
        type: 'color',
        defaultValue: '#ffffff'
      },
      {
        name: 'textColor',
        label: 'Text Color',
        type: 'color',
        defaultValue: '#333333'
      }
    ]
  },
  {
    id: 'program',
    type: 'program',
    label: 'Program',
    icon: 'program',
    defaultConfig: {
      showObjectives: true,
      showOutcomes: true,
      showPrerequisites: false
    },
    configFields: [
      {
        name: 'showObjectives',
        label: 'Show Learning Objectives',
        type: 'checkbox',
        defaultValue: true
      },
      {
        name: 'showOutcomes',
        label: 'Show Learning Outcomes',
        type: 'checkbox',
        defaultValue: true
      },
      {
        name: 'showPrerequisites',
        label: 'Show Prerequisites',
        type: 'checkbox',
        defaultValue: false
      }
    ]
  },
  {
    id: 'resources',
    type: 'resources',
    label: 'Resources',
    icon: 'resources',
    defaultConfig: {
      allowFiles: true,
      allowLinks: true,
      allowVideos: true,
      maxFiles: 10
    },
    configFields: [
      {
        name: 'allowFiles',
        label: 'Allow File Uploads',
        type: 'checkbox',
        defaultValue: true
      },
      {
        name: 'allowLinks',
        label: 'Allow External Links',
        type: 'checkbox',
        defaultValue: true
      },
      {
        name: 'allowVideos',
        label: 'Allow Video Embeds',
        type: 'checkbox',
        defaultValue: true
      },
      {
        name: 'maxFiles',
        label: 'Maximum Files',
        type: 'number',
        defaultValue: 10
      }
    ]
  },
  {
    id: 'content',
    type: 'content',
    label: 'Content',
    icon: 'content',
    defaultConfig: {
      editor: 'rich-text',
      allowMedia: true,
      allowTables: true
    },
    configFields: [
      {
        name: 'editor',
        label: 'Editor Type',
        type: 'select',
        options: [
          { value: 'rich-text', label: 'Rich Text Editor' },
          { value: 'markdown', label: 'Markdown Editor' },
          { value: 'plain-text', label: 'Plain Text' }
        ],
        defaultValue: 'rich-text'
      },
      {
        name: 'allowMedia',
        label: 'Allow Media Uploads',
        type: 'checkbox',
        defaultValue: true
      },
      {
        name: 'allowTables',
        label: 'Allow Tables',
        type: 'checkbox',
        defaultValue: true
      }
    ]
  },
  {
    id: 'assignment',
    type: 'assignment',
    label: 'Assignment',
    icon: 'assignment',
    defaultConfig: {
      allowSubmissions: true,
      requireDueDate: true,
      enableGrading: true,
      maxSubmissions: 1
    },
    configFields: [
      {
        name: 'allowSubmissions',
        label: 'Allow Student Submissions',
        type: 'checkbox',
        defaultValue: true
      },
      {
        name: 'requireDueDate',
        label: 'Require Due Date',
        type: 'checkbox',
        defaultValue: true
      },
      {
        name: 'enableGrading',
        label: 'Enable Grading',
        type: 'checkbox',
        defaultValue: true
      },
      {
        name: 'maxSubmissions',
        label: 'Maximum Submissions',
        type: 'number',
        defaultValue: 1
      }
    ]
  },
  {
    id: 'footer',
    type: 'footer',
    label: 'Footer',
    icon: 'footer',
    defaultConfig: {
      showCredits: true,
      showDate: true,
      showContact: false
    },
    configFields: [
      {
        name: 'showCredits',
        label: 'Show Credits',
        type: 'checkbox',
        defaultValue: true
      },
      {
        name: 'showDate',
        label: 'Show Creation Date',
        type: 'checkbox',
        defaultValue: true
      },
      {
        name: 'showContact',
        label: 'Show Contact Information',
        type: 'checkbox',
        defaultValue: false
      }
    ]
  }
];
