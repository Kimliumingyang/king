# Don't Drop the King! — Stage 0–4 · v0.4.0

15 关物理护送游戏。当前完成金币结算、五条升级线、三星/最佳纪录、任务与每日挑战，并提高关卡密度和断崖操作要求。正式角色美术和 SDK 尚未制作。

## 在线走查

https://kimliumingyang.github.io/king/play/?v=0.4.0

调试：https://kimliumingyang.github.io/king/play/?debug=1&v=0.4.0 。QA 下拉框可直接看全部 15 关；正常模式逐关解锁。打开 COINS 可进入车库，开始/暂停/结算菜单可进入任务。

## 启动与操作

Node.js 22.12+（验证 24.22.1）。
```
npm install
npm run dev
```
A / ← 制动、倒退；D / → 推进；Space / W 悬浮增强；P / Esc 暂停；R 确认后重开。触屏用底部三键，建议横屏。页面失焦自动暂停。危险预警状态仍允许操控和持续 Boost，菜单/动画期间不接受推进。当前没有音频。

慢进波浪和险坡；断崖前蓄速、短喷，落地后再刹车；限高不要 Boost。终点须保持真实甲板接触、低速、小倾角并停稳 1.5 秒。

## 金币、升级与记录

- 成功奖励：100 + 20×(关卡序号−1)，加本局拾取币；首次每关 +80，三星 +40。结算后一次进入永久钱包。重复刷新不会重复领取。
- 1★ 送达；2★ 银牌时间内、救援<=1；3★ 金牌时间内、无救援/检查点重试、dangerCount<=2。最佳星级不降、最佳时间只改善，过关即解锁。
- Engine / Stabilizer / Deck Grip / Battery 上限 4；Rescue Kit 上限 3。车库显示价格和升级前后数值，参数来自 balance.json。
- 购买只影响下一局/完整重开；本局和检查点继续使用开局能力快照。救援包只延长缓冲，不增加免费次数。金币不够可继续免费通关赚取，不需要广告。
- L01/L03/L05 三项固定任务各领取一次。每日挑战是 L01、Boost 弱 15%，无救援/无检查点重试可得 +100；同一当地日期不能重复领。额外 UTC 冷却保护可能推迟午夜附近的下一次每日奖励；普通游戏不受影响。

## 免费继续与存档

每 run 一次 ROYAL RESCUE — FREE，含一秒磁铁回收和 2.5 秒有限保护；不会关闭碰撞或清空机关。RETRY CHECKPOINT 永远免费，未激活检查点就回起点；只损失 20% 临时币，永久钱包不扣。RESTART LEVEL 确认后创建新 run、恢复一次救援。

刷新保留救援消耗、检查点、拾取 ID、能力快照、钱包、解锁、星级、最佳纪录及任务领取状态。原有 2.4px/m 存档自动换算为 6px/m。旧解锁保留，不批量补发所有历史金币；当前已完成但未结算的 run 可恢复结算一次。

存档使用校验过的 staging/main/backup。主副本损坏可恢复；全部永久档损坏时保留原数据并提示，不默默清空钱包。存储被禁用时免费玩法仍可用，但无法确认永久奖励/购买。没有广告或 SDK 依赖。

## 构建和验证

```
npm run build
npm run dev -- --port 5173
# 另一个终端，需 Chromium
CHROMIUM_PATH=/usr/bin/chromium npm test
CHROMIUM_PATH=/usr/bin/chromium npm run test:economy
CHROMIUM_PATH=/usr/bin/chromium npm run test:terrain
CHROMIUM_PATH=/usr/bin/chromium npm run test:revive
CHROMIUM_PATH=/usr/bin/chromium npm run test:levels
UPGRADE_MODE=basic npm run test:levels
UPGRADE_MODE=max npm run test:levels
npm run test:difficulty
```
`CHROMIUM_PATH` 可改为本机路径。`TEST_URL` 指向固定静态构建服务器并带 `?debug=1`，可测试生产输出。不要测试期间重建该服务器的目录。关卡三组测试中，basic 用一次人为 fixture 跌落触发救援；zero/max 不用救援。所有实际行进靠真实推进/Boost，未绑定国王或关闭碰撞。

`test:difficulty` 回放旧操作策略，部分失败是对比的预期结果；新策略的 `test:levels` 才要求全部通关。详细轨迹、经济测试及调校边界见 QA_STAGE4.md 和 evidence/stage4-*.json。

`dist/` 是 HTTP 静态输出；发布时将其内容同步到 `play/` 后推送 main。GitHub Pages 使用 main 根目录，`gh-pages` 是旧构建备份。请勿 file:// 直接双击。资源使用相对路径，没有打包本地源码 ZIP。

## 当前难度与后续

本次增加后期模块与组合，扩大波浪/坡度取值，断崖从原先不足船长扩大到 165–250px。L15 从 6 段增至 10 段，最长模块间平路由 1830px 缩短为约 866px。仍保留安全检查点与恢复段，15 关都有零升级通关记录。正式 UI/角色制作之前先验证这些操作深度，再以玩家走查继续调手感。

Phaser 3 + Matter.js + TypeScript + Vite，固定 60Hz。原始策划案在 design-spec/，运行配置在 data/。几何图形为原创占位并使用批准配色；参考整图未作为游戏背景。没有外部字体/音乐/美术。依赖许可见各依赖包；用户规格与参考图的保存不推定对外商用授权。

真实手机、真人首轮难度和完整发行审核尚未验证。下一阶段按批准参考制作角色、分件美术、动作与预警事件；经济/难度本阶段已完成，SDK 后续接入。

### v0.5.0 · First-level art / UI preview

[UI walkthrough](https://kimliumingyang.github.io/king/play/?review=1&v=0.5.0) provides eight screen shortcuts with temporary memory saves. [Normal play](https://kimliumingyang.github.io/king/play/?v=0.5.0) retains the existing local save. Physics and difficulty are unchanged from v0.4.0. See [ART_HANDOFF.md](ART_HANDOFF.md), [UI_REVIEW.md](UI_REVIEW.md) and [QA_STAGE5_PREVIEW.md](QA_STAGE5_PREVIEW.md). This is the first portion of stage 5, not completion of all art/events. SVG source assets are editable under src/assets/. `npm run test:ui` checks desktop, landscape, portrait, navigation, rescue and save isolation.


### v0.6.0 · Stage 5 implementation and harder handling

[Play](https://kimliumingyang.github.io/king/play/?v=0.6.0) · [UI/events/world walkthrough](https://kimliumingyang.github.io/king/play/?review=1&v=0.6.0) · [Download artist/audio ZIP](https://kimliumingyang.github.io/king/play/downloads/DDTK_Art_Audio_Kit_v0.6.0.zip) · [Excel](https://kimliumingyang.github.io/king/play/downloads/DDTK_Art_Audio_List_v0.6.0.xlsx) · [Searchable catalog](https://kimliumingyang.github.io/king/play/downloads/).

Six warned, seeded King events; crown can fall before the independent King; steeper terrain and slipperier contact in all15 levels; three layered world samples; replaceable spritesheets/audio with original SVG/synth fallbacks. M or the sound button toggles persisted mute. Final artist originals/recordings are still pending; no SDK or ad rollout is included. See ART_HANDOFF.md, UI_REVIEW.md and QA_STAGE5.md.

Artist uploads belong under `game-assets/assets/`; editable source files and licensing under `art-source/`. `npm run assets:check`, `npm run assets:kit`, `npm run test:events`, `npm run test:assets` supplement the existing physics/level/economy/rescue tests. Build now copies `game-assets/` as public assets; do not put runtime assets under ignored legacy public/output/.
