<template>
    <div class="consultation-container">
        <div class="sidebar">
            <!-- AI助手信息 -->
            <div class="ai-assistant-info">
                <div class="breathing-circle"><el-image :src="icon" style="width:25px;height:25px;"></el-image></div>
                <h3 class="assistant-name">AI助手</h3>
                <div class="online-status">
                    <div class="status-dot"></div>
                    在线服务中
                </div>
            </div>
            <!-- 情绪花园 -->
            <div class="emotion-garden">
                <!-- 头部 -->
                <div class="garden-header">
                    <div class="garden-title">情绪花园</div>
                </div>
                <!-- 信息 -->
                <div class="emotion-info">
                    <div class="emotion-name">{{ currentEmotion.primaryEmotion }}</div>
                    <div class="emotion-score">{{ currentEmotion.emotionScore }}</div>
                </div>
                <!-- 建议 -->
                <div class="warm-tips">
                    <div class="emotion-status-text">
                        <span class="status-label">今天感觉</span>
                        <span class="status-emotion">{{ currentEmotion.isNegative ? '很糟糕' : '很不错' }}</span>
                    </div>
                    <div class="emotion-intensity">
                        <span class="intensity-dots">
                            <span class="dot" v-for="(index) in 3" :key="index"
                                :class="{ 'active': getIntensityClass(currentEmotion.emotionScore) >= index }"></span>
                        </span>
                        <span class="intensity-text">{{ getRiskText(currentEmotion.riskLevel) }}</span>
                    </div>
                    <!-- 文字建议 -->
                    <div class="warm-suggestion" v-if="currentEmotion.suggestion">
                        <div class="suggestion-icon">
                            💕
                        </div>
                        <div class="suggestion-content">
                            <div class="suggestion-title">给你的小建议</div>
                            <div class="suggestion-text">{{ currentEmotion.suggestion }}</div>
                        </div>
                    </div>
                    <!-- 行动建议 -->
                    <div class="healing-actions" v-if="currentEmotion.improvementSuggestions && currentEmotion.improvementSuggestions.length>0">
                        <div class="actions-title">治愈小行动</div>
                        <div class="actions-list">
                            <div class="action-item" v-for="item in currentEmotion.improvementSuggestions" :key="item">
                                <div class=action-icon>🌟</div>
                                <div class="action-text">{{ item }}</div>
                            </div>
                        </div>
                    </div>
                    <!-- 风险提示 -->
                    <div class="risk-notice" v-if="currentEmotion.riskLevel>1 && currentEmotion.isNegative">
                        <div class="notice-icon">⚠️</div>
                        <div class="notice-content">
                            <div class="notice-title">温馨提示</div>
                            <div class="notice-text">{{ currentEmotion.riskDescriprion }}</div>
                        </div>
                    </div>
                </div>

            </div>
            <!-- 会话历史 -->
            <div class="session-history">
                <h4 class="section-title">会话历史</h4>
                <div class="session-list">
                    <div class="session-item" v-for="item in historySession" :key="item.id"
                        @click="() => handleHistorySessionClick(item)">
                        <div class="session-info">
                            <div class="session-title">
                                <span>{{ item.sessionTitle }}</span>
                                <div class="session-meta">
                                    <span class="session-time">{{ item.startedAt }}</span>
                                </div>
                                <div class="session-preview">
                                    {{ item.lastMessageContent }}
                                </div>
                                <div class="session-stats">
                                    <span>
                                        <el-icon>
                                            <ChatRound></ChatRound>
                                        </el-icon>
                                        {{ item.messageCount || 0 }}
                                    </span>
                                    <span>
                                        <el-icon>
                                            <Clock></Clock>
                                        </el-icon>
                                        {{ item.durationMinutes || 0 }}分钟前
                                    </span>
                                </div>
                            </div>
                            <div class="session-actions">
                                <el-button type="danger" text @click="() => handleDeleteSession(item.id)">
                                    <el-icon>
                                        <DeleteFilled></DeleteFilled>
                                    </el-icon>
                                </el-button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="chat-main">
            <!-- 聊天头部 -->
            <div class="chat-header">
                <div class="header-left">
                    <div class="chat-avatar"><el-image :src="icon" style="width:25px;height:25px;"></el-image></div>
                    <div class="chat-info">
                        <h2>AI助手</h2>
                        <p>您的贴心AI心理健康助手</p>
                    </div>
                </div>
                <el-button circle @click="createNewSession" title="新建会话">
                    <!-- button的默认插槽：自定义button的样子 -->
                    <el-icon>
                        <Plus />
                    </el-icon>
                </el-button>
            </div>
            <!-- 聊天消息区 -->
            <div class="chat-messages">
                <!-- 欢迎语 -->
                <div v-if="message && message.length === 0" class="message-item ai-message">
                    <div class="message-avatar">
                        <el-image :src="icon" style="width: 18px;height: 18px;"></el-image>
                    </div>
                    <div class="message-content">
                        <div class="message-bubble">
                            <p>您好！我是龙龙，您的AI心理健康助手。很高兴陪伴您，为您提供温暖的心理支持。请告诉我，how you feel today？有什么想要告诉我的吗？</p>
                        </div>
                        <div class="message-time">刚刚</div>
                    </div>
                </div>
                <!-- 消息列表 -->
                <div class="message-item" v-for="item in message" :key="item.id"
                    :class="item.senderType === 1 ? 'user-message' : 'ai-message'">
                    <div class="message-avatar">
                        <el-image v-if="item.senderType === 1" :src="usericon"
                            style="width: 18px;height: 18px;"></el-image>
                        <el-image v-else :src="icon" style="width: 18px;height: 18px;"></el-image>
                    </div>
                    <div class="message-content">
                        <div class="message-bubble">
                            <!-- 如果当前发送方是ai，并且它正在输入，并且它还没有内容，那么就代表ai正在思考中，显示三个点 -->
                            <div v-if="item.senderType === 2 && isAiTyping && !item.content" class="typing-indicator">
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                            </div>
                            <!-- ai错误消息 -->
                            <div v-else-if="item.isError" class="error-message">{{ item.content }}</div>
                            <!-- ai正常消息 -->
                            <MarkdownRenderer v-else-if="item.senderType === 2" :content="item.content"
                                :is-ai-message="true"></MarkdownRenderer>
                            <!-- 用户消息 -->
                            <p v-else v-html="formatMessageContent(item.content)"></p>
                        </div>
                        <div class="message-time">{{ item.senderType === 2 && isAiTyping ? '正在输入中' : item.createdAt }}
                        </div>
                    </div>

                </div>
            </div>
            <!-- 输入框区域 -->
            <div class="chat-input">
                <div class="input-container">
                    <el-input v-model="userMessage" placeholder="请输入内容" clearable type="textarea" :rows="3"
                        :disabled="isAiTyping" @keydown="handleKeyDown">
                    </el-input>
                    <div class="input-footer">
                        <span>按Enter发送，shift+Enter换行</span>
                        <span>{{ userMessage.length }}/500</span>
                    </div>
                </div>
                <el-button @click="sendMessage" type="primary" class="send-btn"
                    :disabled="!userMessage.trim() || userMessage.length > 500">
                    <el-icon>
                        <Promotion></Promotion>
                    </el-icon>
                </el-button>
            </div>
        </div>
    </div>
