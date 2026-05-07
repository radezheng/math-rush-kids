# STATUS

## Current milestone
W1/W2 — minimum viable WeChat adaptation

## Current status
- `game-core` remains shared and platform-neutral
- H5/browser preview remains available through `platform-web`
- `platform-wechat` now has a minimal Canvas 2D shell using shared `GameRuntime`
- WeChat adapter covers storage, lifecycle, input snapshot, and safe short haptic tap feedback
- Touch hit testing supports operation selection, difficulty selection, numeric keypad, submit, feedback next, replay, and home
- `npm run build:wechat` produces `dist-wechat/` with `game.js`, `game.json`, and `project.config.json`

## Current limitations
- WeChat side is MVP Canvas UI, not final visual polish
- Ads, login, leaderboards, remote code/CDN, and release automation are out of scope
- `project.config.json` uses `touristappid`; replace with a real AppID before release/device workflows

## Acceptance notes
- `npm test` ✅
- `npm run build` ✅
- `npm run build:wechat` ✅
- `dist-wechat/` output inspected ✅
