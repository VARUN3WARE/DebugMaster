import Editor from '@monaco-editor/react';

const baseOptions = {
  fontSize: 14,
  lineHeight: 22,
  minimap: { enabled: false },
  scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
  padding: { top: 16 },
  renderLineHighlight: 'line',
  wordWrap: 'on',
};

const CodeEditor = ({ value, onChange, readOnly }) => {
  return (
    <Editor
      height="100%"
      defaultLanguage="javascript"
      value={value}
      theme="vs-dark"
      options={{ ...baseOptions, readOnly }}
      onChange={(nextValue) => onChange(nextValue ?? '')}
    />
  );
};

export default CodeEditor;
