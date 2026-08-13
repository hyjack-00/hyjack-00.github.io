# 学术主页重新设计 - 需求文档

## 用户核心要求

### 1. 设计参考
- **参考网站**: https://zhihan-jiang.com/
- **目标**: 完全按照zhihan的风格和布局
- **原则**: 精美、信息密度高、专业学术风格

### 2. 布局要求
- [x] **左右布局**: 左侧固定侧边栏 + 右侧滚动内容区
- [ ] **侧边栏内容**: 
  - 头像
  - 姓名（中英文）
  - 职位信息
  - 联系方式图标
- [ ] **右侧主要内容**:
  - About部分
  - Education
  - Honors & Awards  
  - Publications（核心，最详细）
  - News
  - 保留：Travel Map（地图）
  - 保留：Photography（照片栏）

### 3. Publications展示（最重要）
必须完全参考zhihan的格式：
- [ ] 按年份分组（2026, 2025等）
- [ ] 每篇论文包含：
  - 论文标题（加粗，可点击）
  - 作者列表（我的名字加粗）
  - 会议/期刊信息（斜体）
  - Abstract（可折叠）
  - 链接按钮组：Paper, arXiv, Code/Project, Slides, DOI, BibTex
  - 会议Badge（右侧显示，如ICSE'25）
  - 会议时间和地点
- [ ] 按钮样式：带图标，灰色边框，hover效果

### 4. 真实论文信息
根据搜索结果，我的论文包括：
1. **PreServe** - Hierarchical Prediction-based Management for LMaaS Systems
   - 作者：Yujie Huang, Jiazhen Gu, Zhihan Jiang, Michael R. Lyu
   - 会议：ICSE 2025
   - arXiv: https://arxiv.org/abs/2504.03702
   - GitHub: https://github.com/OpsPAI/PreServe

2. **LLMPrism** - Black-box Performance Diagnosis for Production LLM Training
   - arXiv: https://arxiv.org/abs/2505.00342

3. **Cloud-OpsBench** - Benchmark for Root Cause Analysis
   - 作者包含：Yujie Huang
   - arXiv: https://arxiv.org/abs/2603.00468

4. **User-Reported Failures Study**
   - arXiv: https://arxiv.org/abs/2601.13655

### 5. 必须保留的功能
- [ ] Travel Map（旅行地图）- 使用Leaflet.js
  - 需要包含：纽约、夏洛特、芝加哥（2024新增）
  - 之前的所有城市
- [ ] Photography部分（照片栏）
  - 分类卡片展示

### 6. 视觉效果
- [ ] **毛玻璃效果**: backdrop-filter blur
- [ ] **背景图片**: 需要可自定义背景
- [ ] **字体**: Lato（跟zhihan一样）
- [ ] **配色**: 蓝色系，专业学术风格

### 7. 代码要求
- [ ] **精简**: 控制在1000行以内
- [ ] **模块化**: HTML + CSS分离
- [ ] **响应式**: 支持桌面和移动设备

## 当前问题清单

### 已发现的错误
1. ❌ 删除了Travel Map
2. ❌ 删除了Photography部分
3. ❌ 背景图片没了
4. ❌ 作者信息不完整/不正确
5. ❌ Publications格式不够精美（缺少图标按钮、Badge等）
6. ❌ 缺少News部分
7. ❌ 没有About的详细描述

### 需要修复
- [ ] 恢复Travel Map（完整的Leaflet.js实现）
- [ ] 恢复Photography部分
- [ ] 添加背景图片支持
- [ ] 修正所有论文的作者信息
- [ ] 完善Publications展示（参考zhihan）
- [ ] 添加News部分
- [ ] 完善About内容

## 检查流程

每次修改必须通过以下检查：

### Check 1: 完整度检查
- [ ] 所有必需section都存在
- [ ] Travel Map正常工作
- [ ] Photography部分完整
- [ ] 所有链接可用

### Check 2: Zhihan布局对比
- [ ] 侧边栏布局一致
- [ ] Publications格式完全匹配
- [ ] 按钮样式相同
- [ ] Badge显示正确

### Check 3: 内容正确性检查  
- [ ] 论文作者信息准确
- [ ] 会议信息正确
- [ ] 所有链接有效
- [ ] 个人信息准确

### Check 4: 代码质量检查
- [ ] 代码行数 < 1000
- [ ] 没有冗余代码
- [ ] CSS模块化
- [ ] 注释清晰

## 下一步行动

1. 读取旧版本的Travel Map代码
2. 读取旧版本的Photography代码
3. 查找正确的论文作者信息
4. 完整实现zhihan风格的Publications
5. 添加背景图片
6. 逐项通过所有检查

---

**创建时间**: 2024-08-12
**状态**: 需要重新实现
**优先级**: 高
