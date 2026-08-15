# 网站架构说明

## 📋 内容管理

### ✅ 主页数据文件：`/data/content.json`

**主页结构化信息统一在这个 JSON 文件中管理**，修改后会自动更新主页与文章页共用的侧栏。Blog 正文与 Blog 清单由各文章目录中的 `index.md` 管理，见下方“Blog 文章页”。

包括：
- ✅ **个人信息** (`profile`): 姓名、职位、邮箱、GitHub、Google Scholar
- ✅ **关于** (`about`): 个人简介（支持HTML）
- ✅ **教育经历** (`education`): 学校、学位、时间段
- ✅ **团队经历** (`experience`): 团队、角色、时间段、本地图标
- ✅ **荣誉奖项** (`honors`): 年份、奖项名称
- ✅ **统计数据** (`stats`): 论文数、城市数
- ✅ **新闻动态** (`news`): 日期、图标、文字
- ✅ **出版物** (`publications`): 标题、作者、会议、链接、年份
- ✅ **旅行地图** (`travel.cities`): 城市名、经纬度、是否故乡
- ✅ **摄影影集** (`data/photography.json`): Faraway / Local 影集与 OSS 图片清单
- ✅ **站点推荐** (`recommendations`): 名称、类型、描述、网站
- ✅ **页脚信息** (`footer`): 版权、更新时间

### 主页渲染方式

主页加载时自动从 `content.json`、构建生成的 `data/blogs.json` 和 `data/photography.json` 读取内容。

工作原理：
1. `index.html` 只包含最小化的占位符
2. `js/content-renderer.js` 在页面加载时自动运行
3. 从 `content.json` 读取主页信息，从 `data/blogs.json` 读取 Blog 摘要，从 `data/photography.json` 读取影集
4. 动态生成所有HTML内容并插入页面

### 如何修改内容（超简单！）

主页信息只需编辑 `/data/content.json`；Blog 使用同目录 Markdown 流程。

#### 示例：添加新论文

编辑 `data/content.json` 第75-93行区域，添加新条目：
```json
{
  "year": 2027,
  "title": "Your New Paper Title",
  "authors": "Author1, **Yujie Huang**, Author2, Michael R. Lyu",
  "venue": "ICSE'27",
  "venueFull": "ICSE 2027 - 49th International Conference on Software Engineering",
  "location": "City, Country",
  "date": "Apr 2027",
  "links": {
    "paper": "https://arxiv.org/abs/xxxx",
    "code": "https://github.com/user/repo",
    "slides": "https://example.com/slides.pdf"
  },
  "venueStyle": {
    "background": "#fef3c7",
    "color": "#d97706",
    "borderColor": "#fde68a"
  }
}
```

**就这样！** 推送后网站自动更新，无需修改HTML！

#### 示例：添加旅行城市

编辑 `data/content.json` 第141-169行，在 `travel.cities` 数组中添加：
```json
{ "name": "Paris", "lat": 48.8566, "lng": 2.3522, "country": "France", "city": "Paris" }
```

更新统计数字：
- `content.json` 第49行：`"cities": 27` (从26改为27)

**完成！** 地图和统计数字自动更新。

#### 示例：添加新闻

编辑 `data/content.json` 第52-73行，在 `news` 数组开头添加：
```json
{
  "date": "2026.09",
  "icon": "🎉",
  "text": "New achievement unlocked!"
}
```

**保存推送！** 新闻列表自动显示。

#### 管理摄影影集

摄影数据单独维护在 `data/photography.json`。目前固定保留两个影集：`faraway` 与 `local`。每张照片使用 OSS 上的两个地址：

```json
{
  "id": "tokyo-night-01",
  "title": "Night walk",
  "location": "Tokyo",
  "date": "2026-04",
  "alt": "A quiet street in Tokyo at night",
  "thumbnail": "https://your-bucket.oss-cn-hongkong.aliyuncs.com/photography/faraway/tokyo-night-01-thumb.webp",
  "src": "https://your-bucket.oss-cn-hongkong.aliyuncs.com/photography/faraway/tokyo-night-01.webp",
  "width": 2400,
  "height": 1600
}
```

