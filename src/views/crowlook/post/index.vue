<template>
  <div class="app-container">
    <div class="page-intro">
      <div><h2>作品管理</h2><p>作品发布后会通过公开 API 出现在用户端列表、搜索与详情页。</p></div>
      <el-button type="primary" icon="Plus" @click="openEditor()" v-hasPermi="['crowlook:post:add']">新建作品</el-button>
    </div>

    <el-form :model="query" inline class="filter-bar">
      <el-form-item label="标题"><el-input v-model="query.postTitle" clearable placeholder="搜索作品" @keyup.enter="search" /></el-form-item>
      <el-form-item label="分类">
        <el-select v-model="query.categoryId" clearable filterable placeholder="全部分类" style="width: 180px">
          <el-option v-for="item in categories" :key="item.categoryId" :label="item.categoryName" :value="item.categoryId" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 130px">
          <el-option v-for="item in statuses" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item><el-button icon="Search" @click="search">查询</el-button><el-button icon="Refresh" @click="resetQuery">重置</el-button></el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="rows">
      <el-table-column label="作品" min-width="330">
        <template #default="{ row }">
          <div class="post-cell">
            <el-image class="cover" :src="assetUrl(row.thumbnail)" fit="cover"><template #error><div class="cover-empty"><el-icon><Picture /></el-icon></div></template></el-image>
            <div><strong>{{ row.postTitle }}</strong><small>{{ row.excerpt || '暂无摘要' }}</small></div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="categoryName" label="分类" min-width="120"><template #default="{ row }">{{ row.categoryName || '未分类' }}</template></el-table-column>
      <el-table-column prop="format" label="类型" width="90"><template #default="{ row }">{{ formatLabel(row.format) }}</template></el-table-column>
      <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="statusMeta(row.status).type" effect="plain">{{ statusMeta(row.status).label }}</el-tag></template></el-table-column>
      <el-table-column prop="views" label="浏览" width="90" align="right" />
      <el-table-column prop="favoriteCount" label="点赞" width="80" align="right" />
      <el-table-column prop="commentCount" label="评论" width="80" align="right" />
      <el-table-column label="发布时间" width="165"><template #default="{ row }">{{ parseTime(row.publishTime) || '—' }}</template></el-table-column>
      <el-table-column label="操作" width="180" align="right" fixed="right">
        <template #default="{ row }"><el-button link @click="preview(row)">查看用户端</el-button><el-button link type="primary" @click="openEditor(row)" v-hasPermi="['crowlook:post:edit']">编辑</el-button><el-button link type="danger" @click="remove(row)" v-hasPermi="['crowlook:post:remove']">删除</el-button></template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />

    <el-drawer v-model="drawer.open" :title="drawer.title" size="min(820px, 92vw)" append-to-body destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="editor-section">
          <h3>基础信息</h3>
          <el-form-item label="作品标题" prop="postTitle"><el-input v-model="form.postTitle" maxlength="160" show-word-limit /></el-form-item>
          <el-row :gutter="18">
            <el-col :xs="24" :sm="12"><el-form-item label="主分类" prop="categoryId"><el-select v-model="form.categoryId" filterable style="width: 100%"><el-option v-for="item in categories" :key="item.categoryId" :label="item.categoryName" :value="item.categoryId" /></el-select></el-form-item></el-col>
            <el-col :xs="24" :sm="12"><el-form-item label="内容类型"><el-select v-model="form.format" style="width: 100%"><el-option label="图片作品" value="image" /><el-option label="视频作品" value="video" /><el-option label="文章" value="article" /></el-select></el-form-item></el-col>
          </el-row>
          <el-form-item label="摘要"><el-input v-model="form.excerpt" type="textarea" :rows="3" maxlength="1000" show-word-limit /></el-form-item>
          <el-form-item label="作品封面" prop="thumbnail">
            <image-upload v-model="form.thumbnail" :limit="1" :file-size="10" :file-type="['png','jpg','jpeg','webp']" />
            <span class="field-help">用于作品列表、搜索结果和详情页顶部。</span>
          </el-form-item>
        </div>

        <div class="editor-section">
          <h3>正文与展示</h3>
          <el-form-item label="正文内容"><editor v-model="form.content" :min-height="260" /></el-form-item>
          <template v-if="form.format === 'video'">
            <el-form-item label="视频文件">
              <file-upload :model-value="managedUploadValue(form.videoConfig.video)" :limit="1" :file-size="10" :file-type="['mp4','webm','mov','m4v']" @update:model-value="value => form.videoConfig.video = value" />
              <span class="field-help">可直接上传 10MB 内短视频；较大视频可展开下方入口粘贴已有链接。</span>
              <el-collapse class="url-fallback"><el-collapse-item title="已有网络视频？粘贴地址" name="video"><el-input v-model="form.videoConfig.video" clearable placeholder="https://.../video.mp4" /></el-collapse-item></el-collapse>
            </el-form-item>
            <el-form-item label="视频封面"><image-upload v-model="form.videoConfig.poster" :limit="1" :file-size="10" /><el-switch v-model="form.videoConfig.loop" active-text="循环播放" /></el-form-item>
          </template>
          <el-collapse class="advanced-settings">
            <el-collapse-item title="更多展示设置" name="advanced">
              <el-row :gutter="18">
                <el-col :xs="24" :sm="12"><el-form-item label="内容标识"><el-input v-model="form.slug" placeholder="可留空，由系统使用" /></el-form-item></el-col>
                <el-col :xs="24" :sm="12"><el-form-item label="排序优先级"><el-input-number v-model="form.sortOrder" :min="0" :max="9999" /></el-form-item></el-col>
              </el-row>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div class="editor-section publish-section">
          <h3>发布设置</h3>
          <el-row :gutter="18">
            <el-col :xs="24" :sm="12"><el-form-item label="状态"><el-radio-group v-model="form.status"><el-radio-button v-for="item in statuses" :key="item.value" :value="item.value">{{ item.label }}</el-radio-button></el-radio-group></el-form-item></el-col>
            <el-col :xs="24" :sm="12"><el-form-item label="发布时间"><el-date-picker v-model="form.publishTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" /></el-form-item></el-col>
          </el-row>
          <el-form-item label="推荐内容"><el-switch v-model="form.featured" active-text="在重点位置展示" /></el-form-item>
        </div>
      </el-form>
      <template #footer><div class="drawer-footer"><span>{{ form.status === '0' ? '保存后用户端可见' : '当前不会出现在用户端' }}</span><div><el-button v-if="form.postId" @click="preview(form)">预览</el-button><el-button @click="drawer.open = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存作品</el-button></div></div></template>
    </el-drawer>
  </div>
