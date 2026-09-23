<template>
  <div class="app-container">
    <div class="page-intro">
      <div><h2>页面编排</h2><p>维护首页、发现页与品牌页的模块数据；已发布页面会被用户端实时读取。</p></div>
      <div class="intro-actions">
        <input ref="fileInput" class="visually-hidden" type="file" accept="application/json,.json" @change="importSnapshot" />
        <el-button icon="Upload" :loading="importing" @click="fileInput?.click()" v-hasPermi="['crowlook:page:import']">导入用户端快照</el-button>
        <el-button type="primary" icon="Plus" @click="openEditor()" v-hasPermi="['crowlook:page:add']">新建页面</el-button>
      </div>
    </div>

    <el-alert title="首次接入提示" type="info" :closable="false" show-icon class="setup-tip">
      <template #default>选择用户端 <code>data/snapshot.json</code> 可一次导入分类、页面、作品和历史评论；相同 ID 的内容会安全更新。</template>
    </el-alert>

    <el-table v-loading="loading" :data="rows">
      <el-table-column prop="pageTitle" label="页面" min-width="210"><template #default="{ row }"><strong>{{ row.pageTitle }}</strong><div class="muted">{{ row.pageName || row.slug || '—' }}</div></template></el-table-column>
      <el-table-column prop="pageKey" label="接口标识" min-width="180"><template #default="{ row }"><code>{{ row.pageKey }}</code></template></el-table-column>
      <el-table-column label="模块数" width="100" align="center"><template #default="{ row }">{{ moduleCount(row.modulesJson) }}</template></el-table-column>
      <el-table-column label="状态" width="105"><template #default="{ row }"><el-tag :type="row.status === '0' ? 'success' : 'warning'" effect="plain">{{ row.status === '0' ? '已发布' : '草稿' }}</el-tag></template></el-table-column>
      <el-table-column prop="updateTime" label="最近更新" width="170"><template #default="{ row }">{{ parseTime(row.updateTime || row.createTime) || '—' }}</template></el-table-column>
      <el-table-column label="操作" width="140" align="right"><template #default="{ row }"><el-button link type="primary" @click="openEditor(row)" v-hasPermi="['crowlook:page:edit']">编辑</el-button><el-button link type="danger" @click="remove(row)" v-hasPermi="['crowlook:page:remove']">删除</el-button></template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />

    <el-drawer v-model="drawer.open" :title="drawer.title" size="min(880px, 94vw)" append-to-body destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-row :gutter="18">
          <el-col :xs="24" :sm="12"><el-form-item label="页面标题" prop="pageTitle"><el-input v-model="form.pageTitle" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="页面标识" prop="pageKey"><el-input v-model="form.pageKey" placeholder="home / discovery / about" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="页面名称"><el-input v-model="form.pageName" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="Slug"><el-input v-model="form.slug" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="背景色"><el-input v-model="form.backgroundColor" placeholder="#ffffff" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="背景图"><el-input v-model="form.backgroundImage" placeholder="https://..." /></el-form-item></el-col>
        </el-row>
        <el-form-item label="页面模块 JSON" prop="modulesJson">
          <div class="json-field"><el-input v-model="form.modulesJson" type="textarea" :rows="18" spellcheck="false" /><el-button text icon="MagicStick" @click="pretty('modulesJson')">格式化</el-button></div>
        </el-form-item>
        <el-form-item label="页面配置 JSON">
          <div class="json-field"><el-input v-model="form.configJson" type="textarea" :rows="8" spellcheck="false" /><el-button text icon="MagicStick" @click="pretty('configJson')">格式化</el-button></div>
        </el-form-item>
        <el-row :gutter="18">
          <el-col :xs="24" :sm="12"><el-form-item label="状态"><el-radio-group v-model="form.status"><el-radio-button value="0">已发布</el-radio-button><el-radio-button value="1">草稿</el-radio-button></el-radio-group></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" :max="999" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer><div class="drawer-footer"><span>{{ form.status === '0' ? '保存后用户端立即读取新配置' : '草稿不会影响用户端' }}</span><div><el-button @click="drawer.open = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存页面</el-button></div></div></template>
    </el-drawer>
  </div>
</template>

