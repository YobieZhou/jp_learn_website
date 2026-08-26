# 言葉 Kotoba｜日语学习网站

一个可直接部署到 GitHub Pages 的纯静态日语学习网站，不需要安装依赖或执行构建命令。

## 已完成功能

- 完整五十音学习：清音 46、浊音/半浊音 25、拗音 33
- 平假名与片假名切换、罗马音、浏览进度记录
- 使用 VOICEVOX Nemo 女声1朗读单个假名
- 支持鼠标、触控笔和触屏的描红书写画布
- 随机练习：文字范围与练习范围自由组合
- 选择题、输入题、键盘答题、正确率与连胜统计
- N5—N1 课文跟读及文章影子跟读的内容占位
- 手机、平板和桌面端响应式布局

## 本地打开

建议在本目录启动任意静态文件服务器后访问网站，以确保浏览器允许加载音频资源。

> 假名发音由 VOICEVOX Nemo 女声1（Style ID 10005）预先生成，因此不同设备上的声音保持一致。

## 音频与署名

本项目的假名音频使用 [VOICEVOX Nemo](https://voicevox.hiroshiba.jp/nemo/) 女声1生成，使用时须遵守其[利用规约](https://voicevox.hiroshiba.jp/nemo/term/)，并保留网站页脚中的“音声：VOICEVOX Nemo”署名。

如需重新生成音频，请先在 `http://127.0.0.1:50121` 启动 VOICEVOX Nemo Engine，再执行：

```bash
node scripts/generate-voicevox-audio.mjs
```

生成脚本使用面向假名学习的清晰度配置：语速 `0.80`、前置留白 `0.10` 秒、后置留白 `0.20` 秒，自动补足过短音素，保证 u 段的有声 `/u/` 母音不少于 `0.18` 秒，并对 `ヨ`、`ロ` 使用单独的辅音与母音清晰度配置。生成后可运行以下检查，确认音素配置以及 104 个 WAV 的格式和时长均符合要求：

```bash
node scripts/check-kana-profile.mjs
node scripts/check-kana-audio.mjs
```

## 部署到 GitHub Pages

1. 将修改推送到 GitHub 仓库的 `main` 分支。
2. `.github/workflows/deploy-pages.yml` 会收集页面与 `assets/` 音频资源。
3. GitHub Actions 完成后，GitHub Pages 会自动更新。

网站没有前端构建依赖；GitHub Actions 仅负责打包并发布静态文件。部署地址确定后，可以把 `index.html` 中的 `og:image` 更新为 `og.png` 的完整线上地址。

## 文件说明

- `index.html`：页面结构与全部文案
- `styles.css`：视觉样式与响应式布局
- `script.js`：假名数据、音频播放、书写与随机练习逻辑
- `assets/audio/kana/`：VOICEVOX Nemo 生成的假名音频
- `scripts/generate-voicevox-audio.mjs`：音频资源生成脚本
- `og.png`：社交分享封面
- `Reference/`：原始五十音随机练习参考项目
