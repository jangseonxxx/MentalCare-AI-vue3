<template>
    <div class="container">
        <div class="title">
            <div class="back-home">
                <el-icon>
                    <Back></Back>
                </el-icon>
                <span>返回首页</span>
            </div>
            <div class="title-text">
                <h2>登录您的账户</h2>
                <p>输入您的登录信息</p>
            </div>
        </div>
        <div class="form-container">
            <el-form ref="form" :model="formData" :rules="rules" label-position="top">
                <el-form-item label="用户名或邮箱" prop="username">
                    <el-input v-model="formData.username" size="large" placeholder="请输入用户名"></el-input>
                </el-form-item>
                <el-form-item label="密码" prop="password">
                    <el-input v-model="formData.password" size="large" placeholder="请输入密码" type="password"
                        show-password></el-input>
                </el-form-item>
                <el-button class="btn" size="large" type="primary" @click="submitForm(form)">登录</el-button>
            </el-form>
            <div class="footer">
                <p>还没有账户？<router-link to="/auth/register">去注册</router-link></p>
            </div>

        </div>
    </div>
</template>

<script setup>
import { Back } from '@element-plus/icons-vue'
import { reactive, ref } from 'vue';
import { login } from '../../api/admin';
import { useRouter } from 'vue-router';
const router=useRouter()
const formData = reactive({//和后端约定的
    username: '',
    password: ''
})
const rules = reactive({
    username: [
        { required: true, message: '请输入用户名', trigger: 'blur' }
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' }
    ]
})
const form = ref(null)
const submitForm = async (form) => {
    if (!form) return
    try {
        await form.validate()
        const data = await login(formData)
        if (!data.token) return console.error('登录失败')
        localStorage.setItem('token', data.token)
        localStorage.setItem('userInfo', JSON.stringify(data.userInfo))
        //根据用户角色决定跳转的路径
        if(data.userInfo.userType===2) router.push('/back/dashboard')
        else router.push('/')
    } catch (error) {
        console.error('登录错误：', error)
    }
}
</script>

<style lang="scss" scoped>
.container {
    width: 382px;

    .title {
        .back-home {
            margin-bottom: 20px;
            display: flex;
            align-items: center;
        }

        .title-text {
            margin-top: 100px;
            text-align: center;

            h2 {
                font-size: 36px;
                margin-bottom: 10px;
            }

            p {
                font-size: 18px;
                color: #6b7280;
            }
        }
    }
}

.form-container {
    margin-top: 30px;

    .btn {
        margin-top: 40px;
        width: 100%;
    }

    .footer {
        padding: 30px;
        text-align: center;
    }
}
</style>