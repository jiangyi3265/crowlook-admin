<template>
  <div class="app-container settings-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">CLIENT EXPERIENCE</p>
        <h2>用户端设置</h2>
        <p>统一维护首页文案、客服入口、搜索推荐和门店信息，保存后 H5 与微信小程序使用同一份配置。</p>
      </div>
      <el-button icon="View" @click="preview">查看用户端</el-button>
    </header>

    <el-skeleton v-if="loading" :rows="10" animated />
    <el-form v-else ref="formRef" :model="form" :rules="rules" label-position="top" class="settings-form">
      <section class="setting-section">
        <div class="section-copy"><span>01</span><div><h3>品牌与首页</h3><p>这些内容会出现在首页、我的页面和作品详情。</p></div></div>
        <div class="section-fields">
          <el-row :gutter="18">
            <el-col :xs="24" :sm="12"><el-form-item label="品牌名称" prop="profile_name"><el-input v-model="form.profile_name" maxlength="40" placeholder="例如：crow look粉红乌鸦" /></el-form-item></el-col>
            <el-col :xs="24" :sm="12"><el-form-item label="品牌短句"><el-input v-model="form.site_slogan" maxlength="80" placeholder="一句让顾客记住你的话" /></el-form-item></el-col>
          </el-row>
          <el-form-item label="首页主视觉">
            <image-upload v-model="form.home_image" :limit="1" :file-size="10" :file-type="['png','jpg','jpeg','webp']" />
            <span class="field-help">建议使用竖版高清图片，H5 与小程序会自动读取。</span>
          </el-form-item>
          <el-row :gutter="18">
            <el-col :xs="24" :sm="12"><el-form-item label="首页图片说明"><el-input v-model="form.home_caption" maxlength="60" placeholder="例如：乌鸦 Crowlook · 杭州店" /></el-form-item></el-col>
            <el-col :xs="24" :sm="12"><el-form-item label="页脚版权文字"><el-input v-model="form.copyright_text" maxlength="80" /></el-form-item></el-col>
          </el-row>
          <el-row :gutter="18">
            <el-col :xs="24" :sm="12"><el-form-item label="首页中文主张"><el-input v-model="form.home_statement_cn" maxlength="60" /></el-form-item></el-col>
            <el-col :xs="24" :sm="12"><el-form-item label="首页英文主张"><el-input v-model="form.home_statement_en" maxlength="100" /></el-form-item></el-col>
          </el-row>
        </div>
      </section>

      <section class="setting-section">
        <div class="section-copy"><span>02</span><div><h3>客服与预约</h3><p>顾客咨询、关注品牌和复制预约入口时使用。</p></div></div>
        <div class="section-fields">
          <el-form-item label="客服微信号" prop="site_kf"><el-input v-model="form.site_kf" maxlength="80" placeholder="顾客点击后可复制" /></el-form-item>
          <el-row :gutter="24">
            <el-col :xs="24" :sm="12"><el-form-item label="客服二维码"><image-upload v-model="form.site_wxkf" :limit="1" :file-size="10" /></el-form-item></el-col>
            <el-col :xs="24" :sm="12"><el-form-item label="品牌关注二维码"><image-upload v-model="form.site_wx" :limit="1" :file-size="10" /></el-form-item></el-col>
          </el-row>
          <el-row :gutter="18">
            <el-col :xs="24" :sm="8"><el-form-item label="预约入口名称"><el-input v-model="booking.nam" maxlength="40" placeholder="定制拍摄" /></el-form-item></el-col>
            <el-col :xs="24" :sm="16"><el-form-item label="预约入口"><el-input v-model="booking.link" maxlength="500" placeholder="微信小程序短链或问卷链接" /></el-form-item></el-col>
          </el-row>
        </div>
      </section>

      <section class="setting-section">
        <div class="section-copy"><span>03</span><div><h3>搜索推荐</h3><p>顾客进入搜索页时可以直接点击的推荐词。</p></div></div>
        <div class="section-fields">
          <div class="tag-editor">
            <el-tag v-for="(tag, index) in form.site_tab" :key="`${tag}-${index}`" closable size="large" @close="removeTag(index)">{{ tag }}</el-tag>
            <el-input v-if="tagEditing" ref="tagInput" v-model="newTag" class="tag-input" maxlength="20" @keyup.enter="addTag" @blur="addTag" />
            <el-button v-else icon="Plus" @click="beginTag">添加推荐词</el-button>
          </div>
        </div>
      </section>

      <section class="setting-section stores-section">
        <div class="section-copy">
          <span>04</span><div><h3>门店信息</h3><p>用于详情页、门店页、地图导航和电话联系。</p></div>
          <el-button link type="primary" icon="Plus" @click="addStore">新增门店</el-button>
        </div>
        <div class="section-fields">
          <div v-for="(store, index) in form.site_add" :key="index" class="store-editor">
            <div class="store-heading"><strong>{{ store.nam || `门店 ${index + 1}` }}</strong><el-button link type="danger" icon="Delete" @click="removeStore(index)">删除</el-button></div>
            <el-row :gutter="18">
              <el-col :xs="24" :sm="12"><el-form-item label="门店名称"><el-input v-model="store.nam" placeholder="杭州店" /></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="联系电话"><el-input v-model="store.tel" placeholder="顾客可一键复制" /></el-form-item></el-col>
            </el-row>
            <el-form-item label="详细地址"><el-input v-model="store.add" placeholder="省市区、街道与门牌号" /></el-form-item>
            <el-row :gutter="18">
              <el-col :xs="24" :sm="12"><el-form-item label="地图纬度"><el-input v-model="store.lat" placeholder="例如 30.208635" /></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="地图经度"><el-input v-model="store.lng" placeholder="例如 120.226718" /></el-form-item></el-col>
            </el-row>
          </div>
          <el-empty v-if="!form.site_add.length" description="还没有门店，点击左侧新增门店" :image-size="72" />
        </div>
      </section>
    </el-form>

    <footer class="save-bar">
      <span>保存后，用户端下次打开或刷新时自动更新。</span>
      <el-button type="primary" size="large" :loading="saving" @click="save">保存全部设置</el-button>
    </footer>
  </div>
