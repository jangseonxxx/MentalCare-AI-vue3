<template>
    <div class="dashboard-container">
        <!-- 顶部四个小卡片 -->
        <el-row :gutter="20">
            <el-col :span="6">
                <el-card v-if="data.systemOverview">
                    <div class="card-content">
                        <div class="avatar users">
                            <el-image :src="iconUrl1" style="width: 40px;height: 40px;"></el-image>
                        </div>
                        <div class="info">
                            <p class="title">总用户数</p>
                            <p class="number">{{ data.systemOverview.totalUsers }}</p>
                            <p class="subtitle-title">活跃用户：{{ data.systemOverview.activeUsers }}</p>
                        </div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card v-if="data.systemOverview">
                    <div class="card-content">
                        <div class="avatar like">
                            <el-image :src="iconUrl2" style="width: 40px;height: 40px;"></el-image>
                        </div>
                        <div class="info">
                            <p class="title">情绪日志</p>
                            <p class="number">{{ data.systemOverview.totalDiaries }}</p>
                            <p class="subtitle-title">今日新增：{{ data.systemOverview.todayNewDiaries }}</p>
                        </div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card v-if="data.systemOverview">
                    <div class="card-content">
                        <div class="avatar comments">
                            <el-image :src="iconUrl3" style="width: 40px;height: 40px;"></el-image>
                        </div>
                        <div class="info">
                            <p class="title">咨询会话</p>
                            <p class="number">{{ data.systemOverview.totalSessions }}</p>
                            <p class="subtitle-title">今日新增：{{ data.systemOverview.todayNewSessions }}</p>
                        </div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card v-if="data.systemOverview">
                    <div class="card-content">
                        <div class="avatar smile">
                            <el-image :src="iconUrl4" style="width: 40px;height: 40px;"></el-image>
                        </div>
                        <div class="info">
                            <p class="title">平均情绪</p>
                            <p class="number">{{ data.systemOverview.avgMoodScore }}/10</p>
                            <p class="subtitle-title">情绪健康指数</p>
                        </div>
                    </div>
                </el-card>
            </el-col>
        </el-row>
        <!-- 两个趋势图 -->
        <el-row :gutter="20" style="margin-top: 20px;">
            <!-- 情绪趋势分析 -->
            <el-col :span="12">
                <el-card>
                    <!-- 对应头部的插槽 ：写进 el-card 的头部插槽里，才能继承 el-card 头部区域的结构和默认样式-->
                    <template #header>
                        <div class="card-header">情绪趋势分析</div>
                    </template>
                    <!-- 对应默认的插槽 -->
                    <div class="chart-content">
                        <div ref="emotionChartRef" style="width: 100%; height: 200px;"></div>
                    </div>
                </el-card>
            </el-col>
            <!-- 咨询会话统计 -->
            <el-col :span="12">
                <el-card v-if="data.consultationStats">
                    <!-- 对应头部的插槽 ：写进 el-card 的头部插槽里，才能继承 el-card 头部区域的结构和默认样式-->
                    <template #header>
                        <div class="card-header">咨询会话统计</div>
                    </template>
                    <!-- 对应默认的插槽 -->
                    <div class="chart-content">
                        <div class="consultation-stats">
                            <div class="stat-item">
                                <div class="stat-label">总会话数</div>
                                <div class="stat-value">{{ data.consultationStats.totalSessions }}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">平均时长</div>
                                <div class="stat-value">{{ data.consultationStats.avgDurationMinutes }}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">活跃用户</div>
                                <div class="stat-value">{{ data.systemOverview.activeUsers }}</div>
                            </div>
                        </div>
                        <div ref="consultationChartRef" style="width: 100%; height: 260px;"></div>
                    </div>
                </el-card>
            </el-col>
        </el-row>
        <!-- 下面的趋势图 -->
        <el-row style="margin-top: 20px;">
            <el-card style="width: 100%;">
                <template #header>
                    <div class="card-header">用户活跃度趋势</div>
                </template>
                <div class="chart-content">
                    <div ref="userActivityChartRef" style="width: 100%;height: 300px;"></div>
                </div>
            </el-card>
        </el-row>
    </div>
