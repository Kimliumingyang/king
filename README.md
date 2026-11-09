# Don't Drop the King! — Stage 0 + 1

可玩的 Level 01 物理灰盒。按照正式规格分阶段制作；当前止于阶段 1，不是完整游戏。

## 启动
Node.js 22.12+（验证版本 24.22.1）。
```
npm install
npm run dev
```
打开终端中的本地链接。`?debug=1` 开启碰撞体、质心、双探针、真实接触点、风险值、FPS、实时调参。

A / 左箭头：制动及倒退。D / 右箭头：推进。Space / W：悬浮增强，消耗能量。P / Esc：暂停。R：确认后重开。触屏可按底部三键。窗口失焦自动暂停。当前无音频，因此没有无效静音按钮。

## 构建与测试
```
npm run build
npm run dev -- --port 5173
# 另一个终端；需要 Chromium
CHROMIUM_PATH=/usr/bin/chromium npm test
```
可使用 Playwright 安装的 Chromium 路径替代。`TEST_URL` 可切换到静态构建服务器测试。dist/ 是可托管静态文件，需要 HTTP 服务，不能双击 file://。Vite 使用相对资源路径，可在 GitHub Pages 项目子目录中运行。

## 本次范围
Phaser 3 + bundled Matter.js + TypeScript + Vite。独立国王刚体、真实接触/摩擦、双探针弹簧阻尼、推进惯性、Boost、失衡预警、镜头、停稳通关、暂停、重开、调试界面。L01 从 JSON 中的关卡及地形参数实例化；其余 14 关保留配置，未开发。船上没有固定国王坐标的约束。

按阶段 1 要求使用原创几何占位，颜色沿用批准图；正式国王/两名士兵、美术动画在阶段 5。参考图只随设计文档提供，未作为游戏贴图。没有第三方美术/字体/音乐。Phaser/Matter/Vite/TypeScript 等许可见各依赖；本包保留用户提供的规格，不能据此推定其对外分发授权。

## 后续与限制
阶段 2 才实现一次免费 Royal Rescue、永久免费 checkpoint、暂存 run 防刷新及失败短演出。当前失败可直接重开，没有收费、广告或虚假救援按钮。checkpoint 旗帜仅预留位置。无经济/升级/存档；不要将此包用于正式发行。实际手机、人工完整手感验收及 80–120 秒教学节奏仍待验证。

详见 IMPLEMENTATION_PLAN.md、TASKS.md、QA_REPORT.md 和 evidence/results.json。原规格保存在 design-spec/，运行配置位于 data/。

## 在线走查

https://kimliumingyang.github.io/king/play/

调试模式：https://kimliumingyang.github.io/king/play/?debug=1 。当前发布的是阶段 1 灰盒。Pages 当前从 `main` 根目录发布，`play/` 保存可玩的静态构建；后续源码改动需重新构建并同步到 `play/`。`gh-pages` 另保留独立构建备份。
