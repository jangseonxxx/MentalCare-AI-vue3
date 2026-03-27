<template>
    <!-- Dialog 弹出一个对话框，用来管理文章详细内容相关 -->
    <el-dialog :title="isEdit ? '编辑文章' : '新增文章'" width="50%" :model-value="dialogVisible"
        @update:model-value="handleClose">
        <!-- model用来绑定数据，prop是指定这一项要对应哪个校验规则 -->
        <el-form :model="formData" :rules="rules" ref="formRef" label-position="right" label-width="80px">
            <el-form-item label="文章标题" prop="title">
                <el-input v-model="formData.title" placeholder="请输入文章标题" maxlength="200" show-word-limit
                    clearable></el-input>
            </el-form-item>
            <el-form-item label="文章分类" prop="categoryId">
                <el-select v-model="formData.categoryId">
                    <el-option v-for="item in categories" :key="item.value" :label="item.label"
                        :value="item.value"></el-option>
                </el-select>
            </el-form-item>
            <el-form-item label="文章摘要" prop="summary">
                <el-input v-model="formData.summary" placeholder="请输入文章摘要（可选）" maxlength="1500" show-word-limit
                    clearable type="textarea"></el-input>
            </el-form-item>
            <el-form-item label="标签" prop="tags">
                <el-select v-model="formData.tagArray" placeholder="请选择文章标签" multiple filterable allow-create
                    style="width:100%">
                    <el-option v-for="item in commonTags" :key="item" :label="item" :value="item"></el-option>
                </el-select>
            </el-form-item>
            <el-form-item label="封面图片">
                <div class="cover-upload">
                    <el-upload :before-upload="beforeUpload" :http-request="handleUploadRequest"
                        :show-file-list="false">
                        <!-- 以下内容是属于el-upload的默认插槽，用来定义上传的地方长什么样子。 -->
                        <div class="cover-placeholder" v-if="!imgUrl">
                            <p>点击上传封面</p>
                        </div>
                        <img class="cover-image" v-else :src="imgUrl"></img>
                    </el-upload>
                    <div v-if="imgUrl" class="cover-remove">
                        <el-button type="danger" @click="handleRemove">移除封面</el-button>
                    </div>
                </div>
            </el-form-item>
            <el-form-item label="文章内容" prop="content">
                <RichTextEditor v-model="formData.content" placeholder="请输入内容" :max-char-count="5000"
                    @change="handleContentChange" @created="handleEditorCreated" min-height="400px"></RichTextEditor>
            </el-form-item>
        </el-form>
        <!-- 预览部分 -->
        <div v-if="Preview">
            <h3>内容预览</h3>
            <div v-html="formData.content"></div>
        </div>
        <!-- 底部部分，对应的是el-dialog里的footer具名插槽.而上面的那些结构自动放在el-dialog的默认插槽中 -->
        <template #footer>
            <el-button @click='Preview = !Preview'>{{ Preview ? '隐藏预览' : '预览效果' }}</el-button>
            <el-button @click="handleClose">取消</el-button>
            <el-button @click="handleSubmit" :loading="loading">{{ isEdit ? '更新文章' : '创建文章' }}</el-button>
        </template>
    </el-dialog>

</template>
<script setup>
import { ElMessage, subMenuProps } from 'element-plus';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { createArticles, updateArticles, uploadFile } from '../../../api/admin';
import { fileBaseUrl } from '@/config'
import RichTextEditor from './RichTextEditor.vue';
const emit = defineEmits(['updateDialogVisible', 'success'])
const props = defineProps({
    dialogVisible: {
        type: Boolean,
        required: true
    },
    categories: {
        type: Array,
        default: () => []
    },
    article: {
        type: Object,
        default: null
    }
})
//监听待编辑的数据,也就是接收到父组件传过来的那一个article的数据
watch(() => props.article, (newVal) => {
    if (newVal) {
        nextTick(() => {
            // 先清理旧状态，避免上一次编辑/删除后的封面残留
            imgUrl.value = ''
            businessId.value = null
            //更新formdata值
            Object.assign(formData, newVal)
            //编辑文章时，文章id是不会变的，把当前文章的 id 记录下来，后续上传封面图片时，还是仍然上传到这个id对应的文章
            businessId.value = newVal.id
            //记录下新的图片绝对地址供前端使用
            imgUrl.value = newVal.coverImage ? fileBaseUrl + newVal.coverImage : ''
        })

    }
})
//判断当前是编辑还是创建
const isEdit = computed(() => !!props.article?.id)

