import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const testEntry = resolve(rootDir, 'game-core/src/gameplay/mathRush.test.ts');
const source = readFileSync(testEntry, 'utf8');

const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ES2020,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  },
  fileName: testEntry,
});

const encoded = Buffer.from(transpiled.outputText, 'utf8').toString('base64');
await import(`data:text/javascript;base64,${encoded}`);
