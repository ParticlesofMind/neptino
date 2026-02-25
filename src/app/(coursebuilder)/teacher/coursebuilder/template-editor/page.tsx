'use client';

import { CoursePageEditor } from '@/components/coursebuilder/template-editor/CoursePageEditor';
import { LESSON_TEMPLATE } from '@/templates/lesson';
import { QUIZ_TEMPLATE } from '@/templates/quiz';
import { useState } from 'react';

export default function TemplateEditorPage() {
  const [template, setTemplate] = useState(LESSON_TEMPLATE);

  return (
    <div className="flex flex-col h-screen">
      <div className="h-12 border-b bg-white flex items-center px-4 justify-between shrink-0 z-10 relative">
        <h1 className="font-semibold text-gray-700">Template Editor Prototype</h1>
        <div className="flex gap-2">
            <button
                onClick={() => setTemplate(LESSON_TEMPLATE)}
                className={`px-3 py-1 text-sm rounded ${template.id === LESSON_TEMPLATE.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            >
                Lesson Template
            </button>
            <button
                onClick={() => setTemplate(QUIZ_TEMPLATE)}
                className={`px-3 py-1 text-sm rounded ${template.id === QUIZ_TEMPLATE.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            >
                Quiz Template
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {/* We use key to force re-mount when template changes to reset state */}
        <CoursePageEditor key={template.id} template={template} />
      </div>
    </div>
  );
}
