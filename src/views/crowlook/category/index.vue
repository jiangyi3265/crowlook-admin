<template>
  <div class="app-container">
    <div class="page-intro">
      <div><h2>分类管理</h2><p>分类层级会直接用于用户端的作品导航与筛选。</p></div>
      <el-button type="primary" icon="Plus" @click="openEditor()" v-hasPermi="['crowlook:category:add']">新增分类</el-button>
    </div>

    <el-form :model="query" inline class="filter-bar">
      <el-form-item label="分类名称"><el-input v-model="query.categoryName" clearable placeholder="名称或关键词" @keyup.enter="load" /></el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 140px">
          <el-option label="正常" value="0" /><el-option label="停用" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item><el-button icon="Search" @click="load">查询</el-button><el-button icon="Refresh" @click="resetQuery">重置</el-button></el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="treeRows" row-key="categoryId" default-expand-all :tree-props="{ children: 'children' }">
      <el-table-column prop="categoryName" label="分类名称" min-width="220" />
      <el-table-column prop="slug" label="标识" min-width="160" show-overflow-tooltip />
      <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
      <el-table-column label="内容样式" width="110" align="center">
        <template #default="{ row }">{{ row.articleStyle ? '文章' : '作品' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }"><el-tag :type="row.status === '0' ? 'success' : 'info'" effect="plain">{{ row.status === '0' ? '正常' : '停用' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="210" align="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEditor(row)" v-hasPermi="['crowlook:category:edit']">编辑</el-button>
          <el-button link type="primary" @click="openEditor(undefined, row.categoryId)" v-hasPermi="['crowlook:category:add']">新增子类</el-button>
          <el-button link type="danger" @click="remove(row)" v-hasPermi="['crowlook:category:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.open" :title="dialog.title" width="600px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="上级分类" prop="parentId">
          <el-tree-select v-model="form.parentId" :data="parentOptions" :props="{ label: 'categoryName', value: 'categoryId', children: 'children' }" check-strictly clearable placeholder="不选择则为顶级分类" style="width: 100%" />
        </el-form-item>
        <el-form-item label="分类名称" prop="categoryName"><el-input v-model="form.categoryName" maxlength="100" show-word-limit /></el-form-item>
        <el-form-item label="URL 标识"><el-input v-model="form.slug" placeholder="如 portrait" /></el-form-item>
        <el-form-item label="封面地址"><el-input v-model="form.coverUrl" placeholder="https://..." /></el-form-item>
        <el-form-item label="顶部视频"><el-input v-model="form.videoUrl" placeholder="可选，分类页顶部视频地址" /></el-form-item>
        <el-form-item label="视频封面"><el-input v-model="form.posterUrl" placeholder="可选，视频 Poster 地址" /></el-form-item>
        <el-form-item label="标题图片"><el-input v-model="form.headingImage" placeholder="可选，分类页艺术标题图片" /></el-form-item>
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" :max="999" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="状态"><el-radio-group v-model="form.status"><el-radio value="0">正常</el-radio><el-radio value="1">停用</el-radio></el-radio-group></el-form-item></el-col>
        </el-row>
        <el-form-item label="展示方式"><el-switch v-model="form.articleStyle" active-text="文章列表" inactive-text="作品画廊" /></el-form-item>
        <el-form-item label="用户端隐藏"><el-switch v-model="form.hidden" active-text="隐藏" inactive-text="显示" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialog.open = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup name="CrowlookCategory">
import { categoryApi } from '@/api/crowlook/content'

const { proxy } = getCurrentInstance()
const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const formRef = ref()
const query = reactive({ categoryName: '', status: '' })
const dialog = reactive({ open: false, title: '' })
const form = reactive({})
const rules = { categoryName: [{ required: true, message: '请输入分类名称', trigger: 'blur' }] }

function asTree(source) {
  const map = new Map(source.map(item => [item.categoryId, { ...item, children: [] }]))
  const roots = []
  map.forEach(item => {
    if (item.parentId && map.has(item.parentId)) map.get(item.parentId).children.push(item)
    else roots.push(item)
  })
  return roots
}

const treeRows = computed(() => asTree(rows.value))
const parentOptions = computed(() => [{ categoryId: 0, categoryName: '顶级分类', children: treeRows.value }])

async function load() {
  loading.value = true
  try { rows.value = (await categoryApi.list(query)).data || [] } finally { loading.value = false }
}

function resetForm(parentId = 0) {
  Object.keys(form).forEach(key => delete form[key])
  Object.assign(form, { categoryId: undefined, parentId, categoryName: '', slug: '', icon: '', coverUrl: '', videoUrl: '', posterUrl: '', headingImage: '', sortOrder: 0, status: '0', articleStyle: false, hidden: false, remark: '' })
  nextTick(() => formRef.value?.clearValidate())
}

async function openEditor(row, parentId = 0) {
  resetForm(parentId)
  if (row?.categoryId) Object.assign(form, (await categoryApi.get(row.categoryId)).data)
  dialog.title = row ? '编辑分类' : '新增分类'
  dialog.open = true
}

async function save() {
  await formRef.value.validate()
  saving.value = true
  try {
    form.categoryId ? await categoryApi.update(form) : await categoryApi.add(form)
    proxy.$modal.msgSuccess('分类已保存')
    dialog.open = false
    await load()
  } finally { saving.value = false }
}

async function remove(row) {
  await proxy.$modal.confirm(`确认删除分类“${row.categoryName}”吗？`)
  await categoryApi.remove(row.categoryId)
  proxy.$modal.msgSuccess('已删除')
  load()
}

function resetQuery() { query.categoryName = ''; query.status = ''; load() }
load()
</script>

<style scoped>
.page-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--el-border-color); }
.page-intro h2 { margin: 0 0 8px; font-size: 24px; }.page-intro p { margin: 0; color: var(--el-text-color-secondary); }
.filter-bar { padding: 16px 16px 0; margin-bottom: 16px; background: var(--el-fill-color-lighter); }
</style>
