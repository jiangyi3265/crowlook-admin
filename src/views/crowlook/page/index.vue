<template>
  <div class="app-container page-studio">
    <header class="page-header">
      <div>
        <p class="eyebrow">SITE PAGES</p>
        <h2>页面装修</h2>
        <p>选择一个页面，像搭积木一样调整图片、视频、导航和作品列表。</p>
      </div>
      <div class="header-actions">
        <input ref="fileInput" class="visually-hidden" type="file" accept="application/json,.json" @change="importSnapshot" />
        <el-button icon="Upload" :loading="importing" @click="fileInput?.click()" v-hasPermi="['crowlook:page:import']">恢复内容备份</el-button>
        <el-button icon="Refresh" :loading="loading" @click="load">刷新</el-button>
      </div>
    </header>

    <el-skeleton v-if="loading && !rows.length" :rows="5" animated />
    <div v-else class="page-list">
      <article v-for="row in rows" :key="row.pageId" class="page-row">
        <div class="page-identity">
          <span class="page-icon"><el-icon><Monitor /></el-icon></span>
          <div>
            <div class="page-title-line">
              <h3>{{ row.pageTitle }}</h3>
              <el-tag :type="row.status === '0' ? 'success' : 'info'" effect="plain" size="small">
                {{ row.status === '0' ? '用户端可见' : '未发布' }}
              </el-tag>
            </div>
            <p>{{ pageRoleLabel(row.pageKey) }}</p>
          </div>
        </div>
        <div class="page-facts">
          <span><strong>{{ moduleCount(row.modulesJson) }}</strong>个内容模块</span>
          <span>更新于 {{ parseTime(row.updateTime || row.createTime) || '暂无记录' }}</span>
        </div>
        <div class="page-actions">
          <el-button icon="View" @click="openPreview(row)">查看用户端</el-button>
          <el-button type="primary" icon="Edit" @click="openEditor(row)" v-hasPermi="['crowlook:page:edit']">装修页面</el-button>
        </div>
      </article>
      <el-empty v-if="!rows.length" description="还没有可装修的页面" />
    </div>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />

    <el-drawer
      v-model="drawer.open"
      :title="drawer.title"
      size="min(1180px, 96vw)"
      append-to-body
      destroy-on-close
      :before-close="beforeClose"
      class="page-editor-drawer"
    >
      <div class="editor-head">
        <div class="page-name-field">
          <label for="page-title">页面名称</label>
          <el-input id="page-title" v-model="form.pageTitle" maxlength="80" @input="markDirty" />
        </div>
        <div class="publish-control">
          <span>
            <strong>{{ form.status === '0' ? '已发布' : '未发布' }}</strong>
            <small>{{ form.status === '0' ? '修改保存后用户端立即更新' : '用户端暂不显示' }}</small>
          </span>
          <el-switch v-model="published" @change="markDirty" />
        </div>
        <el-button icon="View" @click="openPreview(form)">预览当前页面</el-button>
      </div>

      <div class="composer">
        <section class="canvas-pane" aria-label="页面内容模块">
          <div class="pane-heading">
            <div>
              <h3>页面内容</h3>
              <p>拖动调整顺序，点击模块后在右侧修改。</p>
            </div>
            <el-dropdown trigger="click" @command="addModule">
              <el-button type="primary" plain icon="Plus">添加内容<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="image" icon="PictureFilled">图片模块</el-dropdown-item>
                  <el-dropdown-item command="video" icon="VideoCamera">视频模块</el-dropdown-item>
                  <el-dropdown-item command="nav" icon="Grid">快捷导航</el-dropdown-item>
                  <el-dropdown-item command="post" icon="Tickets">作品列表</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <draggable v-model="form.modules" item-key="id" handle=".drag-handle" class="module-list" @change="markDirty">
            <template #item="{ element, index }">
              <article
                class="module-row"
                :class="{ selected: selectedId === element.id, muted: element.status !== 'publish' }"
                @click="selectModule(element)"
              >
                <button class="drag-handle" type="button" title="拖动调整顺序" aria-label="拖动调整顺序">
                  <el-icon><Rank /></el-icon>
                </button>
                <div class="module-preview">
                  <el-image v-if="moduleThumbnail(element)" :src="moduleThumbnail(element)" fit="cover">
                    <template #error><span><el-icon><Picture /></el-icon></span></template>
                  </el-image>
                  <span v-else><el-icon><component :is="moduleIcon(element.type)" /></el-icon></span>
                </div>
                <div class="module-copy">
                  <span class="module-type">{{ moduleTypeLabel(element.type) }}</span>
                  <strong>{{ element.title || `未命名${moduleTypeLabel(element.type)}` }}</strong>
                  <small>{{ moduleSummary(element) }}</small>
                </div>
                <div class="module-actions" @click.stop>
                  <el-button link icon="Top" :disabled="index === 0" title="上移" @click="moveModule(element.id, -1)" />
                  <el-button link icon="Bottom" :disabled="index === form.modules.length - 1" title="下移" @click="moveModule(element.id, 1)" />
                  <el-dropdown trigger="click" @command="command => moduleCommand(command, element)">
                    <el-button link icon="MoreFilled" aria-label="更多操作" />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="duplicate" icon="CopyDocument">复制模块</el-dropdown-item>
                        <el-dropdown-item command="remove" icon="Delete" divided>删除模块</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </article>
            </template>
          </draggable>

          <button v-if="!form.modules?.length" type="button" class="empty-canvas" @click="addModule('image')">
            <el-icon><Plus /></el-icon>
            <strong>添加第一个内容模块</strong>
            <span>可以从图片、视频、导航或作品列表开始</span>
          </button>
        </section>

        <aside class="inspector-pane" aria-label="模块设置">
          <template v-if="selectedModule">
            <div class="inspector-heading">
              <div>
                <span>{{ moduleTypeLabel(selectedModule.type) }}</span>
                <h3>{{ selectedModule.title || '模块设置' }}</h3>
              </div>
              <el-switch
                :model-value="selectedModule.status === 'publish'"
                inline-prompt
                active-text="显示"
                inactive-text="隐藏"
                @update:model-value="toggleModule"
              />
            </div>

            <el-scrollbar class="inspector-scroll">
              <el-form label-position="top" class="inspector-form">
                <el-form-item label="模块名称">
                  <el-input v-model="selectedModule.title" maxlength="60" placeholder="例如：首页顶部视频" @input="markDirty" />
                  <span class="field-help">仅在后台用于识别，默认不显示在用户端。</span>
                </el-form-item>

                <template v-if="selectedModule.type === 'cube'">
                  <el-form-item label="内容类型">
                    <el-segmented v-model="mediaType" :options="mediaOptions" block @change="markDirty" />
                  </el-form-item>
                  <el-form-item :label="mediaType === 'video' ? '视频封面' : '图片'">
                    <image-upload
                      :model-value="selectedContent.image"
                      :limit="1"
                      :file-size="10"
                      :file-type="['png', 'jpg', 'jpeg', 'webp', 'gif']"
                      @update:model-value="value => updateSelectedContent('image', value)"
                    />
                    <span class="field-help">从电脑选择图片即可；支持 JPG、PNG、WebP，建议单张不超过 10MB。</span>
                    <el-collapse class="url-fallback">
                      <el-collapse-item title="已有网络图片？粘贴地址" name="image-url">
                        <el-input v-model="selectedContent.image" clearable placeholder="https://..." @input="markDirty" />
                      </el-collapse-item>
                    </el-collapse>
                  </el-form-item>
                  <el-form-item v-if="mediaType === 'video'" label="视频文件">
                    <file-upload
                      :model-value="managedUploadValue(selectedContent.video)"
                      :limit="1"
                      :file-size="10"
                      :file-type="['mp4', 'webm', 'mov', 'm4v']"
                      @update:model-value="value => updateSelectedContent('video', value)"
                    />
                    <span class="field-help">可直接上传 10MB 内的短视频；较大视频可在下方粘贴已有链接。</span>
                    <el-collapse class="url-fallback">
                      <el-collapse-item title="已有网络视频？粘贴地址" name="video-url">
                        <el-input v-model="selectedContent.video" clearable placeholder="https://.../video.mp4" @input="markDirty" />
                      </el-collapse-item>
                    </el-collapse>
                    <div class="inline-options">
                      <el-checkbox v-model="selectedContent.auto" @change="markDirty">自动播放</el-checkbox>
                      <el-checkbox v-model="selectedContent.loop" @change="markDirty">循环播放</el-checkbox>
                    </div>
                  </el-form-item>
                  <el-form-item label="点击后跳转">
                    <el-select :model-value="linkedCategoryId(selectedContent)" clearable filterable placeholder="不跳转" @update:model-value="setContentCategory">
                      <el-option v-for="item in categories" :key="item.categoryId" :label="item.categoryName" :value="item.categoryId" />
                    </el-select>
                    <span class="field-help">选择后会打开对应的作品分类。</span>
                  </el-form-item>
                </template>

                <template v-else-if="selectedModule.type === 'nav'">
                  <div class="nav-editor-heading">
                    <label>导航入口</label>
                    <el-button link type="primary" icon="Plus" @click="addNavItem">添加入口</el-button>
                  </div>
                  <div v-for="(item, index) in selectedModule.content" :key="index" class="nav-item-editor">
                    <div class="nav-item-title"><strong>入口 {{ index + 1 }}</strong><el-button link type="danger" icon="Delete" @click="removeNavItem(index)" /></div>
                    <el-form-item label="显示名称"><el-input v-model="item.title" placeholder="例如：定制案例" @input="markDirty" /></el-form-item>
                    <el-form-item label="导航图标">
                      <image-upload
                        :model-value="item.icon"
                        :limit="1"
                        :file-size="5"
                        :file-type="['png', 'jpg', 'jpeg', 'webp']"
                        @update:model-value="value => updateNavIcon(item, value)"
                      />
                      <el-collapse class="url-fallback">
                        <el-collapse-item title="已有网络图标？粘贴地址" :name="`nav-icon-${index}`">
                          <el-input v-model="item.icon" clearable placeholder="https://..." @input="markDirty" />
                        </el-collapse-item>
                      </el-collapse>
                    </el-form-item>
                    <el-form-item label="跳转到">
                      <el-select :model-value="linkedCategoryId(item)" clearable filterable placeholder="选择作品分类" @update:model-value="value => setNavCategory(item, value)">
                        <el-option v-for="category in categories" :key="category.categoryId" :label="category.categoryName" :value="category.categoryId" />
                      </el-select>
                    </el-form-item>
                  </div>
                </template>

                <template v-else-if="selectedModule.type === 'post'">
                  <el-form-item label="展示哪个分类的作品">
                    <el-select v-model="selectedModule.setting.cat" filterable placeholder="选择分类" @change="markDirty">
                      <el-option v-for="item in categories" :key="item.categoryId" :label="item.categoryName" :value="item.categoryId" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="每次展示">
                    <el-input-number v-model="selectedModule.setting.number" :min="1" :max="30" @change="markDirty" />
                    <span class="number-suffix">个作品</span>
                  </el-form-item>
                  <el-form-item label="排列方式">
                    <el-radio-group v-model="selectedModule.setting.style" @change="markDirty">
                      <el-radio-button value="per_2_h">双列画廊</el-radio-button>
                      <el-radio-button value="l">单列图文</el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                </template>

                <el-alert v-else type="warning" :closable="false" show-icon>
                  <template #title>这是旧版专用模块</template>
                  模块内容已完整保留，但不在客户端后台暴露技术配置。你仍可调整它的顺序、显示状态或复制模块。
                </el-alert>

                <el-collapse class="appearance-settings">
                  <el-collapse-item title="间距与展示设置" name="appearance">
                    <el-form-item label="模块下方留白">
                      <el-slider v-model="selectedModule.setting.margin" :min="0" :max="120" :step="10" show-input @change="markDirty" />
                    </el-form-item>
                    <el-form-item label="在用户端显示模块标题">
                      <el-switch v-model="selectedModule.setting.title_display" @change="markDirty" />
                    </el-form-item>
                  </el-collapse-item>
                </el-collapse>
              </el-form>
            </el-scrollbar>
          </template>

          <div v-else class="inspector-empty">
            <el-icon><EditPen /></el-icon>
            <strong>选择一个内容模块</strong>
            <span>在左侧点击后，这里会显示可编辑项。</span>
          </div>
        </aside>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <span :class="{ dirty }">{{ dirty ? '有尚未保存的修改' : '所有修改已保存' }}</span>
          <div>
            <el-button @click="requestClose">关闭</el-button>
            <el-button type="primary" :loading="saving" @click="save(false)">保存页面</el-button>
            <el-button type="success" :loading="saving" @click="save(true)">保存并查看用户端</el-button>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="CrowlookPage">
