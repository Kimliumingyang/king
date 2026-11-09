# Don't Drop the King! — Stage 0–2

可玩 Level 01 物理原型，当前完成到阶段 2：独立刚体、失败演出、免费 Royal Rescue、永久免费检查点重试和本局持久化。按照正式规格逐阶段制作，尚未制作全部关卡或正式角色美术。

## 在线走查

https://kimliumingyang.github.io/king/play/

调试模式：https://kimliumingyang.github.io/king/play/?debug=1 。第一次选择 PLAY；存在存档时选择 CONTINUE。GitHub Pages 当前从 `main` 根目录发布，`play/` 保存可玩的静态构建。源码与在线构建一起提交。

## 启动

Node.js 22.12+（验证版本 24.22.1）。
```
npm install
npm run dev
```
`?debug=1` 显示碰撞体、质心、双探针、接触、风险、FPS、检查点、救援次数和实时物理调参。

A / 左箭头：制动及倒退；D / 右箭头：推进；Space / W：悬浮增强（消耗能量，仅 RUNNING 生效）；P / Esc：暂停；R：确认后重开。触屏使用底部三键，建议横屏。失焦自动暂停。当前没有音频。

## 失败与继续

- 离开甲板后有 650ms 实际接触恢复窗口，随后短暂翻滚/皇冠飞出，进入失败菜单；可跳过演出。
- ROYAL RESCUE — FREE：每个完整 run 一次。先持久保存已使用标记，再播放一秒磁铁回收动画；回到最近碰撞检查通过的位置，最大回退 10m。恢复后 2.5 秒轻度稳定/柔和推进，碰撞与失败判定保持正常。
- RETRY CHECKPOINT：永远免费。激活 240m 检查点后从其安全位置重建，否则从起点；速度清零。保留救援消耗、拾取 ID、run/attempt ID 和升级快照，临时金币损失 20%（向下取整）。
- RESTART LEVEL：确认后新建 run，恢复一次救援。
- 刷新回最近检查点；失败时刷新仍显示失败菜单；救援途中刷新保留已使用标记并安全回检查点。不能靠刷新或 checkpoint 领取额外救援。
- 三枚演示拾取币仅验证去重和临时扣除，不结算永久钱包、升级或星级（阶段 4）。重复路段不发里程金币。
- 存储被禁用时有明确提示，仍可免费重试；无法写入存档时不会发放无法记录的 Royal Rescue。主存档损坏可从验证过的 staging/backup 恢复；全部损坏则需明确选择新 run。

没有广告、广告按钮、SDK 或联网付费依赖。主菜单、继续、失败和恢复界面使用批准配色；国王/UFO 仍是阶段 1 几何占位，正式角色与动作在阶段 5。

## 构建、测试和更新发布

```
npm run build
npm run dev -- --port 5173
# 另一个终端
CHROMIUM_PATH=/usr/bin/chromium npm test
CHROMIUM_PATH=/usr/bin/chromium npm run test:revive
```

测试使用 Playwright 与 Chromium；可修改 `CHROMIUM_PATH`，`TEST_URL` 可指向生产预览服务器（必须带 `?debug=1`）。物理测试做正常输入控制；阶段 2 的 30 次重复失败通过仅 debug 模式下的 fixture 移动国王制造不同位置的跌落，后续失败/恢复走真实逻辑。不是 30 个真人完整通关或 30 个不同关卡。

`dist/` 是 HTTP 静态输出，不能直接用 file://。Vite 使用相对资源路径，关闭 publicDir，避免发布本地源码 ZIP。发布时把当前 dist 内容替换到 `play/` 并推送 main；独立 `gh-pages` 分支是旧版构建备份，不是当前 Pages 源。

## 范围、证据和资源

Phaser 3 + bundled Matter.js + TypeScript + Vite，固定 60Hz 物理。数据保留所有 15 关配方，本次仅实例化 L01。正式规格原样保存在 design-spec/；运行配置在 data/。新增 prototype_stage2.json 仅声明本阶段动画时长、自动保存间隔和演示拾取币。

见 IMPLEMENTATION_PLAN.md、TASKS.md、QA_REPORT.md、QA_STAGE2.md、evidence/results.json 和 evidence/stage2-results.json。已执行的自动化与截图检查不代替真实手机或人工手感验收。Level 01 脚本用时仍短于设计目标，尚未声称达到发行标准。

几何图形为原创占位，采用批准配色；参考整图从未作为游戏贴图。没有第三方美术/字体/音乐。依赖许可见各依赖包。用户提供的策划图文仅随项目保存，不推定获得对外商用授权。