</template>
<script setup>
import { nextTick, onMounted } from 'vue';
import { getAnalyticsOverview } from '../../api/admin';
import { ref } from 'vue'
import iconUrl1 from '@/assets/images/users.png'
import iconUrl2 from '@/assets/images/like.png'
import iconUrl3 from '@/assets/images/comments.png'
import iconUrl4 from '@/assets/images/smile.png'
import * as echarts from 'echarts'
const data = ref({})
onMounted(() => {
    getAnalyticsOverview().then((res) => {
        data.value = res
        nextTick(() => {
            initCharts()
        })
    })
})
//情绪趋势echart图相关
const emotionChartRef = ref(null)
let emotionChart = null
const initEmotionChart = () => {
    //dom节点不存在，挂载不了
    if (!emotionChartRef.value) return
    //销毁现有的图表
    if (emotionChart) {
        emotionChart.dispose()
    }
    //创建一个新实例
    emotionChart = echarts.init(emotionChartRef.value)
    //获取情绪趋势图的数据
    const trendData = data.value.emotionTrend
    //配置
    const option = {
        grid: {
            top: 90,
            left: 40,
            right: 40,
            bottom: 0,
            containLabel: true
        },
        title: {
            text: '情绪趋势分析',
            textStyle: {
                color: '#2d3436',
                fontSize: 16,
                fontWeight: 600
            },
            left: 'center',//标题距离左边的位置
            top: 10
        },
        tooltip: {//鼠标移到图上显示的具体数据框
            trigger: 'axis',//触发类型
            borderColor: '#fab1a0',
            borderWidth: 1,
            textStyle: {
                color: '#2d3436',
            }
        },
        legend: {//说明有哪几条线，各代表什么
            data: ['平均情绪评分', '情绪记录数量'],
            top: 40
        },
        xAxis: {//横坐标，把每一项数据的date项拿出来作为横坐标
            data: trendData.map(item => item.date),
            axisLine: {
                lineStyle: {
                    color: '#2d3436',
                }
            },
            type: 'category'
        },
        yAxis: [{
            type: 'value',
            name: '平均情绪评分',
            position: 'left',
            axisLine: {
                lineStyle: {
                    color: '#2d3436',
                }
            },

        }, {
            type: 'value',
            name: '情绪记录数量',
            position: 'right',
            axisLine: {
                lineStyle: {
                    color: '#2d3436',
                }
            },
        }],
        series: [{//两条线所对应的y轴数据
            name: '平均情绪评分',
            type: 'line',//折线
            data: trendData.map(item => item.avgMoodScore),
            smooth: true,//平滑
            lineStyle: {
                width: 3,
                color: '#ff7675'
            },
            itemStyle: {
                color: '#ff7675'
            }
        }, {
            name: '情绪记录数量',
            type: 'line',//折线
            data: trendData.map(item => item.recordCount),
            smooth: true,//平滑
            lineStyle: {
                width: 3,
                color: '#0984e3'
            },
            itemStyle: {
                color: '#0984e3'
            }
        }]
    }
    emotionChart.setOption(option)
}
//咨询会话chart图相关
const consultationChartRef = ref(null)
let consultationChart = null
const initConsultationChart = () => {
    //dom节点不存在，挂载不了
    if (!consultationChartRef.value) return
    //销毁现有的图表
    if (consultationChart) {
        consultationChart.dispose()
    }
    //创建一个新实例
    consultationChart = echarts.init(consultationChartRef.value)
    //获取咨询会话图的数据
    const consultData = data.value.consultationStats.dailyTrend
    //配置
    const option = {
        title: {
            text: '咨询活动统计',
            textStyle: {
                fontSize: 16,
                fontWeight: 600,
                color: '#2d3436'
            },
            left: 'center',
            top: 10
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#fab1a0',
            borderWidth: 1,
            textStyle: {
                color: '#2d3436'
            }
        },
        legend: {
            data: ['会话数量', '参与用户数'],
            top: 40,
            textStyle: {
                color: '#636e72'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: 80,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: consultData.map(item => item.date),
            axisLine: {
                lineStyle: {
                    color: 'rgba(244, 162, 97, 0.3)'
                }
            },
            axisLabel: {
                color: '#636e72'
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: '#636e72'
            },
            axisLine: {
                lineStyle: {
                    color: 'rgba(244, 162, 97, 0.3)'
                }
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(244, 162, 97, 0.1)'
                }
            }
        },
        series: [
            {
                name: '会话数量',
                type: 'bar',
                data: consultData.map(item => item.sessionCount),
                itemStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: '#74b9ff' },
                            { offset: 1, color: '#0984e3' }
                        ]
                    }
                },
                barWidth: '40%'
            },
            {
                name: '参与用户数',
                type: 'bar',
                data: consultData.map(item => item.userCount),
                itemStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: '#fdcb6e' },
                            { offset: 1, color: '#f39c12' }
                        ]
                    }
                },
                barWidth: '40%'
            }
        ]
    }
    consultationChart.setOption(option)
}
//用户活跃度chart图相关
const userActivityChartRef = ref(null)
let userActivityChart = null
const initUserActivityChart = () => {
    //dom节点不存在，挂载不了
    if (!userActivityChartRef.value) return
    //销毁现有的图表
    if (userActivityChart) {
        userActivityChart.dispose()
    }
    //创建一个新实例
    userActivityChart = echarts.init(userActivityChartRef.value)
    //获取咨询会话图的数据
    const activityData = data.value.userActivity
    //配置
    const option = {
        title: {
            text: '用户活跃度趋势',
            textStyle: {
                fontSize: 16,
                fontWeight: 600,
                color: '#2d3436'
            },
            left: 'center',
            top: 10
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#fab1a0',
            borderWidth: 1,
            textStyle: {
                color: '#2d3436'
            }
        },
        legend: {
            data: ['活跃用户', '新增用户', '日记用户', '咨询用户'],
            top: 40,
            textStyle: {
                color: '#636e72'
            }
        },
        grid: {
            left: '3%',
            right: '2%',
            bottom: '3%',
            top: 80,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: activityData.map(item => item.date),
            axisLine: {
                lineStyle: {
                    color: 'rgba(244, 162, 97, 0.3)'
                }
            },
            axisLabel: {
                color: '#636e72'
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: '#636e72'
            },
            axisLine: {
                lineStyle: {
                    color: 'rgba(244, 162, 97, 0.3)'
                }
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(244, 162, 97, 0.1)'
                }
            }
        },
        series: [
            {
                name: '活跃用户',
                type: 'line',
                data: activityData.map(item => item.activeUsers),
                smooth: true,
                lineStyle: {
                    width: 3,
                    color: '#a29bfe'
                },
                itemStyle: {
                    color: '#a29bfe'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(162, 155, 254, 0.4)' },
                            { offset: 1, color: 'rgba(162, 155, 254, 0.1)' }
                        ]
                    }
                }
            },
            {
                name: '新增用户',
                type: 'line',
                data: activityData.map(item => item.newUsers),
                smooth: true,
                lineStyle: {
                    width: 3,
                    color: '#fdcb6e'
                },
                itemStyle: {
                    color: '#fdcb6e'
                }
            },
            {
                name: '日记用户',
                type: 'line',
                data: activityData.map(item => item.diaryUsers),
                smooth: true,
                lineStyle: {
                    width: 3,
                    color: '#00b894'
                },
                itemStyle: {
                    color: '#00b894'
                }
            },
            {
                name: '咨询用户',
                type: 'line',
                data: activityData.map(item => item.consultationUsers),
                smooth: true,
                lineStyle: {
                    width: 3,
                    color: '#fab1a0'
                },
                itemStyle: {
                    color: '#fab1a0'
                }
            }
        ]
    }
    userActivityChart.setOption(option)
}
//初始化所有的echart
const initCharts = () => {
    initEmotionChart()
    initConsultationChart()
    initUserActivityChart()
}

</script>
<style lang="scss" scoped>
.dashboard-container {
    .card-content {
        display: flex;
        align-items: center;

        .avatar {
            margin-right: 12px;
            width: 60px;
            height: 60px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;

            &.users {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }

            &.like {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }

            &.comments {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            }

            &.smile {
                background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            }
        }

        .info {
            .title {
                font-size: 14px;
                color: #7f8c8d;
                margin-bottom: 4px;
            }

            .number {
                font-size: 24px;
                font-weight: 700;
                color: #2c3e50;
                margin-bottom: 4px
            }

            .subtitle-title {
                font-size: 12px;
                color: #95a5a6;
            }
        }
    }

    .chart-content {
        padding: 20px;
        height: 300px;
        position: relative;

        canvas {
            width: 100% !important;
            height: 100% !important;
        }

        .consultation-stats {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;

            .stat-item {
                text-align: center;

                .stat-label {
                    font-size: 12px;
                    color: #7f8c8d;
                    margin-bottom: 4px;
                }

                .stat-value {
                    font-size: 18px;
                    font-weight: 600;
                    color: #2c3e50;
                }
            }
        }
    }
}
</style>