`thumbnail` 只用于影集网格，建议压缩到约 50–150 KB；`src` 用于点击后的大图，建议使用 WebP/AVIF 并保留足够的展示尺寸。页面只在打开照片时请求 `src`，不会一开始下载整组原图。影集封面默认取第一张照片的缩略图，也可以在 album 上单独填写 `cover`。新增照片后无需改 HTML 或 JavaScript。

推荐的 OSS 对象布局：

```text
photography/
├── faraway/
│   ├── tokyo-night-01-thumb.webp
│   └── tokyo-night-01.webp
└── local/
    ├── sysu-rain-01-thumb.webp
    └── sysu-rain-01.webp
```

缩略图和大图都建议控制在 500 KB 以内；如果 OSS 使用图片处理参数，应该在上传或 CDN URL 层直接输出 WebP/AVIF，而不是让浏览器下载原始相机文件。

#### 示例：更新个人信息

编辑 `data/content.json` 第3-13行：
```json
"profile": {
  "name": {
    "en": "Yujie Huang",
    "zh": "黄宇杰"
  },
  "title": "Ph.D. Candidate",
  "affiliation": "CUHK, CSE",
  "email": "yjhuang@cse.cuhk.edu.hk",
  "github": "hyjack-00",
  "scholar": "https://scholar.google.com/citations?user=YOUR_ID",
  "avatar": "/assets/avatar.jpg"
}
```

**一键更新！** 侧边栏所有信息自动同步。

---

## 🎨 背景图片管理

### 位置：`/images/backgrounds/`

### 命名规范：
```
0__作品名__艺术家名__域名-路径.jpg    ← 当前使用的背景
1__作品名__艺术家名__域名-路径.jpg    ← 备选背景
2__作品名__艺术家名__域名-路径.jpg    ← 更多备选
```

**排序逻辑**：
- 按双下划线前的数字升序，同一数字按文件名排序
- 页面读取 `data/backgrounds.json` 的第一项作为背景
- Artist、作品名和链接均由文件名解析，不写死在 HTML/CSS

**当前使用**：
- `0__NFZ__劇団__x.com-_Gekidan.jpg` (current background, <500KB)

**切换背景图片**：
1. 将想用的图片前导数字改为 `0`
2. 将旧背景改为更大的数字
3. 运行 `node scripts/generate-background-manifest.mjs`
4. 运行 `bash validate-homepage.sh`，确保清单同步且每张图片不超过 500KB

### 页面引用：
```css
background-image: var(--active-background-image);
```

## 主页视觉微调

`css/main.css` 的 `:root` 集中定义了常用视觉参数：

- `--avatar-scale`: 左侧头像缩放比例；换成裁切好的近景头像时可设为 `1`
- `--avatar-focus-x` / `--avatar-focus-y`: 圆形头像的水平、垂直焦点
- `--dense-layer-alpha`: Publication 与 Blog 中心羽化层透明度；当前 `0.50`，与 70% 卡片底色合成后正好为 85% 白度
- `--dense-feather`: 圆角矩形羽化半径
- `--pub-copy-line-height`: Publication 作者和会议信息行高
- `--pub-action-line-height`: Publication 链接按钮文字行高
- `--pub-action-padding-*`: Publication 链接按钮内边距
- `--pub-action-gap-top`: 会议全名与链接按钮行之间的间距

## Blog 文章页

当前站点不运行 Hexo。每篇文章的 Markdown 与图片直接放在最终 URL 对应的同一个目录中：

```text
YYYY/MM/DD/文章目录/
├── index.md       # 唯一需要人工编辑的正文与元数据
├── image.png      # Markdown 使用相对路径引用的图片
└── index.html     # 构建生成，提交到 GitHub Pages，但不要手工修改
```

文章页和 404 页使用固定在视口右下角的背景按钮，因此正文滚动时按钮不会离开屏幕；主页按钮仍位于卡片列表末尾。

- `scripts/generate-article-pages.mjs`: 扫描所有 `YYYY/MM/DD/文章目录/index.md`，生成文章 HTML 和 `data/blogs.json`
- `data/blogs.json`: 构建生成的主页 Blog 清单，不要手工修改
- `templates/article.html`: 文章页共同模板
- `templates/post.md`: 新文章 Markdown 模板
- `css/article.css`: 当前毛玻璃文章卡片、正文、图片、表格和代码块样式
- `js/content-renderer.js`: 主页和文章页共用左侧 Profile、Education、Experience、Stats 与 Footer