</template>

<script setup name="CrowlookSettings">
import { getSiteSettings, updateSiteSettings } from '@/api/crowlook/content'

const { proxy } = getCurrentInstance()
const loading = ref(true)
const saving = ref(false)
const formRef = ref()
const tagInput = ref()
const tagEditing = ref(false)
const newTag = ref('')
const form = reactive({})
const booking = computed(() => {
  if (!Array.isArray(form.site_form)) form.site_form = []
  if (!form.site_form[0]) form.site_form.push({ nam: '定制拍摄', link: '' })
  return form.site_form[0]
})
const rules = {
  profile_name: [{ required: true, message: '请输入品牌名称', trigger: 'blur' }],
  site_kf: [{ required: true, message: '请输入客服微信号', trigger: 'blur' }]
}

function defaults(data = {}) {
  return {
    profile_name: 'crow look粉红乌鸦', site_name: '', site_slogan: '因为我黑，所以一闭眼就会想起我',
    home_image: '', home_caption: '乌鸦 Crowlook · 杭州店', home_statement_cn: '不需要任何外界的审视',
    home_statement_en: 'no single injector unlocks this', copyright_text: '', site_kf: '', site_wxkf: '', site_wx: '',
    site_form: [{ nam: '定制拍摄', link: '' }], site_tab: [], site_add: [], share_base: 'https://wuya.oksja.cn',
    ...data,
    site_form: Array.isArray(data.site_form) && data.site_form.length ? data.site_form : [{ nam: '定制拍摄', link: '' }],
    site_tab: Array.isArray(data.site_tab) ? data.site_tab : [],
    site_add: Array.isArray(data.site_add) ? data.site_add : []
  }
}

async function load() {
  loading.value = true
  try { Object.assign(form, defaults((await getSiteSettings()).data || {})) } finally { loading.value = false }
}
function beginTag() { tagEditing.value = true; nextTick(() => tagInput.value?.focus()) }
function addTag() { const value = newTag.value.trim(); if (value && !form.site_tab.includes(value)) form.site_tab.push(value); newTag.value = ''; tagEditing.value = false }
function removeTag(index) { form.site_tab.splice(index, 1) }
function addStore() { form.site_add.push({ nam: '', add: '', tel: '', lat: '', lng: '' }) }
async function removeStore(index) { await proxy.$modal.confirm(`确认删除“${form.site_add[index].nam || '这个门店'}”吗？`); form.site_add.splice(index, 1) }
function preview() { window.open('https://wuya.oksja.cn/#/pages/index/index', '_blank', 'noopener,noreferrer') }
async function save() {
  await formRef.value.validate()
  saving.value = true
  try { await updateSiteSettings(form); proxy.$modal.msgSuccess('用户端设置已保存') } finally { saving.value = false }
}
load()
</script>

<style scoped lang="scss">
.settings-page { --line: #dedbd3; --paper: #f7f5f0; max-width: 1240px; margin: 0 auto; padding-bottom: 100px; color: #25231f; }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
.page-header h2 { margin: 0 0 8px; font-size: 26px; }.page-header p:not(.eyebrow) { max-width: 700px; margin: 0; color: #6d685f; line-height: 1.7; }
.eyebrow { margin: 0 0 8px; color: #817b70; font-size: 11px; font-weight: 700; letter-spacing: .14em; }
.setting-section { display: grid; grid-template-columns: minmax(220px, .72fr) minmax(0, 1.8fr); gap: 48px; padding: 34px 0; border-bottom: 1px solid var(--line); }
.section-copy { display: grid; grid-template-columns: 34px minmax(0,1fr); align-content: start; gap: 8px; }.section-copy > span { color: #aaa49a; font-size: 12px; font-variant-numeric: tabular-nums; }
.section-copy h3 { margin: 0 0 8px; font-size: 18px; }.section-copy p { margin: 0; color: #777169; font-size: 13px; line-height: 1.6; }.section-copy .el-button { grid-column: 2; justify-self: start; margin-top: 12px; }
.section-fields { min-width: 0; }.field-help { display: block; margin-top: 8px; color: #777169; font-size: 12px; }
.tag-editor { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; min-height: 40px; }.tag-input { width: 160px; }
.store-editor { margin-bottom: 16px; padding: 22px 22px 4px; background: var(--paper); border: 1px solid var(--line); border-radius: 10px; }.store-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.save-bar { position: fixed; right: 28px; bottom: 24px; z-index: 20; display: flex; align-items: center; gap: 22px; padding: 12px 14px 12px 20px; color: #d8d3ca; background: #24231f; box-shadow: 0 12px 32px rgba(32,30,26,.18); }.save-bar span { font-size: 13px; }
@media (max-width: 760px) { .page-header { align-items: flex-start; flex-direction: column; }.setting-section { grid-template-columns: 1fr; gap: 22px; }.save-bar { left: 16px; right: 16px; bottom: 16px; justify-content: space-between; }.save-bar span { display: none; } }
</style>
