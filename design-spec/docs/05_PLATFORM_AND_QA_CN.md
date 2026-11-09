# 05｜三平台发行适配、广告、QA 验收

> 注意：具体 SDK 接口与广告政策以交付时各平台**最新官方文档**为准；不要假设以下是可以直接复制的真实方法名。本文件定义的是游戏内部适配器接口与行为规范。开发前必须再次核对三方审核与 SDK 指南。

## 核心 SDK 抽象接口（我们自己实现）
```ts
interface PlatformBridge {
  init(): Promise<void>;
  isAdAvailable(kind: 'interstitial'|'rewarded'): Promise<boolean>;
  showInterstitial(placement: 'level_end'|'natural_break'): Promise<'shown'|'skipped'|'unavailable'|'error'>;
  showRewarded(placement: 'bonus_coins'|'extra_rescue'): Promise<'completed'|'not_completed'|'unavailable'|'error'>;
  loadSave(): Promise<string | null>;
  save(data: string): Promise<void>;
  gameplayStart?(): void;
  gameplayStop?(): void;
}
```
- 实现 `MockBridge`（localhost，零广告）、`CrazyGamesBridge`、`PlaygamaBridge`、`GameDistributionBridge`。
- 所有第三方 SDK 只在各自构建目标里加载；启动流程先初始化平台再进入主菜单；SDK 初始化失败允许落回安全的无广告/本地保存模式（平台要求必须调用的情况应提示并记录）。
- **不能凭空发放奖励**：只有 rewarded 明确返回 `completed` 才增加相应奖励；SDK 错误时提供普通免费的继续方案。
- 弹广告时暂停 Matter 物理、输入和音频，恢复时清零累积 delta，避免广告结束瞬间飞碟失控。

## 发行构建
- `npm run build:local` 不调用广告，供快速 QA。
- `npm run build:crazygames` CrazyGames SDK，Basic Launch 仍能完整游玩而不依赖广告；待具备相应权限再按官方要求启用。
- `npm run build:playgama` Playgama Bridge 集成。**不要把每次死亡看广告加命设为默认**，免费 checkpoint 必须常开。
- `npm run build:gamedistribution` GameDistribution 专用官方 SDK；需要按官方审核流程调试。
- 全部使用 HTTPS 资源路径，禁止游戏中重新加载不可控远程第三方脚本；加载状态、同意流程等按平台要求配置。

## 广告位置设计
| placement | 时机 | 类型 | 条件 |
|---|---|---|---|
| level_end | 关卡结束结算转场 | 插屏 | 平台允许且 SDK 判断可显示，频控由 SDK 决定 |
| bonus_coins | 通关结算屏“额外+50%金币” | 自愿 rewarded | 用户点击且 ready；仅奖励本关结算金币部分，单次领取 |
| extra_rescue | 失败屏额外救援 | 自愿 rewarded，**默认关闭** | 仅 SDK、平台政策明确允许；每个 run 最多一次；永远保留 checkpoint 免费路线 |
- 不在游戏启动前、不在操作中、不在每次死亡强制插屏；不可重复连续请求广告。
- 开发和 Basic Launch 阶段 `adsEnabled=false`，不影响菜单、奖励、存档、继续游戏。
- 广告结算系统写幂等键 `rewardClaimId=runId+placement+ordinal`，防重复回调发币。

## 强制 QA 清单
### 核心玩法
- 低速 40 秒不自发甩飞；高速急刹可滑落；玩家通过合理减速可以救回国王；任何平台帧率变化不使物理突然爆炸。
- 每关至少一组零升级、零复活通过记录；L01 必须 10 秒内可操作；L15 无软锁。
- 检查点重生位置不和碰撞地形交叉；`Royal Rescue` 不能被刷新白嫖重置；没有广告也可通全游戏。
- 到达终点只有成功低速停泊才算胜利；不能简单越过终点线立即结算。
### 存档与运行
- 打通 L03 后刷新，升级与星级不丢；用过免费救援后刷新不会重置。
- 在 checkpoint、领奖、升级、失败菜单、SDK 中断时刷新均可恢复；保存损坏能回滚到最近完整版本。
- 触屏按钮与桌面按键分别测试，指针松开后绝不卡住持续加速。
### 广告与平台
- 无广告权限/广告拦截/SDK 超时/关闭广告/看广告未完成，所有按钮都有反馈且能返回正常游玩。
- 观看 rewarded 成功最多触发 1 次奖励；不完整或未开始的广告不发币。
- 页面后台/失焦期间物理、计时停止；恢复时无巨大时间步。
### 性能与资源
- 首批目标 60fps 桌面、主流中端手机尽可能稳定 30fps，依实际设备报告；资源复用，减少多边形和动态刚体。
- 画面基准 1280×720，横屏；主角始终完整可见、可预见前方危险；缩放时 UI 不遮挡。
- 无侵犯版权的商业音乐/贴图/字体；最终所有游戏素材分件导出，来源可追踪。

## 自测日志格式（交付时 Codex 应生成）
`date | build | platform | levelId | device/browser | fps | action | expected | actual | pass/fail | screenshot`。
任何关键 P0（卡死、无法过关、存档丢失、广告破坏状态）未清零，不提交审核。
