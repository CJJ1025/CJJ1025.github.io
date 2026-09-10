# CJJ的小站

个人博客：<https://cjj25.space>

基于 **Hexo + Butterfly** 主题构建，源码托管在 GitHub，由 **Vercel** 自动构建部署。

## 技术栈

| 项目 | 说明 |
| --- | --- |
| 静态站点框架 | [Hexo](https://hexo.io/) 8.x |
| 主题 | [Butterfly](https://github.com/jerryc127/hexo-theme-butterfly) 5.7（通过 npm 安装） |
| 版本控制 | Git + GitHub（SSH 方式推送） |
| 部署 | Vercel（push 后自动 `npm install` + `hexo generate`） |
| 域名 | cjj25.space |

## 部署原理

本仓库保存的是 **Hexo 源码**，不是构建产物。推送代码后：

1. Vercel 读取根目录的 `vercel.json`
2. 执行 `npm install` 安装依赖（含 butterfly 主题）
3. 执行 `hexo generate` 生成静态文件到 `public/`
4. 将 `public/` 部署到线上

因此日常写文章**只需 push 一次**，无需本地构建或手动部署。

## 目录结构

```
.
├── _config.yml              # Hexo 站点配置
├── _config.butterfly.yml    # Butterfly 主题自定义配置（覆盖主题默认值）
├── vercel.json              # Vercel 构建配置
├── package.json             # 依赖清单
├── scaffolds/               # 文章模板
├── source/
│   └── _posts/              # Markdown 文章放这里
└── themes/                  # 留空（主题通过 npm 管理，不提交源码）
```

> `node_modules/` 和 `public/` 已在 `.gitignore` 中忽略，二者均可自动重新生成。

## 本地开发

```bash
# 首次需要先安装依赖
npm install

# 本地预览（http://localhost:4000，修改自动刷新）
npx hexo server

# 手动构建（产物在 public/）
npx hexo generate

# 清理缓存与产物
npx hexo clean
```

## 写一篇新文章

1. 在 `source/_posts/` 下新建 Markdown 文件（如 `my-post.md`），文件头部的 front-matter 示例：

```markdown
---
title: 文章标题
date: 2026-09-10 12:00:00
tags:
  - 标签
categories:
  - 分类
---

正文内容……
```

2. 提交并推送：

```bash
git add -A
git commit -m "新增文章：文章标题"
git push
```

3. 等待 1–3 分钟，Vercel 自动部署完成后即可在线上看到。

> 注意：博客至少需要保留一篇文章，否则 Hexo 不会生成首页（站点会 404）。

## 主题自定义

- 主题完整默认配置见 `node_modules/hexo-theme-butterfly/_config.yml`
- 把要修改的配置项写进根目录的 `_config.butterfly.yml` 即可覆盖，无需改动主题源码
- 配置文档：<https://butterfly.js.org/>
- 第三方库默认使用七牛 staticfile CDN（`_config.butterfly.yml` 中的 `CDN` 段），以提升国内访问速度

## 升级主题

```bash
npm update hexo-theme-butterfly
git add package.json package-lock.json
git commit -m "升级 butterfly 主题"
git push
```
