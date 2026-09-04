# 言葉 Kotoba｜日语学习网站

一个可直接部署到 GitHub Pages 的纯静态日语学习网站，不需要安装依赖或执行构建命令。

## 已完成功能

- 完整五十音学习：清音 46、浊音/半浊音 25、拗音 33
- 平假名、片假名与平片对照显示，支持罗马音和浏览进度记录
- 使用 VOICEVOX Nemo 女声1朗读单个假名
- 使用 KanjiVG 逐笔动画展示平假名与片假名笔顺
- 支持鼠标、触控笔和触屏的描红书写画布
- 随机练习：文字范围与练习范围自由组合
- 选择题、输入题、键盘答题、正确率与连胜统计
- 54 篇 N3、N4、N5 日语短文影子跟读，支持等级筛选
- 逐句点击播放、全文连续播放、语速调节、录音回放与假名开关
- 每篇文章配有重点词汇与语法总结
- 《大家的日语 第二版 初级1》第 1–25 课完整音频文稿与 87 轨教材原声
- 1652 个时间戳片段均可点击定位播放，并支持整课播放、假名开关、重点词汇、本课文型及录音回放
- N4—N1 课文跟读功能占位
- 手机、平板和桌面端响应式布局

## 本地打开

建议在本目录启动任意静态文件服务器后访问网站，以确保浏览器允许加载音频资源。

> 假名发音由 VOICEVOX Nemo 女声1（Style ID 10005）预先生成，影子跟读由 VOICEVOX Nemo 男声2（Style ID 10000）预先生成；N5 课文跟读使用《大家的日语 第二版 初级1》配套光盘原始录音。

## 音频、笔顺与署名

本项目的假名音频使用 [VOICEVOX Nemo](https://voicevox.hiroshiba.jp/nemo/) 女声1生成，影子跟读音频使用男声2生成。使用时须遵守其[利用规约](https://voicevox.hiroshiba.jp/nemo/term/)，并保留网站页脚中的“音声：VOICEVOX Nemo”署名。

如需重新生成音频，请先在 `http://127.0.0.1:50121` 启动 VOICEVOX Nemo Engine，再执行：

```bash
node scripts/generate-voicevox-audio.mjs
```

生成脚本使用面向假名学习的清晰度配置：语速 `0.80`、前置留白 `0.10` 秒、后置留白 `0.20` 秒，自动补足过短音素，保证 u 段的有声 `/u/` 母音不少于 `0.18` 秒，并对 `ヨ`、`ロ` 使用单独的辅音与母音清晰度配置。生成后可运行以下检查，确认音素配置以及 104 个 WAV 的格式和时长均符合要求：

```bash
node scripts/check-kana-profile.mjs
node scripts/check-kana-audio.mjs
```

影子跟读使用独立的自然男声配置：原生语速与音高、轻微增强语调，并压缩标点和句尾停顿。重新生成全部影子跟读音频：

```bash
VOICEVOX_STYLE_ID=10000 VOICEVOX_PROFILE=natural-male VOICEVOX_FORCE=true node scripts/generate-shadowing-audio.mjs
```

生成后可运行以下检查，确认 54 篇、488 个逐句音频、假名标注、重点词汇及语法总结均完整：

```bash
node scripts/check-shadowing-voice-profile.mjs
node scripts/check-shadowing.mjs
```

N5 课文页使用用户提供的《大家的日语 第二版 初级1》配套光盘：MP3 01–87 按第 1–25 课编排，MP3 00 单列为光盘说明。页面只展示可选择的网页文本，不嵌入 PDF 截图；单句播放通过原 MP3 的起止时间定位，不重复转码或切割音频。

如需从用户提供的光盘目录重新转写，可依次运行：

```bash
python -m pip install --target tmp/asr-packages -r requirements-transcription.txt
python scripts/transcribe-minna-audio.py --tracks 1-87
python scripts/transcribe-minna-audio.py --tracks 0 --language zh
node scripts/build-minna-reading-transcript.mjs
python scripts/generate-reading-furigana.py
node scripts/build-minna-reading-transcript.mjs
node scripts/check-reading.mjs
```

教材 PDF、音频及其转写可能受著作权保护。将这些资源部署到公开站点前，请确认拥有相应的复制与网络传播许可。

假名笔顺 SVG 来自 [KanjiVG](https://kanjivg.tagaini.net/) 固定版本 `61e39cfc29724132a6f8823b166296932985a0ff`，按 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) 使用。原始文件及许可文本保存在 `assets/strokes/kana/`，网站页脚保留 KanjiVG 署名。可运行以下命令确认全部学习假名都有对应笔顺资源：

```bash
node scripts/check-kana-strokes.mjs
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
- `reading.html` / `reading.css` / `reading.js`：N5 课文跟读专注页面
- `reading-data.mjs`：合并 25 课学习笔记与第二版原声转写的数据入口
- `reading-notes-data.mjs`：25 课标题、学习目标、重点词汇与本课文型
- `reading-transcript-data.mjs`：88 轨文稿、课程映射及逐句起止时间戳
- `shadowing.html` / `shadowing.css` / `shadowing.js`：专注影子跟读页面
- `shadowing-data.mjs`：文章目录与学习数据入口
- `shadowing-transcripts.mjs` / `shadowing-readings.mjs` / `shadowing-notes.mjs`：正文、假名标注、重点词汇与语法总结
- `assets/audio/kana/`：VOICEVOX Nemo 生成的假名音频
- `assets/audio/reading/n5/minna-v2/`：第二版配套光盘 MP3 00–87 原始录音
- `assets/audio/shadowing/`：VOICEVOX Nemo 生成的影子跟读音频
- `assets/strokes/kana/`：KanjiVG 假名笔顺 SVG 与独立许可说明
- `scripts/generate-voicevox-audio.mjs`：音频资源生成脚本
- `scripts/transcribe-minna-audio.py`：本地音频转写与单词级时间戳提取脚本
- `scripts/build-minna-reading-transcript.mjs`：音轨分课、分句、校对规则与页面数据生成脚本
- `scripts/generate-reading-furigana.py`：构建期汉字假名标注脚本
- `scripts/generate-shadowing-audio.mjs`：影子跟读音频生成脚本
- `scripts/import-kanjivg-kana.mjs`：从固定版本 KanjiVG 仓库导入所需假名 SVG
- `scripts/check-kana-strokes.mjs`：笔顺资源完整性检查脚本
- `scripts/check-reading.mjs`：N5 课文文本、标注、页面与音频完整性检查脚本
- `og.png`：社交分享封面
- `Reference/`：原始五十音随机练习参考项目
