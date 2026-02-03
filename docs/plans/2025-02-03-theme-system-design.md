# 主题切换系统设计

**日期**: 2025-02-03
**状态**: 设计完成，待实现

## 概述

为 Jay JSON 添加可切换的主题系统，支持三种模式：跟随系统、亮色模式、暗色模式。

## 功能需求

1. 用户可手动选择主题模式（跟随系统/亮色/暗色）
2. 主题选择持久化保存
3. 多窗口主题状态同步
4. 系统主题变化时自动跟随（仅限"跟随系统"模式）

## UI 设计

### 标题栏主题按钮

位置：标题栏右侧操作区，置顶按钮左侧

**未展开状态**：
```
┌──────────────────┐
│ 🌙 暗色      ▼  │
└──────────────────┘
```

**菜单展开状态**：
```
┌──────────────────┐
│ ○ 跟随系统   💻 │
│ ● 亮色模式   ☀️ │  ← ● 当前选中
│ ○ 暗色模式   🌙 │
└──────────────────┘
```

### 图标映射

| 模式 | 图标 |
|------|------|
| 跟随系统 | 💻 |
| 亮色模式 | ☀️ |
| 暗色模式 | 🌙 |

## 技术设计

### 数据存储

```javascript
// localStorage 键名: 'jay-theme'
// 值: 'system' | 'light' | 'dark'

localStorage.getItem('jay-theme')  // 读取
localStorage.setItem('jay-theme', value)  // 写入
```

### 主题应用逻辑

1. 应用启动读取存储的主题设置
2. `system` 模式：监听 `prefers-color-scheme` 媒体查询
3. `light`/`dark` 模式：强制应用对应主题
4. 切换时更新存储 + 应用主题 + 更新UI
5. 通过 `storage` 事件同步多窗口

### CSS 修改

```css
/* 原有方式 */
@media (prefers-color-scheme: dark) {
    :root { /* 暗色变量 */ }
}

/* 修改为 */
:root { /* 亮色变量 */ }
:root.dark { /* 暗色变量 */ }
```

## 代码结构

### HTML

在 `.title-bar-actions` 中添加：
```html
<div class="theme-selector">
    <button class="theme-btn" id="themeBtn">
        <span class="theme-icon">🌙</span>
        <span class="theme-name">暗色</span>
        <svg class="theme-arrow">▼</svg>
    </button>
    <div class="theme-menu" id="themeMenu">
        <div class="theme-option" data-value="system">
            <span class="theme-radio"></span>
            <span>💻 跟随系统</span>
        </div>
        <div class="theme-option" data-value="light">
            <span class="theme-radio"></span>
            <span>☀️ 亮色模式</span>
        </div>
        <div class="theme-option" data-value="dark">
            <span class="theme-radio"></span>
            <span>🌙 暗色模式</span>
        </div>
    </div>
</div>
```

### JavaScript

```javascript
const ThemeManager = {
    current: 'system',

    init() {
        // 读取存储、初始化UI、监听事件
    },

    setTheme(theme) {
        // 设置主题、更新存储、同步窗口
    },

    applyTheme(theme) {
        // 应用 .dark 类到 document.documentElement
    },

    updateUI() {
        // 更新按钮和菜单显示状态
    }
}
```

## 实现文件

| 文件 | 修改内容 |
|------|----------|
| `frontend/index.html` | 添加主题选择器 HTML |
| `frontend/public/style.css` | 添加主题选择器样式，修改暗色模式 |
| `frontend/src/main.js` | 添加 ThemeManager 模块 |
