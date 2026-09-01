个人创作存档网站
兼react手搓小游戏

## 日常更新流程

1. 改 `text/` 里的 md
2. `npm run build`
   - `prebuild` 会自动做正文检查、重算字数（`src/storiesData.ts`）、抓取正文里的外链插图
3. `npm run push`（交互式：跑构建 → 提交 → 推 GitHub → Vercel 自动部署）

依赖 Node 和 Python（脚本里 `python3` 取不到会自动回落 `python`）。

## 插图

正文里整行写一个图片 URL 就会渲染成插图。`npm run images` 会把这些外链图下载到
`src/story-img/`（压到宽度 ≤1600 的 webp）并生成 `src/storyImages.ts` 映射表，
渲染时优先用打包进产物的本地副本，抓不到的仍走外链。加 `--force` 可重新下载。

## 离线包（不走服务器，双击就能打开）

```bash
npm run build:offline    # 产物在 dist-offline/
```

把整个 `dist-offline/` 文件夹拷走，双击里面的 `index.html` 即可，无需任何服务器。

为什么要单独一个命令：浏览器不允许 `file://` 加载外部 ES module，所以线上那份
`dist/`（多文件 + module 脚本）双击打不开。离线版会把 JS / CSS / 正文插图全部内联进
一个 `index.html`，并把脚本降级成传统 script 挪到 `</body>` 前。

离线版与线上版的差别只有字体：线上走 Google Fonts（Lora / Noto Serif SC / Source Sans 3），
离线版去掉外链，按字体栈回落到系统字体。
