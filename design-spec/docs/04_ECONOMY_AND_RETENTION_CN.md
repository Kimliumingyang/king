# 04｜经济、升级、任务、留存与奖励

## 基本原则
- 玩家失败后仍有积累；复活不能无限刷取金币；升级提高操作容错但**不能让国王黏在飞碟上**。
- 广告只提供自愿的额外奖励，常规玩家不看广告也能完整通关所有 15 关。
- 所有价格和等级数据由 `data/balance.json` 驱动；下表是初始调校值，不是已验证的付费/留存预测。

## 金币获得与支付
- 首次过关基础奖励 = `100 + 20 * (levelIndex-1)`；每关每次进入时拾取币最多 100；三星达成额外 40；首次完成每关再奖励 80。
- 本关 `runCoins` 在成功结算时一次性进入钱包；Checkpoint Retry 会损失本局暂存金币的 20%，不影响已入钱包金币。
- 每个金币拥有 `pickupId`，每个 `runId` 的金币奖励只可结算一次；重复 checkpoint 区间不可再次领取、重复路程不发无尽的里程奖励。
- 新开完整关卡是新的 `runId`，允许再次获得正常通关奖励但**首次通关奖只付一次**。可给非首次通关设置每关每日递减的额外奖励，MVP 不必加入。

## 5 种升级（初始）
| ID | 属性 | 每级影响（建议） | 等级上限 | 基础价格 |
|---|---|---|---:|---:|
| engine | 水平动力 | +5% 推力，累计封顶 +20% | 4 | 120 |
| stabilizer | 自动倾角修正 | +8% 有限稳定力，封顶 +32% | 4 | 150 |
| grip | 甲板摩擦 | +6% 摩擦系数，封顶 +24% | 4 | 180 |
| battery | Boost 可用能量 | +9% 总能量，封顶 +36% | 4 | 200 |
| rescue_kit | 皇家救援缓冲 | +0.3s 危险恢复窗口（上限+0.9s），不增加免费次数 | 3 | 250 |
- 价格公式：`round(basePrice * 1.65 ** currentLevel / 10) * 10`。
- 所有升级必须在界面显示“当前→升级后”的具体数值变化。
- 从一局开始加载升级快照（`runUpgradeSnapshot`），避免中途切换升级造成物理状态不稳定。
- 原地免费 Royal Rescue 每个 run 固定一次，不通过升级获得额外免费命，避免破坏设计与广告政策。

## 三星评级
- 1★：送达王座（无需限定使用救援次数）。
- 2★：限时 `timeSilverSec` 内，且 `totalRescues <= 1`。
- 3★：限时 `timeGoldSec` 内，且 **0 次救援、0 次 checkpoint retry、dangerCount<=2**。
- 已获星级只升级不回退；排行榜如无真实排名接口就不显示虚假排名。
- 首次通关解锁下一关，无星级门槛。

## 任务系统
- 固定初期任务：完成 L01、L03、L05；首次无救援完成；连续保住国王 120s；成功在危险边缘恢复 3 次；三星任意 3 关；完成 8 次皇家停靠。
- 每日任务池随机抽取 3 个可完成目标：完成 2 关、取得 1 个三星、累计飞行 1200m、3 次完整关卡无救援、收集 30 个新金币。每日任务可重复通过不同关卡达成，但应有单次 claim 状态。
- 任务奖励建议：每日单项 50–100 金币，3 项全部完成额外 100。第一版可先实现 1 个 daily challenge + 3 fixed goals。
- 每日重置按用户**本地日历日期**，跨时区切换要守护不可无限刷：记录上次领取日期和 UTC 时间戳，用单调不回退的逻辑；不要要求登录。

## 复玩动机
- 15 关可重复拿三星、挑战更快送达。
- 可记录搞笑指标：`longestKingRollMeters`、`crownsLost`、`biggestNearMiss`、`totalRescues`，**不为故意摔国王提供大量金币**。
- 未来 DLC：新的皇室飞碟皮肤、国王表情/祝贺动作、额外关卡。MVP 仅需 2 个静态外观（可延期）。

## 存档版本与数据模型
- 关键永久字段：`schemaVersion`、`highestUnlockedLevel`、`coinsWallet`、`upgradeLevels`、`bestStars`、`bestTimes`、`completedLevels`、`claimedFirstClear`、`missions`、`settings`、`lastSavedAt`。
- Run 字段：`runId`、`levelId`、`seed`、`checkpointId`、`freeRescueUsed`、`adRescueUsed`、`retries`、`claimedPickupIds`、`runCoins`、`runUpgradeSnapshot`、`elapsedMs`。
- 原子保存：运行态先序列化并校验到 staging key，再替换主 key；加载失败应使用最近有效备份，不得悄悄清零已确认的金币或过关记录。
- `localStorage` 作为基础回退。具备平台云存档能力才启用适配器；先读取/比较数据版本后合并，不能用旧云档覆盖新本地档。
- 刷新从最近检查点恢复时保留 `freeRescueUsed`；广告开始前、成功后、切后台与结算时强制保存。
