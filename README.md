# Math Rush Kids · 口算冲冲冲

一个面向小学生的口算小游戏 MVP，当前支持 H5/browser 预览和最小可玩的微信小游戏 Canvas shell。

## 当前版本提供
- 首页运算选择：加 / 减 / 乘 / 除，支持多选
- 快速开始：默认 10 道、20 以内、普通难度
- 练习设置：H5 和微信 Canvas 首页均支持展开/收起，微信端用触摸友好的 +/- 控件调整题数与数字范围
- 逐题答题：大号数字输入区 + 儿童友好的数字键盘
- 即时鼓励：每题提交后给出温和反馈
- 连对奖励：3 / 5 / 8 连对触发额外鼓励
- 结果页领奖：星级、称号、奖励金币、再来一局

## 规则约束
- 没选运算时，开始游戏会自动兜底为加法 + 减法
- 减法默认不出负数
- 除法默认整除
- 默认档：10 道、20 以内、普通难度

## 架构
- `game-core/`：共享题目生成、答题判定、奖励规则、会话状态；不得依赖 `window` / `document` / `wx` / `tt`
- `platform-web/`：浏览器 H5 / studio 预览 UI
- `platform-wechat/`：微信小游戏 Canvas shell、`wx` 存储/生命周期/轻触震动适配、项目配置模板
- `platform-douyin/`：预留平台适配入口

## Commands

```bash
npm install
npm test
npm run build
npm run build:wechat
npm run dev -- --host 127.0.0.1 --port 4273
```

## 微信开发者工具导入
1. 运行 `npm run build:wechat`。
2. 用微信开发者工具导入 `dist-wechat/`。
3. 项目类型选择小游戏；当前 `appid` 是 `touristappid`，真机/发布前换成正式 AppID。

当前限制：微信端为 Canvas 2D 可玩闭环，已适配顶部安全区/胶囊按钮避让；广告、登录、排行榜不在本轮范围；分享/音频为安全轻量 stub，点击反馈优先使用短震动。