import draggable from 'vuedraggable'
import { categoryApi, pageApi, importContentSnapshot } from '@/api/crowlook/content'

const { proxy } = getCurrentInstance()
const loading = ref(false)
const saving = ref(false)
const importing = ref(false)
const dirty = ref(false)
const rows = ref([])
const categories = ref([])
const total = ref(0)
const fileInput = ref()
const selectedId = ref()
const query = reactive({ pageNum: 1, pageSize: 10 })
const drawer = reactive({ open: false, title: '' })
const form = reactive({ modules: [] })
const mediaOptions = [{ label: '图片', value: 'image' }, { label: '视频', value: 'video' }]

const published = computed({
  get: () => form.status === '0',
  set: value => { form.status = value ? '0' : '1' }
})
const selectedModule = computed(() => form.modules?.find(item => item.id === selectedId.value))
const selectedContent = computed(() => {
  if (!selectedModule.value) return {}
  if (!Array.isArray(selectedModule.value.content)) selectedModule.value.content = []
  if (!selectedModule.value.content[0]) selectedModule.value.content.push({ type: 'none', image: '', width: 750, height: 421 })
  return selectedModule.value.content[0]
})
const mediaType = computed({
  get: () => selectedContent.value.type === 'video' ? 'video' : 'image',
  set: value => {
    selectedContent.value.type = value === 'video' ? 'video' : 'none'
    if (value === 'video') {
      selectedContent.value.video ??= ''
      selectedContent.value.auto ??= false
      selectedContent.value.loop ??= false
    }
  }
})

