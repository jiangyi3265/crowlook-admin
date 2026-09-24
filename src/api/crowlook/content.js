import request from '@/utils/request'

const resources = ['category', 'post', 'page', 'comment']

function resourceApi(resource) {
  if (!resources.includes(resource)) throw new Error(`Unsupported resource: ${resource}`)
  const base = `/crowlook/${resource}`
  return {
    list(params) {
      return request({ url: `${base}/list`, method: 'get', params })
    },
    get(id) {
      return request({ url: `${base}/${id}`, method: 'get' })
    },
    add(data) {
      return request({ url: base, method: 'post', data })
    },
    update(data) {
      return request({ url: base, method: 'put', data })
    },
    remove(ids) {
      return request({ url: `${base}/${ids}`, method: 'delete' })
    }
  }
}

export const categoryApi = resourceApi('category')
export const postApi = resourceApi('post')
export const pageApi = resourceApi('page')
export const commentApi = resourceApi('comment')

export function getContentOverview() {
  return request({ url: '/crowlook/page/overview', method: 'get' })
}

export function importContentSnapshot(data) {
  return request({
    url: '/crowlook/page/import',
    method: 'post',
    data,
    timeout: 120000,
    headers: { repeatSubmit: false }
  })
}

export function getSiteSettings() {
  return request({ url: '/crowlook/settings', method: 'get' })
}

export function updateSiteSettings(data) {
  return request({ url: '/crowlook/settings', method: 'put', data })
}