</template>
<script setup>
import icon from '@/assets/images/robot-fill.png'
import usericon from '@/assets/images/users.png'
import { ChatRound, Clock, DeleteFilled, Plus, Promotion } from '@element-plus/icons-vue'
import { onMounted, ref } from 'vue'
import { deleteSession, getHistorySessionDetail, getHistorySessionList, getSessionEmotion, startSession } from '../../api/user'
import { ElMessage } from 'element-plus'
import MarkdownRenderer from '@/components/Frontend/MarkdownRenderer.vue'
import { fetchEventSource } from '@microsoft/fetch-event-source'
//情绪花园部分------------------------------------------------------------------------------------
const currentEmotion = ref({
    primaryEmotion: '中性',
    emotionScore: 50,
    isNegative: true,
    riskLevel: 2,
    suggestion: '哈哈哈哈',
    improvementSuggestions: [],
    riskDescriprion:'危险危险'

})
const getIntensityClass = (score) => {
    if (score >= 60) {
        return 3
    }
    else if (score >= 30) {
        return 2
    }
    else return 1
}
const getRiskText = (level) => {
    switch (level) {
        case 0:
            return '正常'
        case 1:
            return '需关注'
        case 2:
            return '预警'
        case 3:
            return '危机'
        default:
            return '未知风险等级'
    }
}
//调用后端接口：ai返回的根据当前对话分析出来的结果。
//有两个地方要调用这个情绪分析函数：1、点击了某个历史会话后，2、每次对话完毕后
const loadSessionEmotion=(sessionId)=>{
    if(!sessionId.toString().startsWith('session_')) sessionId='session_'+sessionId
    getSessionEmotion(sessionId).then((res)=>{
        console.log(res)
        currentEmotion.value=res
    })

}
//历史会话部分------------------------------------------------------------------------------------
//用来接收当前会话的历史聊天消息
const message = ref([])
//用来接收历史所有会话
const historySession = ref([])
//获取历史所有会话的列表
const getHistorySession = () => {
    getHistorySessionList({
        pageNum: '1',
        pageSize: '10'
    }).then((res) => {
        historySession.value = res.records
    })
}
//处理点击了历史某个会话后的回调
const handleHistorySessionClick = (session) => {
    getHistorySessionDetail(session.id).then((res) => {
        message.value = res
        //更新当前会话的对象
        const sessionObject = {
            sessionId: 'session_' + res[0].sessionId,//必须处理成session的格式，后端才能找到这个id
            status: 'ACTIVE',
            sessionTitle: session.sessionTitle
        }
        currentSession.value = sessionObject
    })
    loadSessionEmotion(session.id)//开始情绪分析
}
//处理删除历史对话
const handleDeleteSession = (sessionId) => {
    deleteSession(sessionId).then(() => {
        ElMessage.success('删除成功')
        getHistorySession()
    })
}//处理一下用户消息:简单的换行
const formatMessageContent = (msg) => {
    return msg.replace(/\n/, '<br>')
}
//聊天部分------------------------------------------------------------------------------------
//存当前会话对象，可以是新的对象，也可以是打开之前的窗口然后调用了接口获取到的对象
const currentSession = ref(null)
//新建临时会话：有两种情况要新建。1、组件刚挂载的时候2、点击右上角添加新会话的时候
const createNewSession = () => {
    //创建一个临时的新的会话对象
    const newSessionObject = {
        sessionId: crypto.randomUUID(),
        status: 'TEMP',//临时会话指的就是用户还没有发送第一条消息，只有ai发送的一条默认消息
        sessionTitle: '新对话'
    }
    currentSession.value = newSessionObject
    // 关键：让UI立即有“新会话”反馈
    message.value = []
    userMessage.value = ''
    isAiTyping.value = false
}
//真正创建会话：发送第一条消息的时候
const startNewSession = (userMsg) => {
    //定义要发送给后端的数据
    const sessionParams = {
        initialMessage: userMsg,
        sessionTitle: ''
    }
    if (currentSession.value.sessionTitle === '新对话') {
        sessionParams.sessionTitle = `AI助手 - ${new Date().toLocaleString()}`
    } else {
        sessionParams.sessionTitle = currentSession.value.sessionTitle
    }
    startSession(sessionParams).then((res) => {
        //将后端返回的数据存下来
        const sessionObject = {
            sessionId: res.sessionId,//注意id永远都是后端返回的，而不是我们创建的。它的格式为session_xxxx
            status: res.status,//返回的状态是正式状态
            sessionTitle: sessionParams.sessionTitle
        }
        //如果当前是临时会话，需要更新会话对象
        if (currentSession.value.status === 'TEMP') {
            Object.assign(currentSession.value, sessionObject)
        }
        else {
            currentSession.value = sessionObject//更新会话对象
        }
        //更新历史会话列表
        getHistorySession()
        //开始流式对话
        startAIResponse(currentSession.value.sessionId, userMsg)

    })
}
const startAIResponse = (sessionId, userMessage) => {
    console.log(sessionId, userMessage)
    //防止重复发送
    if (isAiTyping.value) {
        ElMessage.error('AI助手正在输入中，请稍后..')
        return
    }
    isAiTyping.value = true
    //先把用户的第一条消息加入到message队列里面
    message.value.push({
        id: crypto.randomUUID(),
        senderType: 1,
        content: userMessage,
        createdAt: new Date().toISOString()
    })
    //由于此时还没有拿到真正的后端数据，因此我们需要先模拟一条假的空ai数据加到message列表里面，这样才能显示出点点点
    const fakeAiMessage = {
        id: crypto.randomUUID(),
        senderType: 2,
        content: '',
        createdAt: new Date().toISOString()
    }
    message.value.push(fakeAiMessage)

    //调用流式接口
    const control = new AbortController()//js自带，用来终止fetch请求
    fetchEventSource('/api/psychological-chat/stream', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Token': localStorage.getItem('token'),
            'Accept': 'text/event-stream'//这是比axios的headers要多的一项
        },
        body: JSON.stringify({//要传递的数据
            sessionId,
            userMessage
        }),
        signal: control.signal,//把这个方法给signal，就能够手动停止请求,
        onopen: (response) => {//连接成功后监听
            if (response.headers.get('Content-Type') !== 'text/event-stream') {
                ElMessage.error('服务器返回了非流式数据')
            }
        },
        onmessage: (res) => {//流式数据会在这里被接收
            const raw = res.data.trim()
            //如果没有内容，就忽略当前空事件，继续监听，等下一条真正数据。如果你在 !raw 时直接 handleError，就会把正常流误判成“AI回复失败”。原因是流式接口里空包很常见且正常
            if (!raw) return

            //有message和done两种，message就代表还在传token，done就代表传完了
            const eventName = res.event

            //获取刚刚创建的假的AI消息对象，因为现在要更新它的内容了，给它填入真正的数据
            const AiMessage = message.value[message.value.length - 1]

            //没有消息了
            if (eventName === 'done') {
                isAiTyping.value = false
                control.abort()//终止请求
                loadSessionEmotion(currentSession.value.sessionId)//开始情绪分析
                return
            }
            const payload = JSON.parse(raw)
            const ok = String(payload.code) === '200'
            if (ok && payload.data && payload.data.content) {
                AiMessage.content += payload.data.content//追加content，content就是一个token，因为是一个token一个token这样放回的
            } else {
                handleError(payload.message || 'AI回复失败')
            }
        },
        onerror: (error) => {
            handleError(error || 'AI回复失败')
        },
        // onclose: () => {
        //     //开始情绪分析
        // }
    })
}
const handleError = (error) => {
    //获取刚刚创建的假的AI消息对象，因为现在要更新它的内容了，给它填入错误提示语
    const AiMessage = message.value[message.value.length - 1]
    if (AiMessage) {
        AiMessage.content = error
    }
    isAiTyping.value = false
}
//发消息部分-----------------------------------------------------------------------------
//用来绑定用户输入的消息
const userMessage = ref('')
//判断ai是否正在输入，正在输入的话要禁用用户的输入框
const isAiTyping = ref(false)
//处理键盘事件
const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
        //调用发送接口
    }
}
//用户发送消息：逻辑分为第一次发送和其他次发送
const sendMessage = () => {
    //如果去除了首尾空格之后还是为空，那就return
    if (!userMessage.value.trim()) return

    if (isAiTyping.value) {
        ElMessage.error('AI正在输入，请稍后')
        return
    }
    //处理一下输入的内容
    const userMsg = userMessage.value.trim()
    //如果还没有对话过，此时发消息需要创建一个新的会话对象
    if (currentSession.value.status === 'TEMP') {
        startNewSession(userMsg)
    }
    //如果已经对话过，那就在指定的会话上继续聊天，直接开始流式对话
    else {
        startAIResponse(currentSession.value.sessionId, userMsg)
    }
    //把输入的内容清除
    userMessage.value = ''
}

