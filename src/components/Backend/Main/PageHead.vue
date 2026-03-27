<template>
    <div class="page-head">
        <p class="page-title">{{props.title}}</p>
        <!-- 有的页面有按钮，有的没有，用插槽的语法。传进来的内容替换插槽的位置 -->
        <div class="action-btn">
            <slot name="buttons"></slot>
        </div>
    </div>
</template>
<script setup>
const props=defineProps({
    title:{
        type:String,
        default:'页面标题'
    }
})
</script>
<style lang="scss" scoped>
.page-head{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    .page-title{
        font-size: 24px;
        color: #2d3748;
    }
}
</style>