function resetForm() {
  Object.keys(form).forEach(key => delete form[key])
  Object.assign(form, { pageId: undefined, pageKey: '', pageTitle: '', pageName: '', slug: '', modules: [], configJson: '{}', backgroundColor: '', backgroundImage: '', status: '1', sortOrder: 0, remark: '' })
  selectedId.value = undefined
  dirty.value = false
}

function normalizeModule(module) {
  const normalized = module && typeof module === 'object' ? module : {}
  normalized.id ??= Date.now() + Math.floor(Math.random() * 1000)
  normalized.type ||= 'cube'
  normalized.status ||= 'publish'
  normalized.title ||= ''
  normalized.excerpt ||= ''
  normalized.setting = { title_display: false, margin: 0, background: '', ...(normalized.setting || {}) }
  normalized.content = Array.isArray(normalized.content) ? normalized.content : []
  normalized.style ||= ''
  if (normalized.type === 'cube' && !normalized.content.length) normalized.content.push({ type: 'none', image: '', width: 750, height: 421 })
  if (normalized.type === 'nav') normalized.setting.per_row ||= 4
  if (normalized.type === 'post') Object.assign(normalized.setting, { number: normalized.setting.number || 6, style: normalized.setting.style || 'per_2_h' })
  return normalized
}

async function load() {
  loading.value = true
  try {
    const response = await pageApi.list(query)
    rows.value = response.rows || []
    total.value = response.total || 0
  } finally { loading.value = false }
}

