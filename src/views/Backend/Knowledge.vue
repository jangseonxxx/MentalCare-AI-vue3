<template>
    <div>
        <PageHead title="知识文章">
            <template #buttons>
                <el-button type="primary" @click="handleAdd">新增</el-button>
                <el-button type="primary">编辑</el-button>
            </template>
        </PageHead>
        <TableSearch :formItem="formItem" @search="handleSearch"></TableSearch>
        <!-- :data 告诉 el-table 要显示哪些数据。虽然我们用不着这个data，但是el-table内部会用这个data -->
        <el-table :data="tableData" style="width: 100%;margin-top: 25px;">
            <el-table-column label="文章标题" width="500" fixed="left">
                <template #default="scope">
                    <div style="display: flex;align-items: center;">
                        <el-icon>
                            <Timer></Timer>
                        </el-icon>
                        <!-- 这个 scope 不是你自己定义的，也不是 tableData 里的字段。它是 el-table-column 插槽自动提供的参数。 -->
                        <span>{{ scope.row.title }}</span>
                    </div>
                </template>
            </el-table-column>
            <el-table-column label="分类" width="200">
                <template #default="scope">
                    <div style="display: flex;align-items: center;">
                        <el-icon>
                            <Timer></Timer>
                        </el-icon>
                        <span>{{ scope.row.categoryName }}</span>
                    </div>
                </template>
            </el-table-column>
            <!-- 这几列不用插槽了，因为只用输出内容不用加上icon图标，所以用el-table-column自带的prop属性拿到数据，它会从el-table绑定的data里面拿到 -->
            <el-table-column prop="authorName" label="作者" width="150"></el-table-column>
            <el-table-column prop="readCount" label="阅读量" width="150"></el-table-column>
            <el-table-column prop="updatedAt" label="发布时间" width="250"></el-table-column>
            <el-table-column label="操作" width="250" fixed="right">
                <template #default="scope">
                    <el-button type="primary" text @click="()=>handleEdit(scope.row)">编辑</el-button>
                    <el-button v-if="scope.row.status === 0 || scope.row.status === 2" type="danger" text
                        @click="()=>handlePublish(scope.row)">发布</el-button>
                    <el-button v-if="scope.row.status === 1" type="warning" text @click="()=>handleUnpublish(scope.row)">下线</el-button>
                    <el-button type="danger" text @click="()=>handleDelete(scope.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination layout="prev,pager,next" :total="total" :page-size="pagination.size" style="margin-top: 25px;" :current-page="pagination.currentPage"
            @current-change="handleChange"></el-pagination>
        <ArticleDialog :dialogVisible="dialogVisible" @updateDialogVisible="updateDialogVisible"
            :categories="categories" @success="handleSuccess" :article="currentArticle"></ArticleDialog>
    </div>
</template>
<script setup>
import PageHead from '../../components/Backend/Main/PageHead.vue';
import TableSearch from '../../components/Backend/Main/TableSearch.vue';
import { articalPage, categoryTree, changeArticleStatus, deleteArticles, getArticleDetail } from '../../api/admin';
import { onMounted, reactive, ref } from 'vue';
import { Timer } from '@element-plus/icons-vue'
import ArticleDialog from '../../components/Backend/Main/ArticleDialog.vue';
import { ElMessageBox, ElMessage } from 'element-plus';
const categoryMap = reactive({})
const categories = ref([])
const tableData = ref([])
onMounted(async () => {
    //获取文章分类，为了填入下拉选择框中
    const data = await categoryTree()
    categories.value = data.map(item => {
        categoryMap[item.id] = item.categoryName
        return {
            label: item.categoryName,
            value: item.id
        }
    })
    formItem[1].options = categories.value
    //获取文章列表
    handleSearch()
})
const formItem = [
    { comp: 'input', prop: 'title', label: '文章标题', placeholder: '请输入文章标题' },
    {
        comp: 'select', prop: 'categoryId', label: '分类', placeholder: '请选择分类', options: []
    },
    {
        comp: 'select', prop: 'status', label: '状态', placeholder: '请选择状态', options: [{
            label: '草稿',
            value: '0'
        },
        {
            label: '已发布',
            value: '1'
        },
        {
            label: '已下线',
            value: '2'
        }
        ]
    },
]
//查询文章列表时候的分页参数，接口规定的
const pagination = reactive({
    currentPage: 1,//请求前端的第几页
    size: 10,//前端现在每页几条。后端就会根据第几页和每页几条计算出，它应该从哪里开始返回数据。
})
//定义一个总条数，用来接收后端返回的条数
const total = ref(0)
//请求搜索到的表格数据，formData是tableSearch组件触发该搜索时，传过来的表单数据，也就是搜索的字段。
const handleSearch = async (formData) => {
    const params = {
        ...pagination,
        ...formData
    }
    const { records, total: total_number } = await articalPage(params)//records是拿到的数据，total是一共有多少条
    tableData.value = records
    total.value = total_number
}

//分页改变时的回调，page是el-pagination传过来的新页码
const handleChange = (page) => {
    pagination.currentPage = page
    handleSearch()
}
//管理弹窗的展示与否
const dialogVisible = ref(false)
const updateDialogVisible = (val) => {
    dialogVisible.value = val
}

//处理提交了文章的回调：更新列表
const handleSuccess = () => {
    dialogVisible.value = false
    currentArticle.value = null
    pagination.currentPage = 1
    handleSearch()
}
//新增和编辑
const currentArticle = ref(null)//存当前行所对应的详细文章数据
const handleEdit = async (row) => {
    //row只是行数据的摘要，而需要通过id去哪详细的
    if (!row.id) return
    const res = await getArticleDetail(row.id)
    currentArticle.value = res
    updateDialogVisible(true)
}
const handleAdd = () => {
    currentArticle.value = null
    updateDialogVisible(true)
}
//删除
const handleDelete = (row) => {
    ElMessageBox.confirm(
        `确认删除文章${row.title}吗`,
        '确认',
        {
            confirmButtonText: '确认删除',
            cancelButtonText: '取消',
            type: 'warning'
        }
    ).then(async () => {
        await deleteArticles(row.id)
        ElMessage.success('删除成功')
        handleSearch()
    })
}
//发布
const handlePublish = (row) => {
    ElMessageBox.confirm(
        `确认发布文章${row.title}吗`,
        '确认',
        {
            confirmButtonText: '确认发布',
            cancelButtonText: '取消',
            type: 'info'
        }
    ).then(async () => {
        await changeArticleStatus(row.id, { status: 1 })
        ElMessage.success('发布成功')
        handleSearch()
    })
}
//下线
const handleUnpublish = (row) => {
    ElMessageBox.confirm(
        `确认下线文章${row.title}吗`,
        '确认',
        {
            confirmButtonText: '确认下线',
            cancelButtonText: '取消',
            type: 'warning'
        }
    ).then(async () => {
        await changeArticleStatus(row.id, { status: 2 })
        ElMessage.success('下线成功')
        handleSearch()
    })
}
</script>