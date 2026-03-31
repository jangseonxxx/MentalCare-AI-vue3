<template>
    <div class="emotionDiary-container">
        <div class="header-section">
            <div class="header-content">
                <el-image :src="likeicon" style="width:60px;height: 60px;"></el-image>
                <h1>情绪日记</h1>
            </div>
        </div>
        <div class="content">
            <!-- 情绪评分 -->
            <div class="diary-card">
                <div class="title">今日情绪评分</div>
                <div class="section">
                    <p>今天整体情绪如何？</p>
                    <div class="rate">
                        <el-rate v-model="diaryFormData.moodScore" :texts="emotionStatus" show-texts :max="10"
                            size="large"></el-rate>
                    </div>
                </div>
            </div>
            <!-- 主要情绪 -->
            <div class="diary-card">
                <div class="title">今日情绪</div>
                <div class="emotion-grid" @click="selectEmotion">
                    <div class="emotion-card" v-for="(item, index) in emotionOptions" :key="item.name"
                        :data-index="index" :class="index === activeCard ? 'selected' : ''">
                        <el-image :src="item.url" style="width: 50px;height: 50px;"></el-image>
                        <div class="emotion-name">{{ item.name }}</div>
                    </div>
                </div>
            </div>
            <!-- 详细记录 -->
            <div class="diary-card">
                <div class="title">详细记录</div>
                <div class="detail-form">
                    <div class="form-group">
                        <div class="form-label">情绪触发因素</div>
                        <el-input type='textarea' :rows="3" maxLength="1000" show-word-limit
                            v-model="diaryFormData.emotionTriggers" placeholder="今天什么事情影响了您的情绪？"></el-input>
                    </div>
                    <div class="form-group">
                        <div class="form-label">今日感想</div>
                        <el-input type='textarea' :rows="5" maxLength="2000" show-word-limit
                            v-model="diaryFormData.diaryContent" placeholder="写下今天发生的想法吧！"></el-input>
                    </div>
                    <div class="life-indicators">
                        <div class="indicator-group">
                            <div class=form-label>睡眠质量</div>
                            <el-select v-model="diaryFormData.sleepQuality" placeholder="请选择">
                                <el-option label="很差" :value="1"></el-option>
                                <el-option label="较差" :value="2"></el-option>
                                <el-option label="一般" :value="3"></el-option>
                                <el-option label="较好" :value="4"></el-option>
                                <el-option label="很好" :value="5"></el-option>
                            </el-select>
                        </div>
                        <div class="indicator-group">
                            <div class="form-label">压力水平</div>
                            <el-select v-model="diaryFormData.stressLevel" placeholder="请选择">
                                <el-option label="很低" :value="1"></el-option>
                                <el-option label="较低" :value="2"></el-option>
                                <el-option label="中等" :value="3"></el-option>
                                <el-option label="较高" :value="4"></el-option>
                                <el-option label="很高" :value="5"></el-option>
                            </el-select>
                        </div>
                    </div>
                    <div class="action-buttons">
                        <el-button @click="reset">重置</el-button>
                        <el-button @click="submit" type="primary">提交</el-button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import likeicon from '@/assets/images/like.png'
import { reactive, ref } from 'vue'
import { dayjs, ElMessage } from 'element-plus';
import kaixin from '@/assets/images/开心.png'
import pingjing from '@/assets/images/平静.png'
import jiaolv from '@/assets/images/焦虑.png'
import beishang from '@/assets/images/悲伤.png'
import xingfen from '@/assets/images/兴奋.png'
import pibei from '@/assets/images/疲惫.png'
import jingya from '@/assets/images/惊讶.png'
import kunhuo from '@/assets/images/困惑.png'
import { submitDiary } from '../../api/user';

const emotionStatus = ['绝望崩溃', '消沉抑郁', '焦虑烦躁', '低落不悦', '平静淡然', '轻松惬意', '愉悦舒心', '欢欣满足', '兴奋欣喜', '极致幸福']
const emotionOptions = [{
    name: '开心',
    url: kaixin
}, {
    name: '平静',
    url: pingjing
}, {
    name: '焦虑',
    url: jiaolv
}, {
    name: '悲伤',
    url: beishang
}, {
    name: '兴奋',
    url: xingfen
}, {
    name: '疲惫',
    url: pibei
}, {
    name: '惊讶',
    url: jingya
}, {
    name: '困惑',
    url: kunhuo
},]
const diaryFormData = reactive({
    diaryDate: dayjs().format('YYYY-MM-DD'),
    moodScore: null,
    dominantEmotion: '',
    emotionTriggers: '',
    diaryContent: '',
    sleepQuality: null,
    stressLevel: null
})
const activeCard = ref(null)
const selectEmotion = (e) => {
    const card = e.target.closest('.emotion-card')
    activeCard.value = Number(card.dataset.index)
}
const reset = () => {
    Object.assign(diaryFormData, {
        diaryDate: dayjs().format('YYYY-MM-DD'),
        moodScore: null,
        dominantEmotion: '',
        emotionTriggers: '',
        diaryContent: '',
        sleepQuality: null,
        stressLevel: null
    })
}
const submit=()=>{
    if(!diaryFormData.moodScore){
        ElMessage.error('请选择情绪评分')
        return
    }
    submitDiary(diaryFormData).then(()=>{
        ElMessage.success('提交成功')
        reset()
    })

}
</script>

<style lang="scss" scoped>
.emotionDiary-container {
    background: linear-gradient(135deg, #fafbfc 0%, #f7f9fc 50%, #f2f6fa 100%);

    .header-section {
        background: linear-gradient(135deg, #7ED321 0%, #f5a623 100%);
        color: white;
        padding: 48px;

        .header-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }
    }

    .content {
        margin: 0 auto;
        width: 980px;
        padding: 20px;

        .diary-card {
            margin-bottom: 20px;
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);

            .title {
                margin-bottom: 20px;
                font-size: 25px;
                font-weight: 600;
                color: #374151
            }

            .section {
                margin-bottom: 20px;

                p {
                    font-size: 15px;
                    color: #6b7280;
                    margin-bottom: 15px;
                }
            }

            .emotion-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;

                .emotion-card {
                    padding: 15px;
                    border: 2px solid #e5e7e8;
                    border-radius: 15px;
                    text-align: center;
                    cursor: pointer;
                    background: #f9fafb;

                    .emotion-name {
                        margin-top: 10px;
                        padding: 0 75px;
                        color: #374151;
                    }

                    &.selected {
                        border-color: #7ed321;
                        background: #f0fdf4;
                        transform: translateY(-3px);
                    }
                }
            }

            .detail-form {
                .form-label {
                    margin: 10px 0;
                    color: #374151
                }

                .life-indicators {
                    display: flex;
                    gap: 20px;

                    .indicator-group {
                        flex: 1
                    }
                }

                .action-buttons {
                    margin-top: 40px;
                }
            }
        }
    }
}
</style>