'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import type * as monaco from 'monaco-editor';
import { Loader2 } from 'lucide-react';

// This is the new worker configuration logic
const configureMonacoWorkers = () => {
    // Check if running in a browser environment
    if (typeof window === 'undefined') {
        return;
    }

    // Define how Monaco loads its web workers
    // This is the modern ESM-compatible way
    self.MonacoEnvironment = {
        getWorker: function (moduleId, label) {
            if (label === 'json') {
                return new Worker(new URL('monaco-editor/esm/vs/language/json/json.worker', import.meta.url), { type: 'module' });
            }
            if (label === 'css' || label === 'scss' || label === 'less') {
                return new Worker(new URL('monaco-editor/esm/vs/language/css/css.worker', import.meta.url), { type: 'module' });
            }
            if (label === 'html' || label === 'handlebars' || label === 'razor') {
                return new Worker(new URL('monaco-editor/esm/vs/language/html/html.worker', import.meta.url), { type: 'module' });
            }
            if (label === 'typescript' || label === 'javascript') {
                return new Worker(new URL('monaco-editor/esm/vs/language/typescript/ts.worker', import.meta.url), { type: 'module' });
            }
            return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url), { type: 'module' });
        },
    };
};

// Configure workers right away at the module level
configureMonacoWorkers();

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
        // Now we import the ESM version directly
        const monacoInstance = await import('monaco-editor/esm/vs/editor/editor.api');
        
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
    const setLanguage = async () => {
        if (editorRef.current) {
            const model = editorRef.current.getModel();
            if (model) {
                const monacoInstance = await import('monaco-editor/esm/vs/editor/editor.api');
                monacoInstance.editor.setModelLanguage(model, language);
            }
        }
    };
    setLanguage();
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