async function loadCategories() {
  const response = await categoryApi.list({ status: '0' })
  categories.value = response.data || []
}

function moduleCount(value) {
  try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed.length : 0 } catch { return 0 }
}

function pageRoleLabel(key) {
  if (key === 'home') return '用户打开小程序或 H5 时首先看到的页面'
  if (key === 'discovery') return '用户浏览作品、定制案例与专题的入口'
  if (key === 'about') return '展示品牌动态与品牌内容'
  if (key?.startsWith('module_page:')) return '用于特定活动或主题内容的专题页'
  return '用户端内容页'
}

function moduleTypeLabel(type) {
  return ({ cube: '图文媒体', nav: '快捷导航', post: '作品列表' })[type] || '专用模块'
}

function moduleIcon(type) {
  return ({ cube: 'PictureFilled', nav: 'Grid', post: 'Tickets' })[type] || 'Box'
}

function moduleThumbnail(module) {
  return module?.content?.find(item => item?.image)?.image || ''
}

function moduleSummary(module) {
  if (module.type === 'nav') return `${module.content?.length || 0} 个导航入口`
  if (module.type === 'post') {
    const category = categories.value.find(item => item.categoryId === Number(module.setting?.cat))
    return `${category?.categoryName || '未选择分类'} · 展示 ${module.setting?.number || 6} 个作品`
  }
  if (module.type === 'cube') return module.content?.[0]?.type === 'video' ? '视频与封面' : '图片内容'
  return '已从旧版完整保留'
}

