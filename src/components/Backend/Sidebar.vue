<template>
    <el-aside :width="store.isCollapse ? '64px' : '264px'">
        <el-menu class="menu" default-active="2" :collapse="store.isCollapse" :collapse-transition="false">
            <div class="brand">
                <el-image :src=robotImage style="width: 50px;height: 50px;margin-right: 10px;"></el-image>
                <div class="info-card" v-show="!store.isCollapse">
                    <h1 class="brand-title">心理健康AI助手</h1>
                    <p class="brand-subtitle">管理后台</p>
                </div>
            </div>
            <el-menu-item @click="selectMenu" v-for="item in router.options.routes[0].children" :index="item.path"
                :key="item.path">
                <el-icon>
                    <component :is="item.meta.icon"></component>
                </el-icon>
                <span>{{ item.meta.title }}</span>
            </el-menu-item>
        </el-menu>
    </el-aside>
</template>
<script setup>
import { useRouter } from 'vue-router';
import robotImage from '../../assets/images/robot.png'
import { useAdminStore } from '../../stores/admin';
const router = useRouter()
const store = useAdminStore()
const selectMenu = (e) => {
    const currentRoute = router.options.routes[0]
    const fullRoute = `${currentRoute.path}/${e.index}`
    router.push(fullRoute)
}
</script>
<style lang="scss" scoped>
.menu {
    height: 100%;

    .brand {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px;
        background-color: #fff;
        border-bottom: 1px solid #e5e7eb;

        .info-card {
            .brand-title {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 5px;
                color: #1f2937;
            }

            .sub-title {
                font-size: 14px;
                color: #6b7280;
            }
        }
    }
}
</style>