<script setup name="CrowlookPage">
import { pageApi, importContentSnapshot } from '@/api/crowlook/content'

const { proxy } = getCurrentInstance()
const loading = ref(false), saving = ref(false), importing = ref(false), rows = ref([]), total = ref(0), fileInput = ref(), formRef = ref()
const query = reactive({ pageNum: 1, pageSize: 10 })
const drawer = reactive({ open: false, title: '' })
const form = reactive({})
const rules = {
  pageTitle: [{ required: true, message: '请输入页面标题', trigger: 'blur' }],
  pageKey: [{ required: true, message: '请输入页面标识', trigger: 'blur' }],
  modulesJson: [{ required: true, message: '请输入模块 JSON', trigger: 'blur' }]
}

function resetForm() { Object.keys(form).forEach(key => delete form[key]); Object.assign(form, { pageId: undefined, pageKey: '', pageTitle: '', pageName: '', slug: '', modulesJson: '[]', configJson: '{}', backgroundColor: '', backgroundImage: '', status: '1', sortOrder: 0, remark: '' }) }
async function load() { loading.value = true; try { const r = await pageApi.list(query); rows.value = r.rows || []; total.value = r.total || 0 } finally { loading.value = false } }
function moduleCount(value) { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed.length : 0 } catch { return '!' } }
function pretty(field) { try { form[field] = JSON.stringify(JSON.parse(form[field] || (field === 'modulesJson' ? '[]' : '{}')), null, 2) } catch { proxy.$modal.msgError('JSON 格式不正确，请检查逗号、引号与括号') } }

async function openEditor(row) {
  resetForm()
  if (row?.pageId) {
    Object.assign(form, (await pageApi.get(row.pageId)).data)
    pretty('modulesJson'); pretty('configJson')
  }
  drawer.title = row ? '编辑页面' : '新建页面'
  drawer.open = true
  nextTick(() => formRef.value?.clearValidate())
}
async function save() {
  await formRef.value.validate()
  saving.value = true
  try {
    JSON.parse(form.modulesJson); JSON.parse(form.configJson || '{}')
    form.pageId ? await pageApi.update(form) : await pageApi.add(form)
    proxy.$modal.msgSuccess(form.status === '0' ? '页面已发布' : '页面草稿已保存')
    drawer.open = false; await load()
  } catch (error) {
    if (error instanceof SyntaxError) proxy.$modal.msgError('JSON 格式不正确，页面未保存')
    else throw error
  } finally { saving.value = false }
}
async function remove(row) { await proxy.$modal.confirm(`确认删除页面“${row.pageTitle}”吗？`); await pageApi.remove(row.pageId); proxy.$modal.msgSuccess('已删除'); load() }

async function importSnapshot(event) {
  const file = event.target.files?.[0]
  if (!file) return
  importing.value = true
  try {
    const payload = JSON.parse(await file.text())
    const response = await importContentSnapshot(payload)
    const count = response.data || {}
    proxy.$modal.msgSuccess(`导入完成：${count.categories || 0} 个分类、${count.pages || 0} 个页面、${count.posts || 0} 个作品、${count.comments || 0} 条评论`)
    await load()
  } catch (error) {
    if (error instanceof SyntaxError) proxy.$modal.msgError('所选文件不是有效的 JSON 快照')
    else throw error
  } finally {
    importing.value = false
    event.target.value = ''
  }
}
load()
</script>

<style scoped>
.page-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--el-border-color); }
.page-intro h2 { margin: 0 0 8px; font-size: 24px; }.page-intro p,.muted { margin: 0; color: var(--el-text-color-secondary); }.muted { margin-top: 5px; font-size: 12px; }
.intro-actions { display: flex; gap: 10px; }.setup-tip { margin-bottom: 18px; }.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.json-field { width: 100%; }.json-field :deep(textarea) { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; line-height: 1.6; }.json-field .el-button { float: right; margin-top: 4px; }
.drawer-footer { display: flex; align-items: center; justify-content: space-between; gap: 20px; width: 100%; }.drawer-footer > span { color: var(--el-text-color-secondary); font-size: 13px; }
@media(max-width: 700px) { .page-intro,.drawer-footer { align-items: flex-start; flex-direction: column; }.intro-actions { flex-wrap: wrap; } }
</style>
