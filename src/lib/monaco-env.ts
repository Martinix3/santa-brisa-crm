// src/lib/monaco-env.ts
declare global { interface Window { MonacoEnvironment?: any } }

if (typeof window !== 'undefined') {
  const base = `${location.origin}/_next/static/monaco/`;
  const map: Record<string,string> = {
    json: 'json.worker.js', css: 'css.worker.js', scss: 'css.worker.js', less: 'css.worker.js',
    html: 'html.worker.js', handlebars: 'html.worker.js', razor: 'html.worker.js',
    typescript: 'ts.worker.js', javascript: 'ts.worker.js',
  };
  window.MonacoEnvironment = {
    getWorkerUrl(_id: string, label: string) {
      return base + (map[label] || 'editor.worker.js');
    }
  };
}
export {};
