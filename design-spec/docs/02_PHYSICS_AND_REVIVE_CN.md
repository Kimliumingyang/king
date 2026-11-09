# 02｜物理规则、状态机、复活机制（Codex 必须实现）

## 1. 推荐技术结构
- Phaser 3 + Matter.js + TypeScript + Vite，60Hz 固定步长物理更新。逻辑使用真实 delta 时，要加最大 timestep 限制，防 tab 返回跳帧。
- 物理实体：飞碟刚体 `ufoBody`（左右相对平衡、略偏平的复合体）；国王刚体 `kingBody`（椭圆/胶囊近似，可用 2–3 个圆构成复合体）；地形静态 segment 和移动障碍动态 rigid bodies。
- 两个小骑兵是随船的视觉件（可含轻微脚步/摇晃动画），不应参与主要质量模型。这样 Codex 易于先完成物理可玩性。
- 国王必须有真正碰撞与摩擦；“国王在飞船上”根据实际接触和接触位置判定，**不是把坐标强行绑船**。允许部分身体伸出甲板但仍能救回。
- 悬浮力：用飞碟左、右两个地表探针估计目标高度，分别施加“弹簧 + 阻尼”的向上力。左右探针差和船身角度影响俯仰；使用有限的稳定角力矩，不要直接瞬移或固定角度。
- Boost：增大期望离地高度与向上净升力，能量随时间消耗，只有在 `RUNNING` 生效。
- 所有数字仅为调试初值，以 `data/balance.json` 为准，并加开发者调试滑杆，可在浏览器内改变摩擦、质量、升力、重力、移动速度等。

## 2. 关键物理调校
- 基准视口 1280×720，世界位置使用 px。初始飞艇长约 200px，国王宽约 112px，甲板宽约 176px，悬浮高度 70–95px。
- 国王的高重心和滑动倾向要明显，但 Level 1 在直路上不应掉落；“可控制的危险”比极端物理真实更重要。
- UFO 船体最大建议俯仰 ±32°（可通过特殊平台突破）；小颠簸自动回正，急加速/刹车才显著影响重心。
- 玩家放开控制时，横向推力归零并保持摩擦/阻力，不应突然停住。
- 物理失控可救回：对国王接触点、重心离边缘百分比和角速度计算风险 `riskScore`，UI 显示边缘红线或小惊叹号；不要隐藏倒计时突然宣告死亡。
- 转动动画/皇冠/酒杯可以是非物理装饰，但国王主体和飞船本体不能仅用补间动画模拟。

## 3. 主状态机
`BOOT -> MAIN_MENU -> LEVEL_READY -> RUNNING -> DANGER -> KING_EJECTED -> FAIL_MENU -> (REVIVE_ANIMATION | CHECKPOINT_RESET | LEVEL_RESTART) -> RUNNING`
`RUNNING -> DOCKING -> LEVEL_CLEAR -> REWARD_SCREEN -> GARAGE/LEVEL_SELECT`
任意游玩态可进入 `PAUSED`；广告进入 `AD_PAUSED`，结束恢复原态。

## 4. 复活机制：两条免费继续路线 + 可选广告奖励路线
### 4.1 失败检测
1. 国王刚离开甲板 -> `DANGER`，有约 0.65s 恢复机会；如果重新接触甲板，恢复 `RUNNING`。
2. 恢复失败 -> `KING_EJECTED`。短暂展示国王翻滚、皇冠飞走、显示 `HE'S FLYING!`。过程停止经济计数，不可刷距离/硬币。
3. 进入 `FAIL_MENU`，显示距离、最佳成绩、最近检查点及可选继续方式。

### 4.2 Royal Rescue（本关每次尝试限 1 次免费）
- 条件：`freeRescueUsed = false` 且处于本关 `FAIL_MENU`。
- 用户点击 `ROYAL RESCUE (FREE)`。冻结场景，重设国王物理位置到飞碟甲板中心、清零他的线/角速度；将飞碟速度降至安全值，纠正倾角到 ±8°；将飞碟定位到最近的有效安全锚点（最多回退 10m），不能落到障碍碰撞体里。
- 触发 1 秒“皇家弹簧救援”动画：小飞碟用磁铁把国王从空中吸回来，皇冠重新扣在头上；**这是重要笑点**。
- 恢复后 2.5 秒受限保护：减少危险事件、允许玩家重新控制，不能利用保护穿墙或跳过不可逾越障碍。不得清除当前关卡的全部危险。
- 消耗一次机会；不从永久金币余额扣除；星级最高 2 星（除非达成特殊挑战的例外规则）。
- 关卡重新开始时机会重置；从检查点重试不恢复本次尝试已用的 Royal Rescue，防止通过反复 checkpoint 获取无限救援。

