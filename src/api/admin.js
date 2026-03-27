import service from "../utils/request";
export const login = (data) => {
    return service({
        method: 'post',
        url: '/user/login',
        data: data
    })
}
export const categoryTree = () => {
    return service.get('/knowledge/category/tree')

}
export const articalPage = (params) => {
    return service({
        method: 'get',
        params: params,
        url: '/knowledge/article/page'
    })

}
export const uploadFile = (file, businessInfo) => {
    const formData = new FormData()
    //以下的字段都是和后端约定好的
    formData.append('file', file)
    formData.append('businessType', 'ARTICLE')
    formData.append('businessId', businessInfo.businessId)
    formData.append('businessField', 'cover')
    return service.post('/file/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })

}
export function createArticles(data) {
    return service.post('/knowledge/article', data)
}
export function getArticleDetail(id) {
    return service.get(`/knowledge/article/${id}`)
}
export function updateArticles(id, data) {
    return service.put(`/knowledge/article/${id}`, data)
}
export function changeArticleStatus(id, obj) {
    return service.put(`/knowledge/article/${id}/status`, obj)
}
export function deleteArticles(id) {
    return service.delete(`/knowledge/article/${id}`)
}
export function getConsultationPage(params) {
    return service.get('/psychological-chat/sessions', { params })
}
export function getSesstionDetail(sessionId) {
    return service.get(`/psychological-chat/sessions/${sessionId}/messages`)
}
export function getEmotionalPage(params) {
    return service.get('/emotion-diary/admin/page', { params })
}
export function deleteEmotional(id){
    return service.delete(`/emotion-diary/admin/${id}`)
}
export function getAnalyticsOverview(){
    return service.get('/data-analytics/overview')
}
export function logOut(){
    return service.post('/user/logout')
}