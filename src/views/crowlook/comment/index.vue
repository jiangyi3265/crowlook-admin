<template>
  <div class="app-container">
    <div class="page-intro">
      <div><h2>评论审核</h2><p>用户端新评论默认进入待审核；通过后才会出现在对应作品详情页。</p></div>
      <el-badge :value="pendingCount" :hidden="pendingCount === 0"><el-button icon="Refresh" :loading="loading" @click="load">刷新</el-button></el-badge>
    </div>

    <el-form :model="query" inline class="filter-bar">
      <el-form-item label="作品 ID"><el-input-number v-model="query.postId" :min="1" controls-position="right" /></el-form-item>
      <el-form-item label="用户昵称"><el-input v-model="query.nickname" clearable placeholder="昵称关键词" @keyup.enter="search" /></el-form-item>
      <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部状态" style="width: 140px"><el-option v-for="item in statuses" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
      <el-form-item><el-button icon="Search" @click="search">查询</el-button><el-button icon="Refresh" @click="resetQuery">重置</el-button></el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="rows">
      <el-table-column label="评论内容" min-width="320"><template #default="{ row }"><p class="comment-text">{{ row.content }}</p><span class="comment-meta">{{ row.nickname || '访客' }} · {{ parseTime(row.createTime) || '时间未知' }}</span></template></el-table-column>
      <el-table-column prop="postTitle" label="对应作品" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.postTitle || `作品 #${row.postId}` }}</template></el-table-column>
      <el-table-column label="状态" width="105"><template #default="{ row }"><el-tag :type="statusMeta(row.status).type" effect="plain">{{ statusMeta(row.status).label }}</el-tag></template></el-table-column>
      <el-table-column label="审核操作" width="230" align="right">
        <template #default="{ row }">
          <el-button v-if="row.status !== '1'" link type="success" @click="review(row, '1')" v-hasPermi="['crowlook:comment:edit']">通过</el-button>
          <el-button v-if="row.status !== '2'" link type="warning" @click="review(row, '2')" v-hasPermi="['crowlook:comment:edit']">拒绝</el-button>
          <el-button v-if="row.status !== '0'" link @click="review(row, '0')" v-hasPermi="['crowlook:comment:edit']">待审核</el-button>
          <el-button link type="danger" @click="remove(row)" v-hasPermi="['crowlook:comment:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />
  </div>
</template>

<script setup name="CrowlookComment">
import { commentApi } from '@/api/crowlook/content'

const { proxy } = getCurrentInstance()
const statuses = [{ label: '待审核', value: '0', type: 'warning' }, { label: '已通过', value: '1', type: 'success' }, { label: '已拒绝', value: '2', type: 'info' }]
const loading = ref(false), rows = ref([]), total = ref(0)
const query = reactive({ pageNum: 1, pageSize: 15, postId: undefined, nickname: '', status: '0' })
const pendingCount = computed(() => query.status === '0' ? total.value : rows.value.filter(item => item.status === '0').length)
function statusMeta(value) { return statuses.find(item => item.value === value) || statuses[0] }
async function load() { loading.value = true; try { const r = await commentApi.list(query); rows.value = r.rows || []; total.value = r.total || 0 } finally { loading.value = false } }
function search() { query.pageNum = 1; load() }
function resetQuery() { Object.assign(query, { pageNum: 1, postId: undefined, nickname: '', status: '0' }); load() }
async function review(row, status) { await commentApi.update({ ...row, status }); proxy.$modal.msgSuccess(`评论已设为${statusMeta(status).label}`); load() }
async function remove(row) { await proxy.$modal.confirm('确认永久删除这条评论吗？'); await commentApi.remove(row.commentId); proxy.$modal.msgSuccess('已删除'); load() }
load()
</script>

<style scoped>
.page-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--el-border-color); }
.page-intro h2 { margin: 0 0 8px; font-size: 24px; }.page-intro p { margin: 0; color: var(--el-text-color-secondary); }
.filter-bar { padding: 16px 16px 0; margin-bottom: 16px; background: var(--el-fill-color-lighter); }
.comment-text { max-width: 680px; margin: 0 0 8px; line-height: 1.65; white-space: pre-wrap; }.comment-meta { color: var(--el-text-color-secondary); font-size: 12px; }
</style>