### 4.3 Checkpoint Retry（始终免费）
- 每关 1–2 个自动检查点，根据 `levels.json` 的 `checkpoints` 触发；首次进入触发时保存：关卡 id、当前检查点 id、玩家升级快照、种子、已收集金币 ID 集合、当前最好阶段表现。
- 失败菜单点 `RETRY FROM CHECKPOINT`：将飞碟和国王重建在预设的安全出生点，速度为 0，国王在甲板中心。不会扣除**永久**金币。
- 本关临时金币本次损失 20%，下限 0；已结算的金币/通关奖励绝不撤回。复活次数和救援使用状态维持。
- 已收集过的金币不可在同一关尝试中重复刷取；实现唯一 `pickupId` 集合。
- 为避免无尽捡币，每次 checkpoint 重试不支付相同路段的距离金币；重复挑战需要从关卡开始才允许刷新该关奖励上限。
- 若从未激活检查点，回到关卡起点（同样免费）。

### 4.4 Extra Rescue（平台差异化，可选且不作为基础体验）
- `enableAdRescue=false` 默认。只有官方 SDK 明确允许、奖励广告就绪且玩家主动选择时才能展示。
- CrazyGames（完成 Basic Launch 并启用适用广告能力时）与 GameDistribution：可以考虑额外的 `WATCH AD: EXTRA ROYAL RESCUE`，每关尝试最多一次，SDK 未填充/失败/未完成时**绝不扣除玩家已拥有资源，也不假装成功发奖励**。
- Playgama：**不实施每次死亡广告 +1 命**。默认广告救援功能关闭；用完成关卡后“额外金币”和可选特殊奖励替代。普通 checkpoint 复活永远可用。
- Basic Launch/无广告/广告拦截情况下：隐藏或禁用广告选项，并解释不可用，不得留下无响应按钮。Free Rescue + Checkpoint Retry 正常运行。
- UI 不主动每次死亡弹强制广告，玩家自己按键才可请求。

### 4.5 复活与存档细则
- 需要持久化：`highestUnlockedLevel`, `coinsWallet`, `upgradeLevels`, `bestStars`, `bestTimes`, `dailyChallengeDate`, `settings`。
- **本局** checkpoint 和免费复活状态写入暂存运行记录（`runState`），页面刷新可安全恢复到最近检查点，但不可反复刷新重置救援次数。
- 出于防刷： `runId`, `attemptId`, `freeRescueUsed`, `extraRescueUsed`, `claimedPickupIds`, `lastCheckpointId`, `runCoins` 全都纳入保存。
- 广告前后保存并恢复完整 `runState`；如果广告返回时无法确认奖励完成，直接回到 Fail Menu 和免费路线，不能扣币或卡死。

## 5. 复活 UI 文案
失败标题随机（不需要高频弹台词）：
- `YOUR MAJESTY IS AIRBORNE!`
- `THE KING HAS LEFT THE UFO.`
- `THAT WAS NOT A LANDING.`
- `ROYAL DELIVERY FAILED. AGAIN.`
按钮：`ROYAL RESCUE — FREE`（尚未使用）、`RETRY CHECKPOINT`、`RESTART LEVEL`。广告奖励仅在平台允许和 SDK 可用时出现 `WATCH AD FOR EXTRA RESCUE`。可单独加入 `SKIP ANIMATION`。

## 6. 验收硬约束
- 任意失败能在 2 次点击以内重新游玩；不可能因为广告失败阻塞。
- Royal Rescue 每次关卡尝试只能成功使用一次，即使刷新浏览器或故意杀进程也不能重复领取。
- 所有重生点避免国王和飞碟与地形/危险物相交；复活不会在下一物理帧即时死亡。
- 测试 30 次不同地形死法的重试、刷新、广告中断和低帧率恢复。
