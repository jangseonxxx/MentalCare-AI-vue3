
import {createRouter,createWebHistory} from 'vue-router'
import BackendLayout from '../components/Backend/BackendLayout.vue'
import dashboard from '../views/Backend/Dashboard.vue'
import knowledge from '../views/Backend/Knowledge.vue'
import consultations from '../views/Backend/Consultations.vue'
import emotional from '../views/Backend/Emotional.vue'
import { PieChart, ChatLineSquare, Message, View } from '@element-plus/icons-vue'
import AuthLayout from '../components/Backend/AuthLayout.vue'
import Login from '../views/Auth/Login.vue'
import Register from '../views/Auth/Register.vue'
import FrontendLayout from '../components/Frontend/FrontendLayout.vue'
const backendRoutes=[
    {
        path:'/back',
        redirect:'/back/dashboard',
        component:BackendLayout,
        children:[
            {
                path:'dashboard',
                component:dashboard,
                meta:{
                    title:'数据分析',
                    icon:PieChart
                }
            },
            {
                path:'knowledge',
                component:knowledge,
                meta:{
                    title:'知识文章',
                    icon:ChatLineSquare
                }
            },
            {
                path:'consultations',
                component:consultations,
                meta:{
                    title:'咨询记录',
                    icon:Message
                }
            },
            {
                path:'emotional',
                component:emotional,
                meta:{
                    title:'情感分析',
                    icon:View
                }
            },
        ]
    },
    {
        path:'/auth',
        component:AuthLayout,
        children:[
            {
                path:'login',
                component:Login,
                meta:{
                    title:'登录'
                }
            },
            {
                path:'register',
                component:Register,
                meta:{
                    title:'注册'
                }
            }
        ]
    }
]
const frontendRoutes=[
    {
        path:'/',
        component:FrontendLayout,
        children:[
            {
                path:''
            }
        ]
    }
]
const router=createRouter({
    history:createWebHistory(),
    routes:[...backendRoutes,...frontendRoutes]
})
//路由前置守卫
router.beforeEach((to,from,next)=>{
    const token=localStorage.getItem('token')
    if(token){
        const userType=JSON.parse(localStorage.getItem('userInfo')).userType
        //后台用户
        if(userType===2){
            //如果它正常访问后台页，直接放行
            if(to.path.startsWith('/back')){
                next()
            }
            //否则就跳转到默认页
            else{
                next('/back/dashboard')
            }
        }
        else if(userType===1){
            
        }
    }else{
        //如果访问后台页面，那必须登录
        if(to.path.startsWith('/back')){
            next('/auth/login')
        }
        //如果访问前台页面，那可以暂时先不用登录，直接放行
        else{
            next()
        }
    }
})
export default router