onMounted(() => {
    getHistorySession()
    createNewSession()
})
</script>
<style lang="scss" scoped>
.consultation-container {
    margin: 0 auto;
    width: 1200px;
    display: flex;
    gap: 20px;
    padding: 20px;

    .sidebar {
        width: 320px;

        .ai-assistant-info {
            margin-bottom: 20px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 252, 248, 0.95) 100%);
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 8px 32px rgba(251, 146, 60, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(251, 146, 60, 0.08);
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;

            .breathing-circle {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #fb923c 0%, #f59e0b 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 12px;
                animation: breathing 4s ease-in-out infinite;
                box-shadow: 0 6px 24px rgba(251, 146, 60, 0.25);
                position: relative;
            }

            .assistant-name {
                font-size: 16px;
                font-weight: 700;
                background: linear-gradient(135deg, #fb923c, #f59e0b);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-align: center;
                background-clip: text;
                margin: 0 0 12px;
            }

            .online-status {
                display: flex;
                align-items: center;
                justify-content: center;
                color: #059669;
                font-size: 12px;
                font-weight: 600;

                .status-dot {
                    width: 8px;
                    height: 8px;
                    background: #059669;
                    border-radius: 50%;
                    margin-right: 8px;
                    animation: pulse 2s infinite;
                    box-shadow: 0 0 8px rgba(5, 150, 105, 0.4);
                }
            }
        }

        .session-history {
            background: white;
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
            min-height: 250px;
            display: flex;
            flex-direction: column;

            .section-title {
                font-size: 16px;
                font-weight: 600;
                color: #333;
                margin: 0 0 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;

            }

            .session-list {
                overflow-y: auto;
                max-height: 200px;
                scrollbar-width: thin;
                scrollbar-color: rgba(64, 150, 255, 0.3) transparent;

                .session-item {
                    position: relative;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 12px;
                    margin-bottom: 8px;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: 2px solid transparent;

                    &:hover {
                        background: #f8f9ff;
                        border-color: #e6f0ff;
                    }

                    &.active {
                        background: #e6f0ff;
                        border-color: #4096ff;
                    }

                    .session-info {
                        flex: 1;

                        .session-title {
                            font-weight: 500;
                            font-size: 14px;
                            color: #333;
                            margin-bottom: 4px;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;

                            .session-meta {
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                margin-bottom: 6px;

                                .session-time {
                                    font-size: 12px;
                                    color: #999;
                                }
                            }

                            .session-preview {
                                width: 200px;
                                font-size: 12px;
                                color: #666;
                                margin-bottom: 6px;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                            }

                            .session-stats {
                                display: flex;
                                align-items: center;
                                gap: 12px;

                                span {
                                    font-size: 12px;
                                    color: #999;
                                    display: flex;
                                    align-items: center;
                                    gap: 4px;
                                }
                            }
                        }

                        .session-actions {
                            position: absolute;
                            top: 10px;
                            right: 12px;
                        }
                    }
                }

                .no-sessions-text {
                    text-align: center;
                    font-size: 14px;
                    color: #999;
                }
            }
        }

        .emotion-garden {
            background: linear-gradient(135deg, #fef9e7 0%, #fcf4e6 50%, #f6f0e8 100%);
            border-radius: 20px;
            padding: 16px;
            margin-bottom: 20px;
            box-shadow: 0 8px 32px rgba(252, 244, 230, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.2);
            position: relative;
            overflow: hidden;
            min-height: 300px;

            .garden-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
                position: relative;
                z-index: 2;

                .garden-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    color: #8b4513;
                }
            }

            .emotion-info {
                margin: 0 auto;
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 10;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.8);
                background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
                color: #fff;

                .emotion-name {
                    font-size: 15px;
                    font-weight: 600;
                    line-height: 1;
                    margin-bottom: 2px;
                }

                .emotion-score {
                    font-size: 14px;
                    font-weight: 700;
                    opacity: 0.9;
                }
            }

            .warm-tips {
                text-align: center;
                margin-bottom: 16px;

                .emotion-status-text {
                    margin-bottom: 12px;

                    .status-label {
                        font-size: 14px;
                        color: #8b7355;
                        margin-right: 8px;
                    }

                    .status-emotion {
                        font-size: 16px;
                        font-weight: 600;
                        padding: 4px 12px;
                        border-radius: 16px;
                        display: inline-block;
                    }
                }

                .emotion-intensity {
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;

                    .intensity-dots {
                        display: flex;
                        gap: 4px;

                        .dot {
                            width: 8px;
                            height: 8px;
                            border-radius: 50%;
                            background: #e0e0e0;
                            transition: all 0.3s ease;

                            &.active {
                                background: linear-gradient(135deg, #ff9a9e, #fecfef);
                                transform: scale(1.2);
                                box-shadow: 0 2px 8px rgba(255, 154, 158, 0.4);
                            }
                        }
                    }

                    .intensity-text {
                        font-size: 12px;
                        color: #8b7355;
                        font-weight: 500;
                    }
                }

                .warm-suggestion {
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.8));
                    border-radius: 16px;
                    padding: 12px;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.6);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);

                    .suggestion-icon {
                        font-size: 20px;
                        flex-shrink: 0;
                        margin-top: 2px;
                    }

                    .suggestion-content {
                        text-align: left;
                        flex: 1;

                        .suggestion-title {
                            font-size: 14px;
                            font-weight: 600;
                            color: #8b7355;
                            margin-bottom: 6px;
                        }

                        .suggestion-text {
                            font-size: 13px;
                            color: #6b5b47;
                            line-height: 1.5;
                        }
                    }
                }

                .healing-actions {
                    margin-bottom: 16px;

                    .actions-title {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        color: #8b7355;
                        margin-bottom: 16px;
                    }

                    .actions-list {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;

                        .action-item {
                            background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
                            border-radius: 12px;
                            padding: 12px;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            border: 1px solid rgba(255, 255, 255, 0.5);
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
                            text-align: left;

                            .action-icon {
                                font-size: 14px;
                                color: #ffd700;
                                flex-shrink: 0;
                            }

                            .action-text {
                                font-size: 12px;
                                color: #6b5b47;
                                line-height: 1.4;
                                flex: 1;
                            }
                        }
                    }
                }

                .risk-notice {
                    background: linear-gradient(135deg, #fff9e6, #ffeaa7);
                    border-radius: 16px;
                    padding: 16px;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    border: 1px solid rgba(255, 234, 167, 0.6);
                    box-shadow: 0 6px 20px rgba(255, 234, 167, 0.3);

                    .notice-icon {
                        font-size: 20px;
                        flex-shrink: 0;
                        margin-top: 2px;
                    }

                    .notice-content {
                        flex: 1;

                        .notice-title {
                            font-size: 14px;
                            font-weight: 600;
                            color: #d4840f;
                            margin-bottom: 6px;
                        }

                        .notice-text {
                            font-size: 13px;
                            color: #b8740c;
                            line-height: 1.5;
                        }
                    }
                }
            }
        }
    }

    .chat-main {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 252, 250, 0.98) 100%);
        border-radius: 20px;
        box-shadow: 0 12px 40px rgba(251, 146, 60, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04);
        border: 1px solid rgba(251, 146, 60, 0.1);
        backdrop-filter: blur(10px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        flex: 1;
        height: 100%;

        .chat-header {
            background: linear-gradient(135deg, #fb923c 0%, #f59e0b 100%);
            color: white;
            padding: 20px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
            flex-shrink: 0;

            .header-left {
                display: flex;
                align-items: center;

                .chat-avatar {
                    width: 48px;
                    height: 48px;
                    background: rgba(255, 255, 255, 0.25);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 16px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    position: relative;
                    z-index: 1;
                }

                .chat-info {
                    h2 {
                        font-size: 20px;
                        font-weight: 700;
                        margin-bottom: 4px;
                    }

                    p {
                        font-size: 14px;
                    }
                }
            }
        }

        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 252, 248, 0.05) 100%);
            min-height: 0;
            max-height: calc(100vh - 200px);
            scrollbar-width: thin;
            scrollbar-color: rgba(251, 146, 60, 0.3) transparent;

            .message-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;

                .message-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    color: white;
                    flex-shrink: 0;
                }

                &.ai-message {
                    .message-avatar {
                        background: linear-gradient(135deg, #fb923c, #f59e0b);
                        box-shadow: 0 4px 12px rgba(251, 146, 60, 0.3);
                    }
                }

                &.user-message {
                    .message-avatar {
                        background: linear-gradient(135deg, #6b7280, #4b5563);
                        box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
                    }
                }

                .message-content {
                    max-width: 70%;

                    .message-bubble {
                        background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 252, 248, 0.95) 100%);
                        border-radius: 16px;
                        padding: 12px 16px;
                        position: relative;
                        animation: fadeInUp 0.4s ease-out;
                        border: 1px solid rgba(251, 146, 60, 0.1);
                        box-shadow: 0 4px 16px rgba(251, 146, 60, 0.05);

                        .typing-indicator {
                            display: flex;
                            gap: 4px;
                            padding: 8px 0;

                            .typing-dot {
                                width: 8px;
                                height: 8px;
                                background: #ccc;
                                border-radius: 50%;
                                animation: typing 1.5s ease-in-out infinite;

                                &:nth-child(2) {
                                    animation-delay: 0.2s;
                                }

                                &:nth-child(3) {
                                    animation-delay: 0.4s;
                                }
                            }
                        }

                        /* 错误消息样式 */
                        .error-message {
                            background: linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%);
                            border: 1px solid #F87171;
                            border-radius: 12px;
                            padding: 12px 16px;
                            color: #991B1B;
                            font-weight: 500;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }
                    }

                    .message-time {
                        font-size: 12px;
                        color: #999;
                        margin-top: 4px;
                    }
                }
            }
        }

        .chat-input {
            border-top: 1px solid rgba(251, 146, 60, 0.1);
            padding: 20px 24px;
            display: flex;
            gap: 12px;
            align-items: flex-end;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 252, 248, 0.7) 100%);
            backdrop-filter: blur(10px);
            flex-shrink: 0;

            .input-container {
                flex: 1;
            }

            .input-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: #78716c;
                font-weight: 500;
            }

            .send-btn {
                height: 60px;
                width: 60px;
                border-radius: 16px;
                background: linear-gradient(135deg, #fb923c 0%, #f59e0b 100%) !important;
                border: none !important;
                box-shadow: 0 6px 20px rgba(251, 146, 60, 0.25);
                transition: all 0.3s ease;
            }

        }

    }
}
</style>