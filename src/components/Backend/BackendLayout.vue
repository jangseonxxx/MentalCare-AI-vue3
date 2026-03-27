<template>
    <div class="backend-layout">
        <el-container class="main-container">
            <Sidebar></Sidebar>
            <el-container>
                <el-header>
                    <Navbar></Navbar>
                </el-header>
                <el-main class="main-content">
                    <router-view class="content-container"></router-view>
                </el-main>
            </el-container>
        </el-container>
    </div>
</template>
<script setup>
import Navbar from './Navbar.vue';
import Sidebar from './Sidebar.vue';
//当前组件对应的路由是back，是一个父级路由，它底下有几个子路由
//而当前组件的router-view就是用来放子路由的组件出口的。
//所以在navbar中跳转到的路由所对应的组件就会被放到这里来。
</script>
<style lang="scss" scoped>
.backend-layout {
    height: 100vh;
    .main-container{
        height: 100%;
        :deep(.el-header){
            height: 64px !important;
        }
        .content-container{//相当于routerview的一个背景
            padding:20px;
            background-color: #fff;
            min-height: calc(100% - 74px);
        }
    }
}
</style>
