# Crowlook Admin

Crowlook 项目的 Web 管理后台，用于运营人员管理账号权限、系统配置、日志与服务运行状态。

## 项目简介

本仓库是与 `crowlook-backend` 配套的 Vue 3 管理端，基于 RuoYi-Vue3 3.9.1 整理。项目包含登录注册、动态权限路由、用户/角色/菜单/部门/岗位管理、字典与参数配置、通知公告、操作与登录日志、在线用户、服务与缓存监控等页面，并提供表单构建、代码生成和 Swagger 入口。界面已对导航、标签页与首页进行本地定制。

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

## 项目结构

```text
src/api/          后端接口封装
src/components/   通用业务与界面组件
src/layout/       管理后台整体布局、导航和标签页
src/router/       静态路由与动态权限路由入口
src/store/        Pinia 状态管理
src/views/        登录、系统管理、监控与工具页面
vite/             Vite 插件与构建辅助配置
public/           公共静态资源
```

## 简历描述示例

参与 Crowlook 运营管理后台开发，基于 Vue 3、Pinia、Vite 与 Element Plus 完成动态权限路由、用户角色管理、系统监控等功能，并优化导航与多标签页的交互体验。

