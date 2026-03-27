<template>
    <div>
        <PageHead title="情绪日志"></PageHead>
        <TableSearch :formItem="formItem" @search="handleSearch"></TableSearch>
        <!-- 外部表格部分 -->
        <el-table :data="tableData" style="width:100%">
            <el-table-column label="ID" prop="id" width="80"></el-table-column>
            <el-table-column label="会话ID">
                <template #default="scope">
                    <div style="display: flex;align-items: center;">
                        <el-avatar>{{ scope.row.nickname }}</el-avatar>
                    </div>
                </template>
            </el-table-column>
            <el-table-column label="记录日期" prop="diaryDate" width="150"></el-table-column>
            <el-table-column label="情绪评分" width="200">
                <template #default="scope">
                    <el-rate v-model="scope.row.moodScore" :max="10" disabled></el-rate>
                </template>
            </el-table-column>
            <el-table-column label="生活指标" width="100">
                <template #default="scope">
                    <p>睡眠：{{ scope.row.sleepQuality ? scope.row.sleepQuality : '0' }}/5</p>
                    <p>压力：{{ scope.row.stressLevel ? scope.row.stressLevel : '0' }}/5</p>
                </template>
            </el-table-column>
            <el-table-column label="情绪触发因素" prop="emotionTriggers" width="200"></el-table-column>
            <el-table-column label="日记内容" prop="diaryContent"></el-table-column>
            <el-table-column label="操作" width="200">
                <template #default="scope">
                    <el-button text type="primary" @click="viewSessionDetail(scope.row)">详情</el-button>
                    <el-button text type="danger" @click="handleDelete(scope.row)">删除</el-button>

                </template>
            </el-table-column>
        </el-table>
        <el-pagination layout="prev,pager,next" :total="total_number" :page-size="pagination.size"
            style="margin-top: 25px;" @current-change="handleChange"></el-pagination>
        <!-- 弹窗详情部分 -->
        <el-dialog v-model="dialogVisible" title="情绪日志详情" width="70%" :close-on-click-modal="false">
            <div v-if="currentDetail" class="detail-content">
                <div class="detail-section">
                    <h4>用户信息</h4>
                    <el-descriptions :column="2" border>
                        <el-descriptions-item label="用户名">{{ currentDetail.username }}</el-descriptions-item>
                        <el-descriptions-item label="昵称">{{ currentDetail.nickname }}</el-descriptions-item>
                        <el-descriptions-item label="用户ID">{{ currentDetail.userId }}</el-descriptions-item>
                        <el-descriptions-item label="记录日期">{{ currentDetail.diaryDate }}</el-descriptions-item>
                    </el-descriptions>
                    <h4>情绪状态</h4>
                    <el-descriptions :column="2" border>
                        <el-descriptions-item label="情绪评分">
                            <el-rate v-model="currentDetail.moodScore" :max="10" disabled></el-rate>
                        </el-descriptions-item>
                        <el-descriptions-item label="主要情绪">
                            <el-tag :type="getEmotionTagType(currentDetail.dominantEmotion)">{{
                                currentDetail.dominantEmotion || '-' }}</el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="睡眠质量">{{ currentDetail.sleepQuality ? currentDetail.sleepQuality :
                            '0'
                        }}/5</el-descriptions-item>
                        <el-descriptions-item label="压力水平">{{ currentDetail.stressLevel ? currentDetail.stressLevel :
                            '0'
                        }}</el-descriptions-item>
                    </el-descriptions>
                    <h4>日记内容</h4>
                    <el-descriptions :column="1" border>
                        <el-descriptions-item label="情绪触发因素">{{ currentDetail.emotionTriggers || '-'
                            }}</el-descriptions-item>
                        <el-descriptions-item label="日记内容">{{ currentDetail.diaryContent || '-'
                        }}</el-descriptions-item>
                    </el-descriptions>
                    <h4>AI情绪分析结果</h4>
                    <div class="ai-analysis-result">
                        <el-descriptions :column="2" border>
                            <el-descriptions-item label="主要情绪">
                                <el-tag :type="getAiEmotionTagType(aiData.primaryEmotion)">{{ aiData.primaryEmotion ||
                                    '-'
                                }}</el-tag>
                            </el-descriptions-item>
                            <el-descriptions-item label="情绪强度">
                                <el-progress :percentage="aiData.emotionScore"
                                    :color="getEmotionScoreColor(aiData.emotionScore)" :stroke-width="8"></el-progress>
                            </el-descriptions-item>
                            <el-descriptions-item label="风险等级">
                                <el-tag :type="getAiEmotionTagType(aiData.riskLevel)">{{ aiData.riskLevel || '-'
                                }}</el-tag>
                            </el-descriptions-item>
                            <el-descriptions-item label="情绪性质">
                                <el-tag :type="aiData.isNagative ? 'danger' : 'success'">{{ aiData.isNagative ? '负面情绪' :
                                    '正面情绪'
                                }}</el-tag></el-descriptions-item>
                        </el-descriptions>
                        <div class="ai-suggestion-section">
                            <h5>专业建议</h5>
                            <div class="suggestion-content">{{ aiData.suggestion || '-' }}</div>
                        </div>
                        <div class="ai-risk-section">
                            <h5>风险描述</h5>
                            <div class="risk-content">{{ aiData.riskDescription || '-' }}</div>
                        </div>
                        <div class="ai-improvements-section">
                            <h5>改善建议</h5>
                            <ul class="improvements-list">
                                <li v-for="item in aiData.improvementsSuggestions" :key="item">{{ item }}</li>
                            </ul>
                        </div>
                    </div>
                    <h4>时间信息</h4>
                    <el-descriptions :column="2" border>
                        <el-descriptions-item label="记录时间">{{ currentDetail.createdAt }}</el-descriptions-item>
                        <el-descriptions-item label="更新时间">{{ currentDetail.updatedAt }}</el-descriptions-item>
                    </el-descriptions>
                </div>
            </div>
            <template #footer>
                <el-button @click="dialogVisible = false">关闭</el-button>
            </template>
        </el-dialog>
    </div>
