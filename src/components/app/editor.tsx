
'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import type * as monaco from 'monaco-editor';
import { Loader2 } from 'lucide-react';

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
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    let cancelled = false;

    const initMonaco = async () => {
        const monacoLoader = await import('@monaco-editor/loader');
        const monacoInstance = await monacoLoader.default.init();
        
        if (cancelled || !containerRef.current) return;
        
        editorRef.current = monacoInstance.editor.create(containerRef.current, {
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
        setIsLoading(false);
    };

    initMonaco();

    return () => {
      cancelled = true;
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
        // Since we are using an instance, we access editor.setModelLanguage this way
        editorRef.current._editorService.setModelLanguage(model, language);
      }
    }
  }, [language]);


  return (
    <div className="relative h-full w-full">
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        )}
        <div ref={containerRef} className="h-full w-full border rounded-md" />
    </div>
    );
}
