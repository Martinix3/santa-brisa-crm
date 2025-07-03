'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';

interface EditorProps {
  value: string;
  language?: string;
  onChange?: (value: string) => void;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
}

export default function Editor({ value, language = 'typescript', onChange, options }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value,
        language,
        automaticLayout: true,
        theme: 'vs-dark',
        minimap: { enabled: false },
        ...options,
      });

      if (onChange) {
        editorRef.current.onDidChangeModelContent(() => {
          const currentValue = editorRef.current?.getValue();
          if (currentValue !== undefined) {
            onChange(currentValue);
          }
        });
      }
    }

    // Cleanup function to dispose the editor instance
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Update editor value when the prop changes
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && !model.isDisposed() && model.getValue() !== value) {
        editorRef.current.setValue(value);
      }
    }
  }, [value]);

  // Update editor language when the prop changes
  useEffect(() => {
    if (editorRef.current) {
        const model = editorRef.current.getModel();
        if(model && !model.isDisposed()) {
            monaco.editor.setModelLanguage(model, language);
        }
    }
  }, [language]);


  return <div ref={containerRef} className="h-full w-full border rounded-md" />;
}
