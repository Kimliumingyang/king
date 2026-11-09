# 美术 / 动效 / 音频交接 · v0.6.0

阶段 5 的事件、动作状态、三世界样稿与替换接口已补齐。正式原画/录音尚待用户交付；当前 SVG 与合成音为可玩的原创样稿，不宣称已收到最终美术。

## 直接下载

- [完整制作包 ZIP](https://kimliumingyang.github.io/king/play/downloads/DDTK_Art_Audio_Kit_v0.6.0.zip)
- [Excel 清单](https://kimliumingyang.github.io/king/play/downloads/DDTK_Art_Audio_List_v0.6.0.xlsx)
- [CSV 清单](https://kimliumingyang.github.io/king/play/downloads/DDTK_Art_Audio_List_v0.6.0.csv)
- [可搜索网页清单](https://kimliumingyang.github.io/king/play/downloads/)

清单 111 项。背景 9 层（3 世界×3层）；国王12种动作、独立王冠3态、左右士兵各3态；UFO/救援/王座/检查点/金币/特效、10种地形分件、21种UI部件、4首BGM+3条环境循环+28类SFX。每项列英文ID、中文名、实际路径、尺寸、帧数/FPS、循环、位置、触发与优先级。

## 制作与上传

详细说明在 [asset-kit/00_阅读与上传说明.md](asset-kit/00_阅读与上传说明.md)，角色锚点、背景分层、音频布点、GitHub检查、署名许可分别有独立文档。ZIP 含表格、说明、当前 SVG、参考图和空上传目录模板。

按 `game-assets/assets/` 下的 backgrounds、characters、props、terrain、ui、audio 目录上传。可编辑源文件放 `art-source/` 并附作者/许可。先交一批 P0 即可；告诉我目录或 commit，我会校验与接入，不要求你改代码或 manifest。

角色 sheet 采用单行横排、统一中心锚点、透明 PNG，不裁掉逐帧留白。国王不带皇冠，王冠单独交付。两名士兵各两根长触角。不得新增 UFO 护栏，或为贴合图像改变主刚体。保持已批准低饱和灰蓝/灰紫/奶油/酒红画风。

运行时自动槽支持 King/王冠/士兵/UFO/王座、三层背景、音频；UI 面板/Logo/按钮有CSS槽。地形、特效和图标到货后由我按实际轮廓最后对齐。`npm run assets:check` 校验唯一 ID、启用文件存在、PNG 帧尺寸；缺资产继续使用内置样稿。`npm run assets:kit` 从统一目录生成清单与下载包（保留对应 ID 已审核的开关、路径和帧尺寸）。