async function openEditor(row) {
  resetForm()
  const response = await pageApi.get(row.pageId)
  const data = response.data || {}
  let modules = []
  try { modules = JSON.parse(data.modulesJson || '[]') } catch { proxy.$modal.msgError('该页面的历史数据无法读取，请联系技术人员处理'); return }
  Object.assign(form, data, { modules: modules.map(normalizeModule) })
  selectedId.value = form.modules[0]?.id
  drawer.title = `装修页面：${form.pageTitle}`
  drawer.open = true
  nextTick(() => { dirty.value = false })
}

function createModule(kind) {
  const id = Date.now() + Math.floor(Math.random() * 1000)
  if (kind === 'nav') return normalizeModule({ id, type: 'nav', status: 'publish', title: '快捷导航', setting: { per_row: 4, margin: 20 }, content: [] })
  if (kind === 'post') return normalizeModule({ id, type: 'post', status: 'publish', title: '作品展示', setting: { cat: categories.value[0]?.categoryId, number: 6, style: 'per_2_h', margin: 40 }, content: [] })
  return normalizeModule({
    id,
    type: 'cube',
    status: 'publish',
    title: kind === 'video' ? '视频模块' : '图片模块',
    setting: { margin: 40, mode: 1, layout: '1-1', height: 421, full: false },
    content: [{ type: kind === 'video' ? 'video' : 'none', image: '', video: '', auto: false, loop: false, width: 750, height: 421 }]
  })
}