</template>

<script setup name="CrowlookPost">
import { categoryApi, postApi } from '@/api/crowlook/content'

const { proxy } = getCurrentInstance()
const statuses = [{ label: '已发布', value: '0', type: 'success' }, { label: '草稿', value: '1', type: 'warning' }, { label: '已下线', value: '2', type: 'info' }]
const loading = ref(false), saving = ref(false), rows = ref([]), total = ref(0), categories = ref([]), formRef = ref()
const query = reactive({ pageNum: 1, pageSize: 10, postTitle: '', categoryId: undefined, status: '' })
const drawer = reactive({ open: false, title: '' })
const form = reactive({})
const rules = { postTitle: [{ required: true, message: '请输入作品标题', trigger: 'blur' }], categoryId: [{ required: true, message: '请选择主分类', trigger: 'change' }] }

function resetForm() {
  Object.keys(form).forEach(key => delete form[key])
  Object.assign(form, { postId: undefined, postTitle: '', slug: '', excerpt: '', thumbnail: '', format: 'image', formatContent: '{}', videoConfig: { video: '', poster: '', text: '', loop: false }, categoryId: undefined, categoryIds: '', content: '', status: '1', featured: false, sortOrder: 0, views: 0, favoriteCount: 0, mode: 1, style: 1, publishTime: undefined, remark: '' })
}
async function load() { loading.value = true; try { const r = await postApi.list(query); rows.value = r.rows || []; total.value = r.total || 0 } finally { loading.value = false } }
async function loadCategories() { categories.value = (await categoryApi.list({ status: '0' })).data || [] }
function search() { query.pageNum = 1; load() }
function resetQuery() { Object.assign(query, { pageNum: 1, postTitle: '', categoryId: undefined, status: '' }); load() }
function statusMeta(value) { return statuses.find(item => item.value === value) || statuses[2] }
function formatLabel(value) { return ({ image: '图片', video: '视频', article: '文章' })[value] || value || '图片' }