</template>
<script setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import { deleteEmotional, getEmotionalPage } from '../../api/admin';
import PageHead from '../../components/Backend/Main/PageHead.vue';
import TableSearch from '../../components/Backend/Main/TableSearch.vue';
import { onMounted, reactive, ref } from 'vue'
const formItem = [
    { comp: 'input', prop: 'userId', label: '情绪', placeholder: '请输入用户ID' },
    {
        comp: 'select', prop: 'moodScore', label: '情绪评分', placeholder: '请选择评分范围', options: [{
            label: '低分(1-3)',
            value: '1-3'
        }, {
            label: '中分(4-6)',
            value: '4-6'
        }, {
            label: '高分(7-10)',
            value: '7-10'
        }]
    }
]
const tableData = ref([])
//分页参数
const pagination = reactive({
    currentPage: 1,
    size: 10
})
//后端返回的总条数
const total_number = ref(null)
const handleSearch = async (formData) => {
    const params = {
        ...pagination,
        ...formData
    }
    const { records, total } = await getEmotionalPage(params)
    tableData.value = records
    total_number.value = total
}
onMounted(() => {
    handleSearch()
})
const handleChange = (page) => {
    pagination.currentPage = page
    handleSearch()
}
//详情部分
//首先是一些映射关系
const getEmotionTagType = (emotion) => {
    const emotionTypes = {
        '快乐': 'success',
        '平静': 'info',
        '兴奋': 'warning',
        '愤怒': 'danger',
        '悲伤': 'info',
        '焦虑': 'warning'
    }
    return emotionTypes[emotion] || 'info'
}

const getAiEmotionTagType = (emotion) => {
    const emotionTagMap = {
        '快乐': 'success',
        '平静': 'success',
        '兴奋': 'warning',
        '满足': 'success',
        '愤怒': 'danger',
        '悲伤': 'info',
        '焦虑': 'warning',
        '恐惧': 'danger',
        '沮丧': 'info',
        '压力': 'warning'
    }
    return emotionTagMap[emotion] || 'info'
}

const getEmotionScoreColor = (score) => {
    if (score >= 80) return '#f56c6c'
    if (score >= 60) return '#e6a23c'
    if (score >= 40) return '#909399'
    return '#67c23a'
}

const getRiskLevelTagType = (riskLevel) => {
    const riskTagMap = {
        0: 'success',
        1: 'info',
        2: 'warning',
        3: 'danger'
    }
    return riskTagMap[riskLevel] || 'info'
}

const getRiskLevelText = (riskLevel) => {
    const riskTextMap = {
        0: '正常',
        1: '关注',
        2: '预警',
        3: '危机'
    }
    return riskTextMap[riskLevel] || '未知风险等级'
}
//一些交互
const dialogVisible = ref(false)
const currentDetail = ref(null)
const viewSessionDetail = (row) => {
    //这个地方详情的数据其实都在行里面，所以不需要再调接口获取更详细的了。
    currentDetail.value = row
    if (row.aiEmotionAnalysis) {
        aiData.value = JSON.parse(row.aiEmotionAnalysis)//处理一下这个字段
    }
    else aiData.value = {}
    dialogVisible.value = true
}
const aiData = ref(null)
const handleDelete=(row)=>{
    ElMessageBox.confirm('确认删除吗？',{
        confirmButtonText:'确定',
        cancelButtonText:'取消',
        type:'danger'
    }).then(()=>{
        deleteEmotional(row.id).then(()=>{
            handleSearch()
        })
    }).catch((error)=>{
        ElMessage(error)
    })
}
</script>

<style lang="scss" scoped>
.detail-content {
    .detail-section {
        margin-bottom: 24px;

        h4 {
            margin: 16px 0 16px 0;
            color: #303133;
            font-size: 16px;

            i {
                margin-right: 8px;
                color: #409eff;
            }
        }
    }
}

// AI分析相关样式
.ai-analysis-status {
    .ai-status-tag {
        margin-bottom: 4px;

        i {
            margin-right: 4px;
        }
    }

    .ai-analysis-preview {
        font-size: 11px;
        color: #909399;
        margin-top: 2px;
    }
}

.ai-analysis-result {

    .ai-keywords-section,
    .ai-suggestion-section,
    .ai-risk-section,
    .ai-improvements-section {
        margin-top: 16px;
        padding: 12px;
        background-color: #f8f9fa;
        border-radius: 4px;

        h5 {
            margin: 0 0 8px 0;
            color: #606266;
            font-size: 14px;
            font-weight: 600;

            i {
                margin-right: 6px;
                color: #909399;
            }
        }
    }

    .keywords-container {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;

        .keyword-tag {
            background-color: #e1f3d8;
            color: #67c23a;
            border-color: #b3d8a4;
        }
    }

    .suggestion-content,
    .risk-content {
        line-height: 1.6;
        color: #606266;
        background-color: white;
        padding: 8px;
        border-radius: 4px;
        border: 1px solid #ebeef5;
    }

    .improvement-list {
        margin: 0;
        padding-left: 20px;

        li {
            margin-bottom: 4px;
            color: #606266;
            line-height: 1.5;
        }
    }

    .ai-analysis-meta {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid #ebeef5;

        .analysis-time {
            margin: 0;
            font-size: 12px;
            color: #909399;

            i {
                margin-right: 4px;
            }
        }
    }

    .el-progress {
        .el-progress__text {
            font-size: 12px !important;
        }
    }
}
</style>