function addModule(kind) {
  const module = createModule(kind)
  form.modules.push(module)
  selectedId.value = module.id
  markDirty()
  nextTick(() => document.querySelector('.inspector-pane')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
}

function selectModule(module) {
  normalizeModule(module)
  selectedId.value = module.id
}

function moveModule(id, offset) {
  const index = form.modules.findIndex(item => item.id === id)
  const target = index + offset
  if (index < 0 || target < 0 || target >= form.modules.length) return
  const [module] = form.modules.splice(index, 1)
  form.modules.splice(target, 0, module)
  markDirty()
}

function moduleCommand(command, module) {
  if (command === 'duplicate') {
    const copy = JSON.parse(JSON.stringify(module))
    copy.id = Date.now() + Math.floor(Math.random() * 1000)
    copy.title = `${copy.title || moduleTypeLabel(copy.type)}（副本）`
    const index = form.modules.findIndex(item => item.id === module.id)
    form.modules.splice(index + 1, 0, normalizeModule(copy))
    selectedId.value = copy.id
    markDirty()
  } else if (command === 'remove') {
    removeModule(module)
  }
}

async function removeModule(module) {
  await proxy.$modal.confirm(`确认删除“${module.title || moduleTypeLabel(module.type)}”吗？`)
  const index = form.modules.findIndex(item => item.id === module.id)
  form.modules.splice(index, 1)
  selectedId.value = form.modules[Math.min(index, form.modules.length - 1)]?.id
  markDirty()
}

function toggleModule(value) {
  selectedModule.value.status = value ? 'publish' : 'draft'
  markDirty()
}

function linkedCategoryId(item) {
  const match = String(item?.path || '').match(/category_id=(\d+)/)
  return match ? Number(match[1]) : undefined
}

function setContentCategory(value) {
  if (!value) {
    selectedContent.value.path = ''
    selectedContent.value.page_key = ''
  } else {
    selectedContent.value.path = `/pages/articleList/articleList?category_id=${value}`
    selectedContent.value.page_key = 'category'
  }
  markDirty()
}

function setNavCategory(item, value) {
  item.path = value ? `/pages/articleList/articleList?category_id=${value}` : ''
  item.page_key = value ? 'category' : ''
  markDirty()
}

function addNavItem() {
  selectedModule.value.content.push({ type: '', page_key: '', path: '', icon: '', title: '新导航', color: '' })
  markDirty()
}

function removeNavItem(index) {
  selectedModule.value.content.splice(index, 1)
  markDirty()
}

function updateSelectedContent(field, value) {
  selectedContent.value[field] = value || ''
  markDirty()
}

function updateNavIcon(item, value) {
  item.icon = value || ''
  markDirty()
}

function managedUploadValue(value) {
  return /^https?:\/\//i.test(value || '') ? '' : (value || '')
}

function markDirty() { dirty.value = true }

function previewUrl(page) {
  const base = 'https://wuya.oksja.cn/#'
  if (page.pageKey === 'home') return `${base}/pages/index/index`
  if (page.pageKey === 'discovery') return `${base}/pages/works/works`
  if (page.pageKey === 'about') return `${base}/pages/brand/brand`
  if (page.pageKey?.startsWith('module_page:')) return `${base}/pages/modulePage/modulePage?id=${page.pageKey.split(':')[1]}`
  return 'https://wuya.oksja.cn/'
}

function openPreview(page) {
  window.open(previewUrl(page), '_blank', 'noopener,noreferrer')
}

async function save(previewAfterSave) {
  if (!form.pageTitle?.trim()) { proxy.$modal.msgWarning('请填写页面名称'); return }
  saving.value = true
  try {
    const payload = { ...form, modulesJson: JSON.stringify(form.modules) }
    delete payload.modules
    await pageApi.update(payload)
    dirty.value = false
    proxy.$modal.msgSuccess(form.status === '0' ? '已保存，用户端内容已更新' : '已保存为未发布页面')
    await load()
    if (previewAfterSave) openPreview(form)
  } finally { saving.value = false }
}

function beforeClose(done) {
  if (!dirty.value) { done(); return }
  proxy.$modal.confirm('还有修改未保存，确认关闭吗？').then(done).catch(() => {})
}

function requestClose() {
  if (!dirty.value) { drawer.open = false; return }
  proxy.$modal.confirm('还有修改未保存，确认关闭吗？').then(() => { dirty.value = false; drawer.open = false }).catch(() => {})
}

async function importSnapshot(event) {
  const file = event.target.files?.[0]
  if (!file) return
  importing.value = true
  try {
    const payload = JSON.parse(await file.text())
    const response = await importContentSnapshot(payload)
    const count = response.data || {}
    proxy.$modal.msgSuccess(`备份恢复完成：${count.pages || 0} 个页面、${count.posts || 0} 个作品`)
    await Promise.all([load(), loadCategories()])
  } catch (error) {
    if (error instanceof SyntaxError) proxy.$modal.msgError('该备份文件无法读取')
    else throw error
  } finally {
    importing.value = false
    event.target.value = ''
  }
}

Promise.all([load(), loadCategories()])
</script>

<style scoped lang="scss">
.page-studio { --studio-ink: #24231f; --studio-muted: #706d66; --studio-line: #dedbd3; --studio-paper: #f8f7f3; color: var(--studio-ink); }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; margin-bottom: 26px; padding-bottom: 22px; border-bottom: 1px solid var(--studio-line); }
.page-header h2 { margin: 0 0 8px; font-size: 26px; letter-spacing: -.02em; }
.page-header p:not(.eyebrow) { max-width: 680px; margin: 0; color: var(--studio-muted); line-height: 1.7; }
.eyebrow { margin: 0 0 8px; color: #817b70; font-size: 11px; font-weight: 700; letter-spacing: .14em; }
.header-actions, .page-actions { display: flex; gap: 10px; flex: 0 0 auto; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.page-list { border-top: 1px solid var(--studio-line); }
.page-row { display: grid; grid-template-columns: minmax(320px, 1.5fr) minmax(240px, .8fr) auto; align-items: center; gap: 28px; min-height: 112px; padding: 20px 6px; border-bottom: 1px solid var(--studio-line); }
.page-row:hover { background: #faf9f6; }
.page-identity { display: flex; align-items: center; gap: 16px; min-width: 0; }
.page-icon { display: grid; width: 48px; height: 48px; place-items: center; flex: 0 0 auto; color: #48443d; background: #ece9e1; border-radius: 12px; font-size: 20px; }
.page-title-line { display: flex; align-items: center; gap: 10px; }
.page-title-line h3 { margin: 0; font-size: 17px; }
.page-identity p { margin: 7px 0 0; overflow: hidden; color: var(--studio-muted); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.page-facts { display: flex; flex-direction: column; gap: 7px; color: var(--studio-muted); font-size: 13px; }
.page-facts strong { margin-right: 4px; color: var(--studio-ink); font-size: 16px; }
.editor-head { display: grid; grid-template-columns: minmax(240px, 1fr) auto auto; align-items: end; gap: 22px; padding-bottom: 20px; border-bottom: 1px solid var(--studio-line); }
.page-name-field label { display: block; margin-bottom: 8px; font-size: 13px; font-weight: 600; }
.publish-control { display: flex; align-items: center; gap: 14px; }
.publish-control span, .publish-control strong, .publish-control small { display: block; }
.publish-control small { margin-top: 4px; color: var(--studio-muted); font-size: 12px; }
.composer { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(340px, .7fr); min-height: calc(100vh - 250px); margin-top: 20px; border: 1px solid var(--studio-line); }
.canvas-pane { padding: 22px; background: var(--studio-paper); }
.pane-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
.pane-heading h3, .inspector-heading h3 { margin: 0; font-size: 17px; }
.pane-heading p { margin: 6px 0 0; color: var(--studio-muted); font-size: 13px; }
.module-list { display: flex; flex-direction: column; gap: 8px; }
.module-row { display: grid; grid-template-columns: 28px 76px minmax(0, 1fr) auto; align-items: center; gap: 13px; min-height: 92px; padding: 10px 12px 10px 8px; background: #fdfcf9; border: 1px solid var(--studio-line); border-radius: 10px; cursor: pointer; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.module-row:hover { border-color: #b9b4aa; transform: translateY(-1px); }
.module-row.selected { border-color: #5d594f; box-shadow: 0 0 0 2px rgba(93,89,79,.1); }
.module-row.muted { opacity: .62; }
.drag-handle { display: grid; width: 28px; height: 42px; place-items: center; padding: 0; color: #9a958c; background: transparent; border: 0; cursor: grab; }
.module-preview, .module-preview :deep(.el-image), .module-preview > span { width: 76px; height: 64px; }
.module-preview :deep(.el-image), .module-preview > span, .module-preview :deep(.el-image__error) { display: grid; place-items: center; border-radius: 7px; }
.module-preview > span, .module-preview :deep(.el-image__error) { color: #777269; background: #ebe8e0; font-size: 22px; }
.module-copy { min-width: 0; }
.module-type, .module-copy strong, .module-copy small { display: block; }
.module-type { margin-bottom: 4px; color: #8a857c; font-size: 10px; font-weight: 700; letter-spacing: .08em; }
.module-copy strong { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.module-copy small { margin-top: 6px; overflow: hidden; color: var(--studio-muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.module-actions { display: flex; align-items: center; }
.empty-canvas { display: flex; min-height: 260px; width: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 10px; color: var(--studio-muted); background: transparent; border: 1px dashed #bbb6ac; border-radius: 12px; cursor: pointer; }
.empty-canvas .el-icon { font-size: 28px; }.empty-canvas strong { color: var(--studio-ink); }.empty-canvas span { font-size: 13px; }
.inspector-pane { min-width: 0; padding: 22px; background: #fdfcf9; border-left: 1px solid var(--studio-line); }
.inspector-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 17px; border-bottom: 1px solid var(--studio-line); }
.inspector-heading span { display: block; margin-bottom: 5px; color: #847f75; font-size: 11px; font-weight: 700; letter-spacing: .08em; }
.inspector-scroll { height: calc(100vh - 340px); min-height: 440px; }
.inspector-form { padding: 20px 5px 20px 0; }
.field-help { display: block; margin-top: 7px; color: var(--studio-muted); font-size: 12px; line-height: 1.55; }
.url-fallback { width: 100%; margin-top: 10px; border-top: 0; border-bottom: 0; }
.url-fallback :deep(.el-collapse-item__header) { height: 34px; color: #777269; background: transparent; font-size: 12px; }
.url-fallback :deep(.el-collapse-item__wrap) { background: transparent; }
.url-fallback :deep(.el-collapse-item__content) { padding-bottom: 8px; }
.inline-options { display: flex; gap: 20px; margin-top: 8px; }
.nav-editor-heading, .nav-item-title { display: flex; align-items: center; justify-content: space-between; }
.nav-editor-heading { margin-bottom: 10px; font-size: 14px; font-weight: 600; }
.nav-item-editor { margin-bottom: 14px; padding: 14px; background: #f4f2ec; border: 1px solid #e2ded5; border-radius: 9px; }
.nav-item-title { margin-bottom: 12px; font-size: 13px; }
.nav-item-editor :deep(.el-form-item) { margin-bottom: 12px; }
.number-suffix { margin-left: 10px; color: var(--studio-muted); font-size: 13px; }
.appearance-settings { margin-top: 18px; }
.inspector-empty { display: flex; min-height: 430px; align-items: center; justify-content: center; flex-direction: column; gap: 10px; color: var(--studio-muted); text-align: center; }
.inspector-empty .el-icon { margin-bottom: 4px; font-size: 34px; }.inspector-empty strong { color: var(--studio-ink); }
.drawer-footer { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 20px; }
.drawer-footer > span { color: #7d786f; font-size: 13px; }.drawer-footer > span.dirty { color: #a05a2c; }
@media (max-width: 920px) {
  .page-row { grid-template-columns: 1fr auto; }.page-facts { grid-column: 1 / -1; flex-direction: row; }.composer { grid-template-columns: 1fr; }.inspector-pane { border-top: 1px solid var(--studio-line); border-left: 0; }.inspector-scroll { height: auto; }.editor-head { grid-template-columns: 1fr auto; }.editor-head > .el-button { grid-column: 1 / -1; justify-self: start; }
}
@media (max-width: 680px) {
  .page-header, .drawer-footer { align-items: flex-start; flex-direction: column; }.header-actions, .page-actions { width: 100%; flex-wrap: wrap; }.page-row { grid-template-columns: 1fr; }.page-actions { justify-content: flex-start; }.editor-head { grid-template-columns: 1fr; }.composer { border-right: 0; border-left: 0; }.canvas-pane, .inspector-pane { padding: 16px; }.module-row { grid-template-columns: 24px 58px minmax(0,1fr); }.module-preview, .module-preview :deep(.el-image), .module-preview > span { width: 58px; height: 54px; }.module-actions { grid-column: 2 / -1; justify-content: flex-end; }
}
</style>
