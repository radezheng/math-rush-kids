# PLAN

## Goal
Create a browser-first mini-game template that can be adapted to WeChat and Douyin Mini Game runtimes without coupling platform APIs into core gameplay code.

## Completed
- Shared `game-core` for math question generation, answer judging, rewards, and session state
- Browser H5 preview in `platform-web`
- Minimal WeChat Mini Game Canvas shell in `platform-wechat`
- `npm run build:wechat` packaging to `dist-wechat/`

## Current milestone: W1/W2 minimum viable WeChat adaptation
- Keep `game-core` platform-neutral
- Keep H5 preview working
- Provide WeChat-importable `game.js`, `game.json`, and `project.config.json`
- Support one full playable run in WeChat Canvas: home, operation selection, question keypad, feedback, result

## Later milestones
- Douyin adapter and packaging
- Real AppID/project settings and device QA
- Optional audio/share polish
- Login, ads, leaderboards, and release pipeline