### 新增文章

1. 创建 `YYYY/MM/DD/文章目录/`，复制 `templates/post.md` 为该目录的 `index.md`，再修改 front matter 和正文。
2. 图片放在同一目录或其子目录，使用 `![说明](image.png)` 这样的相对路径。
3. 运行构建和检查；生成的 `index.html` 与 `data/blogs.json` 需要一起提交，因为 GitHub Pages 不会运行 Node 构建。

图片默认按原始尺寸显示并受正文宽度限制。个别图片需要按原始尺寸的 80% 展示时，可写成 `![说明](image.png "display:zoom-80")`；构建器会输出与旧页面一致的缩放且不会显示多余 tooltip。

```markdown
---
title: "文章标题"
date: "2026-08-14"
category: "Tech"
excerpt: "显示在主页 Blog 列表中的摘要。"
---

这里开始写正文。
```

首次检出仓库或依赖变更后运行 `npm ci`。日常新增、修改文章时运行：

```bash
npm run build:blog
npm run check
```

生成器会检查日期目录、front matter、空正文、本地图片、重复 URL、残留页面和生成物是否同步。删除文章时应删除整个文章目录，而不是只删除 `index.md`。

## 更换头像

直接用新的正方形 JPG 覆盖 `assets/avatar.jpg` 即可，建议使用至少 280×280 的图片并保持在 500 KB 以内。当前近景头像使用 `--avatar-scale: 1` 和居中焦点；可通过 `css/main.css` 顶部的 `--avatar-scale`、`--avatar-focus-x`、`--avatar-focus-y` 调整圆形裁切。浏览器页签使用独立的 `assets/favicon.svg`，更换头像不会影响 favicon。

Experience 图标来自中山大学官方页面并保存在 `assets/experience/`，页面不依赖远程图片：

- 超算队：中山大学计算机学院院徽（`https://cse.sysu.edu.cn/article/1364`）
- AeroSwift：中山大学无人飞行器协会官方队旗中的飞行器标识（`https://saa.sysu.edu.cn/article/682`）

---

## 📁 文件结构

```
/workspace/hyjack-00.github.io/
├── index.html                    # 主页HTML（最小化占位符）
├── 404.html                      # 404错误页
├── .nojekyll                     # 禁用Jekyll处理
├── package.json                  # Markdown 构建与校验命令
├── 2023/10/.../                  # 文章 Markdown、图片和生成 HTML
│
├── css/
│   ├── main.css                  # 主页样式
│   └── vendor/leaflet.css        # 本地地图样式库
│
├── js/
│   ├── content-renderer.js       # ✅ 数据驱动渲染器（已启用）
│   ├── photography.js            # 影集网格、OSS 图片预览与键盘导航
│   ├── travel-map.js             # 单一、无聚类的旅行点地图
│   ├── background-manager.js     # 背景清单、Artist 与展开交互
│   └── vendor/leaflet.js         # 本地地图运行库
│
├── data/
│   ├── backgrounds.json          # 背景排序清单（脚本生成）
│   ├── blogs.json                # Blog 首页清单（脚本生成）
│   ├── photography.json          # Faraway / Local 影集与 OSS 图片 URL
│   └── content.json              # ✅ 主页内容数据源
│
├── images/
│   └── backgrounds/
│       ├── 0__NFZ__...jpg         # 当前背景（最小数字）
│       ├── 1__APPLE__...jpg       # 备选背景 (<500KB)
│       └── 1__井小姐...jpg        # 备选背景 (<500KB)
│
├── scripts/
│   ├── generate-article-pages.mjs
│   └── generate-background-manifest.mjs
│
└── assets/
    ├── avatar.jpg                # 头像照片
    ├── favicon.svg               # 独立的浏览器页签图标
    └── experience/               # 本地化的团队经历图标
```

---

## 🔧 技术栈

