# Crowlook Admin

Crowlook 项目的 Web 运营后台，用于统一管理用户端作品、分类、页面编排和评论审核。

## 项目简介

本仓库是与 `crowlook-backend` 配套的 Vue 3 管理端，基于 RuoYi-Vue3 3.9.1 整理。新增内容运营首页、作品发布、分类树、页面 JSON 编排、用户端快照导入和评论审核功能。已发布内容由后端统一提供给 `crowlook-app` 的 H5 与微信小程序；账号权限、动态路由、系统配置和运行监控仍由 RuoYi 基础模块管理。

## 技术栈

- Vue 3.5、Vue Router 4、Pinia
- JavaScript
- Vite 6
- Element Plus、Element Plus Icons
- Axios
- ECharts
- Sass Embedded
- VueUse、Vue Quill、Vue Draggable

## 关联仓库

| 项目 | 说明 | GitHub |
| --- | --- | --- |
| crowlook-backend | 后端服务 | [crowlook-backend](https://github.com/jiangyi3265/crowlook-backend) |
| crowlook-admin | 管理后台 | [crowlook-admin](https://github.com/jiangyi3265/crowlook-admin) |
| crowlook-app | 用户端 | [crowlook-app](https://github.com/jiangyi3265/crowlook-app) |

## 快速启动

需要 Node.js 18 或更高版本。仓库不会提交 `.env` 文件；本地开发时先从示例创建环境配置，再安装依赖并启动：

```bash
cp .env.example .env.development
npm install
npm run dev
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env.development
npm install
npm run dev
```

默认开发接口前缀为 `/dev-api`，由 Vite 代理到本地后端。生产构建命令：

```bash
npm run build:prod
npm run preview
```

后端首次初始化需执行其 `sql/crowlook_content.sql`。登录后进入“页面编排”，导入 `crowlook-app/data/snapshot.json`，即可把用户端当前页面、作品与历史评论写入数据库；之后可在本后台持续维护并发布。

## 项目结构

```text
src/api/          后端接口封装
src/components/   通用业务与界面组件
src/layout/       管理后台整体布局、导航和标签页
src/router/       静态路由与动态权限路由入口
src/store/        Pinia 状态管理
src/views/crowlook/  作品、分类、页面编排与评论审核
src/views/          登录、运营首页、系统管理、监控与工具页面
vite/             Vite 插件与构建辅助配置
public/           公共静态资源
```

## 简历描述示例

参与 Crowlook 内容运营后台开发，基于 Vue 3、Pinia、Vite 与 Element Plus 完成作品发布、分类管理、页面模块编排、快照迁移和评论审核，并通过统一 API 驱动 H5 与微信小程序内容更新。
