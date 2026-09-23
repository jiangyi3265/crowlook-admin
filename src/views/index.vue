<template>
  <main class="content-home">
    <header class="home-header">
      <div>
        <p class="eyebrow">CROWLOOK CONTENT STUDIO</p>
        <h1>内容运营台</h1>
        <p class="subtitle">在这里维护作品、栏目与评论；发布后的内容会由后端 API 同步提供给用户端。</p>
      </div>
      <el-button type="primary" icon="Plus" @click="go('/crowlook/post')">新建作品</el-button>
    </header>

    <section class="metrics" aria-label="内容概况">
      <button v-for="item in metrics" :key="item.label" class="metric" type="button" @click="go(item.path)">
        <span class="metric-label">{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <span class="metric-note">{{ item.note }}</span>
      </button>
    </section>

    <section class="workspace">
      <div class="section-heading">
        <div>
          <p class="eyebrow">PUBLISHING WORKFLOW</p>
          <h2>从内容录入到用户端发布</h2>
        </div>
        <el-button text icon="Refresh" :loading="loading" @click="loadOverview">刷新数据</el-button>
      </div>

      <div class="workflow">
        <button v-for="(step, index) in workflow" :key="step.title" type="button" class="workflow-step" @click="go(step.path)">
          <span class="step-index">0{{ index + 1 }}</span>
          <span>
            <strong>{{ step.title }}</strong>
            <small>{{ step.description }}</small>
          </span>
          <el-icon><ArrowRight /></el-icon>
        </button>
      </div>
    </section>

    <section class="connection-note">
      <el-icon><Connection /></el-icon>
      <div>
        <strong>三端已使用同一套内容契约</strong>
        <p>管理后台保存到 Crowlook 后端，用户端优先读取公开 API；接口暂不可用时仍会显示本地快照，避免页面空白。</p>
      </div>
    </section>
  </main>
</template>

<script setup name="Index">
import { getContentOverview } from '@/api/crowlook/content'

const router = useRouter()
const loading = ref(false)
const overview = reactive({
  publishedPosts: 0,
  draftPosts: 0,
  categories: 0,
  publishedPages: 0,
  pendingComments: 0
})

const metrics = computed(() => [
  { label: '已发布作品', value: overview.publishedPosts, note: '用户端当前可见', path: '/crowlook/post' },
  { label: '待发布草稿', value: overview.draftPosts, note: '需要补充或确认', path: '/crowlook/post' },
  { label: '内容分类', value: overview.categories, note: '用于作品筛选与导航', path: '/crowlook/category' },
  { label: '已发布页面', value: overview.publishedPages, note: '首页、发现与品牌页', path: '/crowlook/page' },
  { label: '待审核评论', value: overview.pendingComments, note: '通过后在详情页显示', path: '/crowlook/comment' }
])

const workflow = [
  { title: '整理分类', description: '维护用户端栏目名称、层级与顺序。', path: '/crowlook/category' },
  { title: '编辑作品', description: '录入封面、正文与展示方式，并明确发布状态。', path: '/crowlook/post' },
  { title: '编排页面', description: '维护首页、发现页和品牌页的 JSON 模块。', path: '/crowlook/page' },
  { title: '审核评论', description: '处理用户端提交内容，审核通过后公开展示。', path: '/crowlook/comment' }
]

function go(path) {
  router.push(path)
}

async function loadOverview() {
  loading.value = true
  try {
    const response = await getContentOverview()
    Object.assign(overview, response.data || {})
  } catch {
    // 权限或初始化阶段失败时保持 0，具体错误由全局请求拦截器展示。
  } finally {
    loading.value = false
  }
}

loadOverview()
</script>

<style scoped lang="scss">
.content-home { min-height: calc(100vh - 84px); padding: clamp(24px, 4vw, 56px); color: #171717; background: #f4f2ee; }
.home-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; padding-bottom: 34px; border-bottom: 1px solid #c9c5bd; }
.eyebrow { margin: 0 0 10px; color: #68635b; font-size: 12px; font-weight: 700; letter-spacing: .14em; }
h1, h2 { margin: 0; font-weight: 600; letter-spacing: -.035em; }
h1 { font-size: clamp(34px, 5vw, 58px); }
h2 { font-size: clamp(23px, 3vw, 32px); }
.subtitle { max-width: 620px; margin: 16px 0 0; color: #5c5852; line-height: 1.7; }
.metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border-bottom: 1px solid #c9c5bd; }
.metric { min-height: 166px; padding: 26px 24px; text-align: left; color: inherit; background: transparent; border: 0; border-right: 1px solid #c9c5bd; cursor: pointer; }
.metric:last-child { border-right: 0; }
.metric:hover, .metric:focus-visible { background: #ebe8e1; outline: none; }
.metric-label, .metric-note { display: block; color: #68635b; }
.metric-label { font-size: 13px; font-weight: 600; }
.metric strong { display: block; margin: 18px 0 14px; font-size: 38px; font-weight: 500; }
.metric-note { font-size: 12px; line-height: 1.5; }
.workspace { padding-top: 44px; }
.section-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-bottom: 22px; }
.workflow { border-top: 1px solid #c9c5bd; }
.workflow-step { display: grid; grid-template-columns: 64px 1fr auto; align-items: center; width: 100%; gap: 18px; padding: 20px 8px; color: inherit; text-align: left; background: transparent; border: 0; border-bottom: 1px solid #c9c5bd; cursor: pointer; }
.workflow-step:hover, .workflow-step:focus-visible { padding-left: 16px; background: #ebe8e1; outline: none; }
.step-index { color: #8a857c; font-variant-numeric: tabular-nums; }
.workflow-step strong, .workflow-step small { display: block; }
.workflow-step strong { margin-bottom: 6px; font-size: 16px; }
.workflow-step small { color: #68635b; font-size: 13px; }
.connection-note { display: flex; align-items: flex-start; gap: 14px; margin-top: 38px; padding: 20px; color: #f4f2ee; background: #1d1d1b; }
.connection-note .el-icon { margin-top: 3px; font-size: 20px; }
.connection-note p { margin: 7px 0 0; color: #c9c5bd; line-height: 1.6; }
@media (max-width: 1100px) { .metrics { grid-template-columns: repeat(2, 1fr); } .metric { border-bottom: 1px solid #c9c5bd; } }
@media (max-width: 640px) { .content-home { padding: 24px 18px; } .home-header { align-items: flex-start; flex-direction: column; } .metrics { grid-template-columns: 1fr; } .metric { min-height: 128px; border-right: 0; } }
</style>
