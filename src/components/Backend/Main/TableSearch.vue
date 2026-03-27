<template>
    <el-form :model="formData" ref="formRef">
        <el-row :gutter="24">
            <el-col v-for="item in formItemWithCol" :key="item.prop" :label="item.label" :prop="item.prop" v-bind="item.col">
                <el-form-item >
                    <el-input v-if="item.comp === 'input'" v-model="formData[item.prop]"
                        :placeholder="item.placeholder"></el-input>
                    <el-select v-if="item.comp === 'select'" v-model="formData[item.prop]"
                        :placeholder="item.placeholder">
                        <el-option label="全部" value=""></el-option>
                        <el-option v-for="opt in item.options" :key='opt.value' :label="opt.label"
                            :value="opt.value"></el-option>
                    </el-select>
                </el-form-item>

            </el-col>
        </el-row>
        <el-row>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
        </el-row>
    </el-form>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';

const props = defineProps({
    formItem: {//formItem 是搜索表单的配置数组。下拉框有哪些选项之类的
        type: Array,
        default: () => []
    }
})
const formItemWithCol = computed(() => {
    const { formItem } = props
    formItem.forEach(item => {
        item.col = { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 }
    })
    return formItem
})
const emit = defineEmits(['search'])
const formRef = ref(null)
const formData = reactive({})//用来收集表单数据，存在这里
const handleSearch = () => {
    emit('search', formData)
}
const handleReset = () => {
    formRef.value.resetFields()
    handleSearch()
}
</script>

<style lang="scss" scoped></style>