# GitHub 上传与接入

仓库：https://github.com/Kimliumingyang/king

1. 先按表格给文件命名。动画是**单行横排**，完整宽度=单帧宽×帧数；保留统一锚点和留白。
2. 运行资源上传到 `game-assets/assets/`：backgrounds / characters/king / characters/crown / characters/guards / props / terrain / ui / audio。`upload-template/` 提供同结构。
3. 可编辑源图放 `art-source/`，附 `LICENSE.md` 或 `CREDITS.md` 写清原创作者、第三方授权、署名要求。音频源 WAV 也可放 source 目录。无需上传参考图的裁切文件。
4. 先上传文件即可，不必删除现有 src/assets/*.svg，也不用修改 play/ 或 dist/。告诉我资源所在目录或 commit，我会核对尺寸、透明度、循环、描边与 pivot，逐项 enabled 并构建发布。
5. 若你自行接入：在 `game-assets/asset-manifest.json` 对对应 ID 改 `enabled: true`；不要改 id，路径相对 game-assets 根；执行 `npm run assets:check` 与 `npm run build`。
6. 自动替换支持角色 sheet、王冠/士兵/UFO、王座、三层背景、音频；UI 面板/按钮/Logo 有 CSS 槽。地形和特效/图标需按真实结构最后对齐，我会负责接入，不要求你写代码。
7. 最终上线前逐屏走查和15关物理回归。素材不能改变主刚体尺寸，不能给 UFO 新增安全护栏，不能覆盖断崖真实边界。

请先上传一小批 P0 看效果。清单本身不会把不存在的素材开启；当前 enabled=false 是正常的，运行仍有内置样稿。不要为了消除“未交付”标记将空文件或 README 改成 PNG。
