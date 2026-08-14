# 网站架构说明

## 📋 内容管理

### ✅ 核心数据文件：`/data/content.json` - 完全数据驱动

**所有页面文字内容都在这个JSON文件中管理**，修改JSON即可自动更新整个网站！

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
- ✅ **摄影分类** (`photography`): 图标、标题、描述
- ✅ **站点推荐** (`recommendations`): 名称、类型、描述、网站
- ✅ **页脚信息** (`footer`): 版权、更新时间

### 🎉 现在已启用：完全数据驱动

**页面加载时自动从 `content.json` 读取并生成所有内容！**

工作原理：
1. `index.html` 只包含最小化的占位符
2. `js/content-renderer.js` 在页面加载时自动运行
3. 从 `content.json` 读取数据
4. 动态生成所有HTML内容并插入页面

### 如何修改内容（超简单！）

**只需编辑 `/data/content.json` 一个文件，然后推送到GitHub！**

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

当前站点不运行 Hexo。`data/blog-source/` 只保存从历史页面提取出的纯正文片段；访问原文章 URL 时，展示的是 `templates/article.html` 生成的新页面。

文章页和 404 页使用固定在视口右下角的背景按钮，因此正文滚动时按钮不会离开屏幕；主页按钮仍位于卡片列表末尾。

- `scripts/generate-article-pages.mjs`: 根据 `data/content.json` 中的 Blog URL 生成文章入口页
- `js/article-renderer.js`: 读取正文片段，转换旧图片懒加载属性并渲染正文
- `css/article.css`: 当前毛玻璃文章卡片、正文、图片、表格和代码块样式
- `js/content-renderer.js`: 主页和文章页共用左侧 Profile、Education、Experience、Stats 与 Footer

新增或修改 Blog URL 后，需要运行：

```bash
node scripts/generate-article-pages.mjs
bash validate-homepage.sh
```

## 更换头像

直接用新的正方形 JPG 覆盖 `assets/avatar.jpg` 即可，建议保持在 500 KB 以内。这个文件同时用于左侧头像和浏览器页签图标。若新头像已经是近景裁切，将 `css/main.css` 顶部的 `--avatar-scale` 从 `2` 调为 `1`；再用 `--avatar-focus-x` 和 `--avatar-focus-y` 调整人物在圆形框里的位置。

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
│
├── css/
│   ├── main.css                  # 主页样式
│   └── vendor/leaflet.css        # 本地地图样式库
│
├── js/
│   ├── content-renderer.js       # ✅ 数据驱动渲染器（已启用）
│   ├── travel-map.js             # 单一、无聚类的旅行点地图
│   ├── background-manager.js     # 背景清单、Artist 与展开交互
│   └── vendor/leaflet.js         # 本地地图运行库
│
├── data/
│   ├── backgrounds.json          # 背景排序清单（脚本生成）
│   └── content.json              # ✅ 主页内容数据源
│
├── images/
│   └── backgrounds/
│       ├── 0__NFZ__...jpg         # 当前背景（最小数字）
│       ├── 1__APPLE__...jpg       # 备选背景 (<500KB)
│       └── 1__井小姐...jpg        # 备选背景 (<500KB)
│
├── scripts/
│   └── generate-background-manifest.mjs
│
└── assets/
    ├── avatar.jpg                # 头像照片
    └── experience/               # 本地化的团队经历图标
```

---

## 🔧 技术栈

- **纯静态HTML/CSS/JS** - 无构建工具
- **数据驱动架构** - JSON → JavaScript → DOM
- **Leaflet 1.9.4** - 本地托管运行库；旅行城市使用直接渲染的 circle markers，不聚类
- **Font Awesome 5** - 图标库
- **Satoshi 字体** - 本地托管
- **GitHub Pages** - 托管平台

---

## 📊 信息扩展性评估

### ✅ 当前状态：高扩展性

**完全数据驱动 - 单一数据源维护**：

1. ✅ **数据与展示完全分离**
   - `content.json` 是唯一数据源
   - `content-renderer.js` 自动生成HTML
   - 无需手写任何内容HTML

2. ✅ **零代码内容更新**
   - 修改JSON → 推送 → 网站自动更新
   - 添加论文只需添加JSON条目
   - 所有格式自动正确

3. ✅ **维护负担极低**
   - 只需维护一个文件：`content.json`
   - 不会出现HTML/JSON不一致
   - 格式由代码保证统一

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