async function openEditor(row) {
  resetForm()
  if (row?.postId) {
    const data = (await postApi.get(row.postId)).data
    Object.assign(form, data)
    try {
      const video = JSON.parse(data.formatContent || '{}')
      form.videoConfig = { video: video.video || '', poster: video.poster || '', text: video.text || '', loop: video.loop === true || video.loop === '1' }
    } catch { form.videoConfig = { video: '', poster: '', text: '', loop: false } }
  }
  drawer.title = row ? '编辑作品' : '新建作品'
  drawer.open = true
  nextTick(() => formRef.value?.clearValidate())
}
async function save() {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = { ...form, categoryIds: String(form.categoryId || '') }
    payload.formatContent = JSON.stringify({ ...form.videoConfig, loop: form.videoConfig.loop ? '1' : '' })
    delete payload.videoConfig
    form.postId ? await postApi.update(payload) : await postApi.add(payload)
    proxy.$modal.msgSuccess(form.status === '0' ? '作品已发布' : '作品已保存')
    drawer.open = false
    await load()
  } finally { saving.value = false }
}
async function remove(row) { await proxy.$modal.confirm(`确认删除作品“${row.postTitle}”吗？`); await postApi.remove(row.postId); proxy.$modal.msgSuccess('已删除'); load() }
function preview(row) { window.open(`https://wuya.oksja.cn/#/pages/articleDetail/articleDetail?id=${row.postId}`, '_blank', 'noopener,noreferrer') }
function managedUploadValue(value) { return /^https?:\/\//i.test(value || '') ? '' : (value || '') }
function assetUrl(value) { return !value || /^https?:\/\//i.test(value) ? value : `${import.meta.env.VITE_APP_BASE_API}${value}` }

Promise.all([loadCategories(), load()])
</script>

<style scoped>
.page-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--el-border-color); }
.page-intro h2 { margin: 0 0 8px; font-size: 24px; }.page-intro p { margin: 0; color: var(--el-text-color-secondary); }
.filter-bar { padding: 16px 16px 0; margin-bottom: 16px; background: var(--el-fill-color-lighter); }
.post-cell { display: flex; align-items: center; gap: 14px; min-width: 0; }.post-cell strong,.post-cell small { display: block; }.post-cell strong { margin-bottom: 5px; }.post-cell small { max-width: 380px; overflow: hidden; color: var(--el-text-color-secondary); text-overflow: ellipsis; white-space: nowrap; }
.cover,.cover-empty { width: 72px; height: 54px; flex: 0 0 auto; }.cover-empty { display: grid; place-items: center; color: var(--el-text-color-placeholder); background: var(--el-fill-color); }
.editor-section { margin-bottom: 28px; padding-bottom: 12px; border-bottom: 1px solid var(--el-border-color-lighter); }.editor-section h3 { margin: 0 0 18px; font-size: 16px; }.publish-section { border-bottom: 0; }
.field-help { display: block; margin-top: 8px; color: var(--el-text-color-secondary); font-size: 12px; }.url-fallback { width: 100%; margin-top: 10px; border: 0; }.advanced-settings { border-top: 1px solid var(--el-border-color-lighter); border-bottom: 0; }
.drawer-footer { display: flex; align-items: center; justify-content: space-between; gap: 20px; width: 100%; }.drawer-footer > span { color: var(--el-text-color-secondary); font-size: 13px; }
@media(max-width: 640px) { .page-intro,.drawer-footer { align-items: flex-start; flex-direction: column; } }
</style>
