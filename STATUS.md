# STATUS

## Current milestone
W1/W2 — minimum viable WeChat adaptation

## Current status
- `game-core` remains shared and platform-neutral
- H5/browser preview remains available through `platform-web`
- `platform-wechat` now has a Canvas 2D shell using shared `GameRuntime`
- WeChat home includes collapsed/expanded practice settings with touch-friendly controls for question count, max number, and difficulty
- WeChat adapter covers storage, lifecycle, input snapshot, and safe short haptic tap feedback
- Touch hit testing supports settings expand/collapse, question count / max number +/- controls, operation selection, difficulty selection, numeric keypad, submit, feedback next, replay, and home
- `npm run build:wechat` produces `dist-wechat/` with `game.js`, `game.json`, and `project.config.json`

## Current limitations
- WeChat side is MVP Canvas UI with top safe-area/menu-button spacing, not final visual polish
- Ads, login, leaderboards, remote code/CDN, and release automation are out of scope
- `project.config.json` uses `touristappid`; replace with a real AppID before release/device workflows

## Acceptance notes
- `npm test` ✅
- `npm run build` ✅
- `npm run build:wechat` ✅
- `dist-wechat/` output inspected ✅
