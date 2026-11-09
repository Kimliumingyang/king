# DON'T DROP THE KING! — Codex 开发交付包 v1.1

**定位**：2D 横版物理平衡 + 搞笑护送 + 关卡闯关 + 检查点复活 + 永久升级。目标：CrazyGames / Playgama / GameDistribution。

## 最重要的制作约束
1. `reference/APPROVED_GAMEPLAY_STYLE.png` 是**用户最终确认的画风和主画面参考**。不得擅自换成高饱和、3D、像素或写实风。图像是构图和角色参考，不是可拆分素材，不要直接将整张图片做为游戏背景并移动。
2. 国王：肥胖、浅米色带斑点、长眼睑、略微傲慢，头部小触角，宝石皇冠、红/酒红色白毛边披风、手持酒杯。两名士兵：细瘦绿色外星人、**头上各两根长触角**、中世纪风格护具、反应夸张。平台：简陋、单体悬浮 UFO，左右各一名士兵驾驶；两名士兵可为附着视觉件，MVP 不作复杂刚体。
3. **国王必须是独立物理实体**：与飞碟可相对移动、被碰撞、滑出和飞出；绝不能仅是固定贴图或绑定在船上的 Sprite。
4. 飞碟以惯性、倾斜、悬浮高度控制为核心；跨越复杂地形到达终点王座并**停稳**才算过关。
5. **复活机制必须做完整**：本关限用一次免费原地 Royal Rescue；之后可免费从检查点重试。SDK 允许时可配置额外奖励救援，但 Playgama 默认关闭广告换命；广告不可成为继续游戏的唯一途径。
6. 所有关卡和配置由 `data/*.json` 驱动；可调节参数，不将数值写死。
7. 先出可玩 MVP、物理验收和完整存档，再制作全部 15 关和广告 SDK。不要一次性生成庞大、不可测试的代码。

## 目录
- `docs/01_GAME_MECHANICS_CN.md`：完整玩法策划、关卡闭环、操作、搞笑事件、胜负判定、留存。
- `docs/02_PHYSICS_AND_REVIVE_CN.md`：物理方案、状态机、复活机制与反作弊边界。
- `docs/03_LEVELS_AND_TERRAIN_CN.md`：15 关进度、地形模板、组合规则与难度设计。
- `docs/04_ECONOMY_AND_RETENTION_CN.md`：金币、升级、任务、每日挑战、存档。
- `docs/05_PLATFORM_AND_QA_CN.md`：SDK 抽象、多平台差异、广告安全、完整验收流程。
- `docs/06_CODEX_PROMPTS_CN.md`：依次复制给 Codex 的开发阶段指令。
- `data/balance.json`：核心物理、经济、复活初始配置（待手感调校）。
- `data/levels.json`：15 个配置关卡（地形模块排列、检查点和停靠要求；实际碰撞坐标须 Codex 实现与 QA）。
- `data/terrain_modules.json`：12 种地形模块的参数边界。
- `data/platform_profiles.json`：平台功能开关。
- `docs/07_TEST_CASES_CN.md`：20 条关键测试场景。
- `data/king_events.json`：可预警的国王行为事件。
- `reference/APPROVED_GAMEPLAY_STYLE.png`：确定的主画面风格图。

## 启动 Codex 的第一条指令
> 先阅读本包的 README_FIRST.md、docs/*.md 与 data/*.json。请仅实施 docs/06_CODEX_PROMPTS_CN.md 的阶段 0，然后按阶段 1，创建可运行的 HTML5 游戏框架和可配置的物理原型。不要在阶段 1 植入广告，不要一次性实现全部关卡。每个阶段完成后本地构建、手动 QA、记录结果，再进入下一阶段。

## 事实边界
这是一份**可执行开发规格**，不是已完成的游戏源代码；参照图是静态概念画面。难度、时长和金币参数均为设计初值，不是已验证的玩家数据；必须通过真实游玩与设备测试调整。上线审核与收入均不能保证。
