import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outDir = resolve(root, 'dist-wechat');
const wechatDir = resolve(root, 'platform-wechat');

mkdirSync(outDir, { recursive: true });
copyFileSync(resolve(wechatDir, 'game.json'), resolve(outDir, 'game.json'));
copyFileSync(resolve(wechatDir, 'project.config.json'), resolve(outDir, 'project.config.json'));

console.log(`WeChat Mini Game package is ready: ${outDir}`);
