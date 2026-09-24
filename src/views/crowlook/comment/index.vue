<template>
  <div class="app-container comment-center">
    <header class="page-header">
      <div>
        <p class="eyebrow">COMMUNITY</p>
        <h2>评论中心</h2>
        <p>用户提交的评论会先进入待审核队列，通过后才会展示在对应作品下方。</p>
      </div>
      <el-button icon="Refresh" :loading="loading" @click="refreshAll">刷新</el-button>
    </header>

    <nav class="status-tabs" aria-label="评论审核状态">
      <button
        v-for="item in statuses"
        :key="item.value"
        type="button"
        :class="{ active: query.status === item.value }"
        @click="selectStatus(item.value)"
      >
        <span>{{ item.label }}</span>
        <strong>{{ counts[item.value] }}</strong>
      </button>
    </nav>

    <div class="review-toolbar">
      <el-input
        v-model="query.content"
        clearable
        maxlength="100"
        placeholder="搜索评论内容、用户昵称或作品名称"
        @keyup.enter="search"
        @clear="search"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" @click="search">搜索</el-button>
      <span class="result-count">共 {{ total }} 条</span>
    </div>

    <div v-if="selectedRows.length" class="bulk-bar">
      <span>已选 {{ selectedRows.length }} 条评论</span>
      <div>
        <el-button v-if="query.status !== '1'" type="success" plain :loading="batching" @click="batchReview('1')">批量通过</el-button>
        <el-button v-if="query.status !== '2'" type="warning" plain :loading="batching" @click="batchReview('2')">批量不通过</el-button>
        <el-button text @click="selectedIds = []">取消选择</el-button>
      </div>
    </div>

    <el-skeleton v-if="loading && !rows.length" :rows="6" animated />
    <section v-else-if="rows.length" v-loading="loading" class="review-list" aria-live="polite">
      <article v-for="row in rows" :key="row.commentId" class="review-item">
        <el-checkbox-group v-model="selectedIds" class="selection-cell">
          <el-checkbox :value="row.commentId" :aria-label="`选择${row.nickname || '访客'}的评论`" />
        </el-checkbox-group>

        <div class="avatar" :class="{ image: row.avatar }">
          <el-avatar v-if="row.avatar" :src="row.avatar" :size="42" />
          <span v-else>{{ displayInitial(row.nickname) }}</span>
        </div>

        <div class="comment-body">
          <div class="comment-author">
            <strong>{{ row.nickname || '访客' }}</strong>
            <span>{{ friendlyTime(row.createTime) }}</span>
            <el-tag :type="statusMeta(row.status).type" effect="plain" size="small">{{ statusMeta(row.status).label }}</el-tag>
          </div>
          <p>{{ row.content }}</p>
          <button type="button" class="post-link" @click="openPost(row)">
            <el-icon><Picture /></el-icon>
            <span>评论于《{{ row.postTitle || '未命名作品' }}》</span>
            <el-icon><TopRight /></el-icon>
          </button>
        </div>

        <div class="review-actions">
          <el-button v-if="row.status !== '1'" type="success" icon="Check" @click="review(row, '1')" v-hasPermi="['crowlook:comment:edit']">
            通过并展示
          </el-button>
          <el-button v-if="row.status !== '2'" plain icon="Close" @click="review(row, '2')" v-hasPermi="['crowlook:comment:edit']">
            不通过
          </el-button>
          <el-dropdown trigger="click" @command="command => handleCommand(command, row)">
            <el-button link icon="MoreFilled" aria-label="更多操作" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="row.status !== '0'" command="pending">重新放回待审核</el-dropdown-item>
                <el-dropdown-item command="delete" icon="Delete" divided>永久删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </article>
    </section>

    <div v-else class="empty-state">
      <span class="empty-icon"><el-icon><ChatDotRound /></el-icon></span>
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptyDescription }}</p>
      <el-button v-if="query.content" @click="clearSearch">清除搜索条件</el-button>
    </div>

    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />
  </div>
</template>

<script setup name="CrowlookComment">
import { commentApi } from '@/api/crowlook/content'
import { parseTime } from '@/utils/ruoyi'

