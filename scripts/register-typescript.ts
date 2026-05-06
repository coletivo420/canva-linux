import fs from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';

const extensions = require.extensions as Record<string, (mod: NodeJS.Module, filename: string) => void>;

extensions['.ts'] = (mod: NodeJS.Module, filename: string): void => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      sourceMap: false,
    },
    fileName: filename,
  }).outputText;

  (mod as NodeJS.Module & { _compile: (code: string, filename: string) => void })._compile(output, filename);
};

void Module;