//除了tagArray以外都是要发送给后端的字段。发送的时候要把tagArray处理成tags，然后把tagArray删了
const formData = reactive({
    "title": "",
    "content": "",
    "coverImage": "",
    "categoryId": 1,
    "summary": "",
    "tags": "",
    "tagArray": [],
    "id": ""
})
const commonTags = [
    '情绪管理', '焦虑', '抑郁', '压力', '睡眠',
    '冥想', '正念', '放松', '心理健康', '自我成长',
    '人际关系', '工作压力', '学习方法', '生活技巧'
]
//针对每一个el-form-item的prop去定义校验规则
const rules = reactive({
    title: [
        { required: true, message: '请输入文章标题', trigger: 'blur' },
        { max: 200, message: '文章标题最多200个字符', trigger: 'blur' }
    ],
    categoryId: [
        { required: true, message: '请选择文章分类', trigger: 'change' }
    ],
    content: [
        { required: true, message: '请输入文章内容', trigger: 'blur' },
        { max: 5000, message: '文章内容最多5000个字符', trigger: 'blur' }
    ]

})
//上传图片
const businessId = ref(null)
const imgUrl = ref('')//用来存上传图片成功之后，图片在后端存储的地址。
const beforeUpload = (file) => {//对上传的图片进行校验，返回为true时，才会触发下面真正的上传函数
    const isImage = file.type.startsWith('image/')
    const is5M = file.size / 1024 / 1024 < 5
    if (!isImage) {
        ElMessage.error('请选择图片文件')
        return false
    }
    if (!is5M) {
        ElMessage.error('请选择小于5M的图片')
        return false
    }
    return true
}
const handleUploadRequest = async ({ file }) => {//真正地上传，上传类型是form-data，一般的话是application/json
    businessId.value = crypto.randomUUID()
    const fileRes = await uploadFile(file, {
        businessId: businessId.value,//为每个文章生成一个随机的id，上传图片时就代表对应这篇文章的图片
    })
    //上传成功之后，后端会返回文件在后端里存储的地址，我们需要把这个返回的地址和后端服务器ip拼接起来，才能访问这个图片
    imgUrl.value = fileBaseUrl + fileRes.filePath//绝对路径，在前端展示用
    formData.coverImage = fileRes.filePath//相对路径，传给后端用

}
//移除图片
const handleRemove = () => {
    imgUrl.value = ''
    formData.coverImage = ''
}
//富文本处理
const handleContentChange = (data) => {
    formData.content = data.html
}
const handleEditorCreated = (editor) => {
    //editor是这个回调返回的一个富文本实例。
    //编辑的时候，要回填内容
    if (formData.content && editor) {
        nextTick(() => {
            editor.setHtml(formData.content)
        })

    }
}
//预览
const Preview = ref(false)
//取消
const handleClose = () => {
    formRef.value.resetFields()
    formData.tagArray = []
    imgUrl.value = ''
    businessId.value = null
    Preview.value = false
    emit('updateDialogVisible', false)
}
//提交：新增和编辑
const formRef = ref(null)//用来保存表单这个实例
const loading = ref(false)
const handleSubmit = async () => {
    //手动校验表单的值
    const valid = await formRef.value.validate()
    //如果校验没通过，直接返回
    if (!valid) return
    //如果校验通过了，调用接口上传表单数据

    try {
        loading.value = true
        const submitData = {
            ...formData,
            tags: formData.tagArray.join(','),
            id: businessId.value
        }
        delete submitData.tagArray
        if (!isEdit.value) {
            await createArticles(submitData)
            emit('success')//通知外部组件数据更新了
        }
        else {
            const res=await updateArticles(props.article.id, submitData)
            emit('success')
        }
    } catch (err) {
        ElMessage.error('提交失败')
    } finally {
        loading.value = false
    }
}
</script>

<style lang="scss" scoped>
.cover-placeholder {
    width: 200px;
    height: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #8b949e;
    background: #f6f8fa;
}

.cover-image {
    width: 200px;
    height: 120px;
    display: block;
}
</style>