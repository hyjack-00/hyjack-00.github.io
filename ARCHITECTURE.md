# 网站架构说明

## 📋 内容管理

### 核心数据文件：`/data/content.json`

**所有页面文字内容都在这个JSON文件中管理**，包括：

- ✅ **个人信息** (`profile`): 姓名、职位、邮箱、GitHub、Google Scholar
- ✅ **教育经历** (`education`): 学校、学位、时间段
- ✅ **荣誉奖项** (`honors`): 年份、奖项名称
- ✅ **统计数据** (`stats`): 论文数、城市数
- ✅ **新闻动态** (`news`): 日期、图标、文字
- ✅ **出版物** (`publications`): 标题、作者、会议、链接、年份
- ✅ **旅行地图** (`travel.cities`): 城市名、经纬度、是否故乡
- ✅ **摄影分类** (`photography`): 图标、标题、描述
- ✅ **页脚信息** (`footer`): 版权、更新时间

### 当前问题：❌ 数据未实际使用

**重要发现**：虽然 `content.json` 结构完整，但 **`index.html` 并未读取这个文件**！

当前状态：
- `index.html` 中所有内容都是硬编码在HTML中
- `js/content-renderer.js` 存在但未被加载
- `content.json` 数据无法自动更新到页面

### 如何修改内容（当前方式）

**目前需要直接修改两个地方：**

1. **`/data/content.json`** - 修改数据源（为未来准备）
2. **`/workspace/hyjack-00.github.io/index.html`** - 修改实际显示的HTML

#### 示例：添加新论文

**Step 1**: 编辑 `data/content.json` 第75-93行区域，添加新条目：
```json
{
  "year": 2026,
  "title": "Your New Paper Title",
  "authors": "Author1, **Yujie Huang**, Author2, Michael R. Lyu",
  "venue": "ICSE'27",
  "location": "City, Country",
  "date": "Apr 2027",
  "links": {
    "paper": "https://arxiv.org/abs/xxxx",
    "code": "https://github.com/user/repo"
  },
  "venueStyle": {
    "background": "#fef3c7",
    "color": "#d97706",
    "borderColor": "#fde68a"
  }
}
```

**Step 2**: 编辑 `index.html` 第78-97行区域，手动添加对应的HTML：
```html
<div class="pub-item">
    <div class="pub-main">
        <h3 class="pub-title">Your New Paper Title</h3>
        <p class="pub-authors">Author1, <strong>Yujie Huang</strong>, Author2, Michael R. Lyu</p>
        <p class="pub-venue">ICSE'27 - 49th International Conference on Software Engineering</p>
        <div class="pub-links">
            <a href="https://arxiv.org/abs/xxxx" class="pub-btn" target="_blank" rel="noopener noreferrer">
                <i class="fas fa-file-pdf"></i> Paper
            </a>
        </div>
    </div>
    <div class="pub-side">
        <div class="pub-conference"><i class="fas fa-calendar"></i> ICSE'27</div>
        <span class="pub-location"><i class="fas fa-map-marker-alt"></i> City, Country<br>Apr 2027</span>
    </div>
</div>
```

#### 示例：添加旅行城市

**Step 1**: 编辑 `data/content.json` 第141-169行，在 `travel.cities` 数组中添加：
```json
{ "name": "Paris", "lat": 48.8566, "lng": 2.3522, "country": "France", "city": "Paris" }
```

**Step 2**: 更新统计数字：
- `content.json` 第49行：`"cities": 27` (从26改为27)
- `index.html` 第50行：`<span class="stat-number">27</span>` (从26改为27)

地图会自动读取 `content.json`，无需修改 `index.html`。

---

## 🎨 背景图片管理

### 位置：`/images/backgrounds/`

### 命名规范：
```
0-作品名__艺术家名__来源.jpg    ← 当前使用的背景
1-作品名__艺术家名__来源.jpg    ← 备选背景（不使用）
2-作品名__艺术家名__来源.jpg    ← 更多备选
```

**排序逻辑**：
- 按文件名字母/数字排序
- `0-` 开头会排在最前，被CSS自动选择
- `1-`, `2-` 等作为备选，方便切换

