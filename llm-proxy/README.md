# LLM Proxy（心理咨询流式代理）

这个服务用于对接前端 `Consultation` 页面，提供：
- 流式聊天代理（SSE）
- 会话/消息存储（SQLite）
- 情绪分析与缓存（由大模型输出）
- 统一的历史会话/消息接口

## 功能概览
- 保持前端请求路径不变：`/api/psychological-chat/*`
- 兼容 OpenAI/兼容接口的流式返回
- 自动保存会话、消息、情绪分析缓存
- 情绪分析支持重试、校验与调试日志（`emotion_debug.log`）

## 运行环境
- Node.js 18+（推荐）
- SQLite（内置于 `better-sqlite3`）

## 安装与启动
1. 安装依赖：
	 - 在 `llm-proxy` 目录执行 `npm install`
2. 启动服务：
	 - `npm run start`

> 服务默认监听 `http://localhost:9000`

## 环境变量（可选）
在 Windows PowerShell 中可这样设置：

- 临时生效：
	`$env:SYSTEM_PROMPT="你的系统提示词"`
	`$env:PORT=9000`
	`npm run start`

支持的环境变量：
- `PORT`：服务端口（默认 9000）
- `SYSTEM_PROMPT`：大模型系统提示词（心理咨询师角色）

> `MODEL`、`TARGET_URL`、`API_KEY` 目前在 `server.js` 内直接配置，如需调整请改动代码中的常量。

## 主要接口

### 1) 创建新会话
`POST /api/psychological-chat/session/start`

### 2) 会话列表
`GET /api/psychological-chat/sessions`

### 3) 会话消息详情
`GET /api/psychological-chat/sessions/:sessionId/messages`

### 4) 删除会话
`DELETE /api/psychological-chat/sessions/:sessionId`

### 5) 流式聊天（SSE）
`POST /api/psychological-chat/stream`

返回示例：
```text
Content-Type: text/event-stream

data: {"code":"200","msg":"操作成功","data":{"content":"你好","type":"normal"}}

event: done
data: [DONE]
```

### 6) 获取情绪分析
`GET /api/psychological-chat/session/:sessionId/emotion`

说明：
- 情绪分析由大模型生成，字段必填：
	`primaryEmotion`、`emotionScore`、`isNegative`、`riskLevel`、`suggestion`、`improvementSuggestions`
- 当 `riskLevel > 1` 且 `isNegative = true` 时，必须返回 `riskDescription`
- 情绪分析结果缓存为“该会话最后一次分析结果”

### 7) 健康检查
`GET /health`

## 调试与排错
- 解析失败/超时会记录到 `emotion_debug.log`
- 若前端提示超时，请检查前端 Axios 超时配置与 `EMOTION_WAIT_MS`

## 注意事项
- 本服务不校验前端 `token`，如需鉴权可自行添加中间件
- 仅适配 OpenAI/兼容流式输出；如上游格式不同可扩展解析逻辑
