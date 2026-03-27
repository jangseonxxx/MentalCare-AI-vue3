import axios from 'axios'
import { ElMessage } from 'element-plus'
//创建axios实例
const service = axios.create({
    baseURL: '/api',
    timeout: 5000
})
//创建请求拦截器，传入两个函数
service.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            // config.headers.Authorization='Bearer '+ token
            config.headers['token'] = token
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)
service.interceptors.response.use(
    (response) => {
        const { data, config } = response

        if (data.code === '200') {
            return data.data
        }
        else if (data.code === '-1') {////处理业务状态码，由后端自定义：登录超时
            //当前在非登录页
            if (!config.url?.includes('/login')) {
                ElMessage.error('登录过期，请重新登录')
                //清除登录信息
                localStorage.removeItem('token')
                //清除用户信息
                localStorage.removeItem('userInfo')
                //跳转
                window.location.href='/auth/login'
            }
            return Promise.reject('登录超时')
        }
        else {
            ElMessage.error(data.msg)
            return Promise.reject(data.msg)
        }
    },
    (error) => {
        return Promise.reject(error)
    }
)
export default service