**当前使用**：
- `0-井小姐和猫和插排__Rotarran__pixiv.net-users-51648995.jpg` (214KB)

**切换背景图片**：
1. 将想用的图片改名为 `0-xxx.jpg`
2. 将旧的 `0-xxx.jpg` 改名为 `1-xxx.jpg`
3. CSS 会自动使用新的 `0-` 开头的图片

### 在CSS中引用：
```css
/* /css/main.css 第37行 */
background-image: url('/images/backgrounds/0-井小姐和猫和插排__Rotarran__pixiv.net-users-51648995.jpg');
```

**注意**：如果改变文件名，需要同步更新CSS中的URL。

---

## 📁 文件结构

```
/workspace/hyjack-00.github.io/
├── index.html                    # 主页HTML（硬编码内容）
├── 404.html                      # 404错误页
├── .nojekyll                     # 禁用Jekyll处理
│
├── css/
│   └── main.css                  # 唯一样式文件（~600行）
│
├── js/
│   ├── travel-map.js             # 地图初始化（读取content.json）
│   └── content-renderer.js       # ⚠️ 未使用的内容渲染器
│
├── data/
│   └── content.json              # ⚠️ 数据源（未连接到HTML）
│
├── images/
│   └── backgrounds/
│       ├── 0-井小姐...jpg         # 当前背景 (214KB)
│       └── 1-APPLE...jpg         # 备选背景 (564KB)
│
└── assets/
    └── avatar.jpg                # 头像照片
```

---

## 🔧 技术栈

- **纯静态HTML/CSS/JS** - 无构建工具
- **MapLibre GL JS** - 交互式地图
- **Font Awesome 5** - 图标库
- **Lato 字体** - Google Fonts
- **GitHub Pages** - 托管平台

---

## 📊 信息扩展性评估

### ⚠️ 当前问题

**低扩展性 - 需要双重维护**：

1. ❌ **数据与展示分离失败**
   - `content.json` 有完整数据结构
   - 但 `index.html` 不读取它
   - 每次修改需要改两处

2. ❌ **硬编码内容**
   - 论文列表、新闻、奖项都写死在HTML中
   - 添加新条目需要手写HTML标签

3. ❌ **维护负担重**
   - 更新一篇论文：改JSON + 改HTML
   - 容易出现不一致
   - 格式错误难以发现

### ✅ 正确工作的部分

1. ✅ **地图数据驱动**
   - `js/travel-map.js` 正确读取 `content.json`
   - 修改 `travel.cities` 即可更新地图
   - 无需改HTML

### 🎯 建议改进方案

**方案A：启用 content-renderer.js（推荐）**

优点：
- `content-renderer.js` 已存在，只需激活
- 实现数据驱动页面
- 修改 `content.json` 即可更新全部内容

步骤：
1. 在 `index.html` 中加载 `content-renderer.js`
2. 将硬编码的publications/news/honors删除，改为占位容器
3. JS自动从 `content.json` 生成HTML

**方案B：保持当前方式，文档化流程**

如果不想改动代码：
- 接受双重维护
- 提供清晰的修改指南（本文档）
- 每次修改checklist确保同步

---

## 🚀 快速修改指南

### 添加论文
1. 编辑 `data/content.json` → `publications` 数组
2. 编辑 `index.html` → 在对应年份下添加 `<div class="pub-item">`
3. 更新 `stats.papers` 数字

### 添加新闻
1. 编辑 `data/content.json` → `news` 数组
2. 编辑 `index.html` → 在 `<ul class="news-list">` 中添加 `<li>`

### 添加城市
1. 编辑 `data/content.json` → `travel.cities` 数组
2. 更新 `stats.cities` 数字
3. ✅ 地图自动更新，无需改HTML

### 更新个人信息
1. 编辑 `data/content.json` → `profile` 部分
2. 编辑 `index.html` → 侧边栏对应部分

---

## 📈 下一步建议

1. **激活数据驱动** - 让 `content-renderer.js` 工作
2. **统一数据源** - 所有内容从 `content.json` 读取
3. **简化维护** - 只需修改JSON即可更新整个网站