const { proxy } = getCurrentInstance()
const statuses = [
  { label: '待审核', value: '0', type: 'warning' },
  { label: '已通过', value: '1', type: 'success' },
  { label: '未通过', value: '2', type: 'info' }
]
const loading = ref(false)
const batching = ref(false)
const rows = ref([])
const total = ref(0)
const selectedIds = ref([])
const counts = reactive({ 0: 0, 1: 0, 2: 0 })
const query = reactive({ pageNum: 1, pageSize: 12, content: '', status: '0' })

const selectedRows = computed(() => rows.value.filter(row => selectedIds.value.includes(row.commentId)))
const emptyTitle = computed(() => {
  if (query.content) return '没有找到匹配的评论'
  return query.status === '0' ? '待审核队列已清空' : `暂无${statusMeta(query.status).label}评论`
})
const emptyDescription = computed(() => query.status === '0'
  ? '新评论到来后会自动出现在这里。'
  : '切换到其他状态查看评论记录。')

function statusMeta(value) { return statuses.find(item => item.value === value) || statuses[0] }
function displayInitial(value) { return String(value || '访').trim().slice(0, 1).toUpperCase() }
function friendlyTime(value) { return parseTime(value, '{y}-{m}-{d} {h}:{i}') || '时间未知' }

async function load() {
  loading.value = true
  selectedIds.value = []
  try {
    const response = await commentApi.list(query)
    rows.value = response.rows || []
    total.value = response.total || 0
  } finally { loading.value = false }
}

async function loadCounts() {
  const responses = await Promise.all(statuses.map(item => commentApi.list({ pageNum: 1, pageSize: 1, status: item.value })))
  responses.forEach((response, index) => { counts[statuses[index].value] = response.total || 0 })
}

async function refreshAll() { await Promise.all([load(), loadCounts()]) }

function selectStatus(status) {
  query.status = status
  query.pageNum = 1
  load()
}

function search() { query.pageNum = 1; load() }
function clearSearch() { query.content = ''; search() }

async function review(row, status) {
  await commentApi.update({ ...row, status })
  const message = status === '1' ? '已通过，评论现在会显示在用户端' : status === '2' ? '已设为不通过，用户端不会展示' : '已重新放回待审核'
  proxy.$modal.msgSuccess(message)
  await refreshAll()
}

async function batchReview(status) {
  batching.value = true
  try {
    await Promise.all(selectedRows.value.map(row => commentApi.update({ ...row, status })))
    proxy.$modal.msgSuccess(status === '1' ? `已通过 ${selectedRows.value.length} 条评论` : `已将 ${selectedRows.value.length} 条评论设为不通过`)
    await refreshAll()
  } finally { batching.value = false }
}

function openPost(row) {
  window.open(`https://wuya.oksja.cn/#/pages/articleDetail/articleDetail?id=${row.postId}`, '_blank', 'noopener,noreferrer')
}

function handleCommand(command, row) {
  if (command === 'pending') review(row, '0')
  if (command === 'delete') remove(row)
}

async function remove(row) {
  await proxy.$modal.confirm(`确认永久删除${row.nickname || '该用户'}的这条评论吗？`)
  await commentApi.remove(row.commentId)
  proxy.$modal.msgSuccess('评论已删除')
  await refreshAll()
}

refreshAll()
</script>

