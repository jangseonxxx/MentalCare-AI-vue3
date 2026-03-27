<template>
    <div class="navbar">
        <div class="flex-box">
            <el-button @click="handleCollapse">
                <el-icon>
                    <Expand></Expand>
                </el-icon>
            </el-button>
            <p class="page-title">{{ route.meta.title }}</p>
        </div>
        <div class="flex-box">
            <el-dropdown @command="handleCommand" width="150px">
                <div class="flex-box">
                    <el-avatar :src="avator"></el-avatar>
                    <p class="user-name">权志龙</p>
                    <el-icon>
                        <ArrowDown></ArrowDown>
                    </el-icon>
                </div>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>

    </div>
</template>
<script setup>
import { ArrowDown, Expand } from '@element-plus/icons-vue'
import avator from '../../assets/images/user.jpg'
import { useRoute, useRouter, } from 'vue-router';
import { useAdminStore } from '../../stores/admin';
import { ElMessageBox } from 'element-plus';
import { logOut } from '../../api/admin';
const route = useRoute()
const router = useRouter()
const store = useAdminStore()
const handleCommand = (command) => {
    if (command === 'logout') {
        ElMessageBox.confirm('确认退出登录吗？', '提示', {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: 'warning'
        }).then(() => {
            logOut().then(() => {
                localStorage.removeItem('token')
                localStorage.removeItem('userInfo')
                router.push('/auth/login')
            })
        })
    }

}
const handleCollapse = () => {
    store.toggleCollapse()
}
</script>
<style lang="scss" scoped>
.navbar {
    height: 64px;
    padding: 0 15px;
    background: white;
    box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .flex-box {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .page-title {
        margin-left: 20px;
        font-size: 26px;
        font-weight: bold;
        color: #1f2937
    }

    .user-name {
        margin: 0 8px;
    }
}
</style>