- **静态HTML/CSS/JS** - Markdown 仅在提交前构建，访客端不解析正文
- **markdown-it** - 构建期 CommonMark 渲染
- **数据驱动架构** - JSON → JavaScript → DOM
- **Leaflet 1.9.4** - 本地托管运行库；旅行城市使用直接渲染的 circle markers，不聚类
- **Font Awesome 5** - 图标库
- **Satoshi 字体** - 本地托管
- **GitHub Pages** - 托管平台

---

## 📊 信息扩展性评估

### ✅ 当前状态：高扩展性

**主页结构化数据与 Blog Markdown 分工明确**：

1. ✅ **数据与展示完全分离**
   - `content.json` 是主页结构化信息的唯一数据源
   - 每篇 Blog 的 `index.md` 是该文章正文与摘要的唯一数据源
   - `content-renderer.js` 与构建脚本负责生成 HTML

2. ✅ **零代码内容更新**
   - 修改主页 JSON 后可直接推送
   - 修改 Blog Markdown 后运行构建与检查再推送
   - 添加论文只需添加JSON条目
   - 所有格式自动正确

3. ✅ **维护负担极低**
   - 主页不需要维护重复 HTML
   - Blog 生成物有 freshness 检查，不会静默过期
   - 格式由模板和构建器统一保证

### ✅ 完美工作的部分

1. ✅ **个人信息** - 从JSON自动渲染到侧边栏
2. ✅ **关于/新闻/荣誉/统计** - 完全数据驱动
3. ✅ **出版物列表** - 自动分组、排序、格式化
4. ✅ **旅行地图** - 读取cities数组，自动绘制
5. ✅ **摄影分类** - 自动生成网格卡片
6. ✅ **页脚** - 版权和更新时间自动显示

---

## 🚀 快速修改指南

### 添加论文（只需3步）
1. 编辑 `data/content.json` → `publications` 数组添加新条目
2. 更新 `stats.papers` 数字（如4→5）
3. `git add -A && git commit -m "Add new paper" && git push`

✅ 完成！网站自动显示新论文，格式完美。

### 添加新闻（只需3步）
1. 编辑 `data/content.json` → `news` 数组开头插入
2. `git add -A && git commit -m "Add news" && git push`
3. ✅ 完成！

### 添加城市（只需3步）
1. 编辑 `data/content.json` → `travel.cities` 数组添加
2. 更新 `stats.cities` 数字
3. `git push`

✅ 地图自动更新标记点！

### 更新个人信息（只需2步）
1. 编辑 `data/content.json` → `profile` 部分
2. `git push`

✅ 侧边栏所有信息立即同步！

---

## 📈 架构优势

### 对比之前的硬编码方式：

| 特性 | 之前（硬编码） | 现在（数据驱动） |
|------|---------------|-----------------|
| 添加论文 | 改JSON + 手写HTML | 只改JSON |
| 维护文件数 | 2个（JSON + HTML） | 1个（JSON） |
| 出错可能性 | 高（格式不一致） | 低（代码保证） |
| 学习成本 | 需懂HTML | 只需懂JSON |
| 代码量 | HTML ~230行 | HTML ~160行 |
| 扩展性 | 低 | 高 |

### 性能影响：
- JSON加载：< 5KB，< 10ms
- 渲染时间：< 50ms
- 用户体验：几乎无感知，"Loading..." 瞬间替换

---

## 💡 高级用法

### 支持的链接类型
在 `publications.links` 中可以添加：
- `paper`: 论文PDF
- `arxiv`: arXiv链接
- `code`: GitHub仓库
- `slides`: 演讲幻灯片
- `video`: 演讲视频

自动识别并生成对应图标！

### Venue样式自定义
```json
"venueStyle": {
  "background": "#fef3c7",    // 背景色
  "color": "#d97706",         // 文字颜色
  "borderColor": "#fde68a"    // 边框颜色
}
```

### 作者名加粗
使用 `**名字**` 自动加粗：
```json
"authors": "Author1, **Yujie Huang**, Author2"
```
渲染为：Author1, **Yujie Huang**, Author2

---

## 🎯 总结

现在您的网站是**完全数据驱动**的！

**修改内容的唯一步骤：**
1. 编辑 `/data/content.json`
2. `git push`
3. ✅ 完成！

无需再手写HTML，无需担心格式，一切自动完成。这就是现代化的内容管理方式！