<style scoped lang="scss">
.comment-center { --ink: #24231f; --muted: #706d66; --line: #dedbd3; color: var(--ink); }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; margin-bottom: 26px; padding-bottom: 22px; border-bottom: 1px solid var(--line); }
.page-header h2 { margin: 0 0 8px; font-size: 26px; letter-spacing: -.02em; }
.page-header p:not(.eyebrow) { max-width: 720px; margin: 0; color: var(--muted); line-height: 1.7; }
.eyebrow { margin: 0 0 8px; color: #817b70; font-size: 11px; font-weight: 700; letter-spacing: .14em; }
.status-tabs { display: flex; gap: 4px; margin-bottom: 20px; padding: 4px; background: #f1efe9; border-radius: 10px; }
.status-tabs button { display: flex; min-width: 128px; align-items: center; justify-content: center; gap: 9px; padding: 10px 16px; color: #69665f; background: transparent; border: 0; border-radius: 7px; cursor: pointer; font: inherit; }
.status-tabs button:hover { color: var(--ink); background: rgba(255,255,255,.55); }
.status-tabs button.active { color: var(--ink); background: #fbfaf7; box-shadow: 0 1px 4px rgba(60,55,45,.12); }
.status-tabs strong { min-width: 24px; padding: 2px 7px; color: #5e5a52; background: #e5e1d8; border-radius: 999px; font-size: 12px; font-variant-numeric: tabular-nums; }
.status-tabs button.active strong { color: #f6f4ee; background: #49453e; }
.review-toolbar { display: grid; grid-template-columns: minmax(260px, 520px) auto 1fr; align-items: center; gap: 10px; margin-bottom: 18px; }
.result-count { justify-self: end; color: var(--muted); font-size: 13px; }
.bulk-bar { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 12px; padding: 10px 12px 10px 16px; color: #36332e; background: #eeeae0; border: 1px solid #d9d4c8; border-radius: 8px; font-size: 13px; }
.review-list { border-top: 1px solid var(--line); }
.review-item { display: grid; grid-template-columns: 28px 48px minmax(0, 1fr) auto; align-items: start; gap: 14px; min-height: 138px; padding: 22px 6px; border-bottom: 1px solid var(--line); }
.review-item:hover { background: #fbfaf7; }
.selection-cell { padding-top: 8px; }
.selection-cell :deep(.el-checkbox__label) { display: none; }
.avatar { display: grid; width: 42px; height: 42px; place-items: center; color: #f7f5f0; background: #5d584f; border-radius: 50%; font-size: 14px; font-weight: 700; }
.comment-body { min-width: 0; }
.comment-author { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; }
.comment-author strong { font-size: 14px; }.comment-author > span { color: var(--muted); font-size: 12px; }
.comment-body > p { max-width: 760px; margin: 12px 0; color: #33312d; font-size: 15px; line-height: 1.75; white-space: pre-wrap; word-break: break-word; }
.post-link { display: inline-flex; max-width: 100%; align-items: center; gap: 6px; padding: 0; overflow: hidden; color: #777269; background: transparent; border: 0; cursor: pointer; font-size: 12px; }
.post-link span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.post-link:hover { color: #3f3b35; text-decoration: underline; }
.review-actions { display: flex; align-items: center; gap: 8px; padding-top: 26px; }
.empty-state { display: flex; min-height: 380px; align-items: center; justify-content: center; flex-direction: column; color: var(--muted); text-align: center; border-top: 1px solid var(--line); }
.empty-icon { display: grid; width: 62px; height: 62px; place-items: center; margin-bottom: 16px; color: #716d64; background: #eeeae2; border-radius: 50%; font-size: 26px; }
.empty-state h3 { margin: 0 0 8px; color: var(--ink); font-size: 18px; }.empty-state p { margin: 0 0 18px; }
@media (max-width: 900px) { .review-item { grid-template-columns: 28px 42px 1fr; }.review-actions { grid-column: 3; padding-top: 4px; justify-content: flex-start; }.review-toolbar { grid-template-columns: 1fr auto; }.result-count { grid-column: 1 / -1; justify-self: start; } }
@media (max-width: 640px) { .page-header { align-items: flex-start; flex-direction: column; }.status-tabs { overflow-x: auto; }.status-tabs button { min-width: 112px; }.review-toolbar { grid-template-columns: 1fr; }.review-toolbar > .el-button { width: 100%; }.review-item { grid-template-columns: 26px 1fr; }.avatar { grid-column: 2; }.comment-body, .review-actions { grid-column: 2; }.review-actions { align-items: stretch; flex-direction: column; }.review-actions :deep(.el-button) { width: 100%; margin-left: 0; }.bulk-bar { align-items: flex-start; flex-direction: column; } }
</style>
