
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
  const subscriptionRef = useRef<monaco.IDisposable | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value,
        language,
        automaticLayout: true,
        theme: 'vs-dark',
        minimap: { enabled: false },
        ...options,
      });

      if (onChange) {
        subscriptionRef.current = editorRef.current.onDidChangeModelContent(() => {
          const currentValue = editorRef.current?.getValue();
          if (currentValue !== undefined) {
            onChange(currentValue);
          }
        });
      }
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.dispose();
      }
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && value !== model.getValue()) {
        editorRef.current.setValue(value);
      }
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);


  return <div ref={containerRef} className="h-full w-full border rounded-md" />;
}
