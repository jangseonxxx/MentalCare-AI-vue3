import express from 'express';
import Database from 'better-sqlite3';
import dayjs from 'dayjs';

// =====================
// 基础应用与配置
// =====================
//创建一个 Express 应用实例（你的服务器）。
const app = express();
// 让它能解析 JSON 请求体
app.use(express.json());

// 服务端口
const PORT = 9000;
// 大模型接口（Ollama OpenAI 兼容接口）
const TARGET_URL = 'http://localhost:11434/v1/chat/completions';
// 如果你的上游模型接口需要鉴权，就把 key 填在这里。如果不需要鉴权（比如本地 Ollama），就保持空字符串即可。
const API_KEY = '';
// 使用的本地模型名
const MODEL = 'qwen2.5:7b';
// 大模型系统提示词（用于角色与回复风格约束）
const SYSTEM_PROMPT = `你是一位温和、专业、非评判的心理咨询师龙龙。\n你的目标是：\n- 优先共情，关注用户情绪\n- 不做医疗诊断，不给药物建议\n- 遇到自伤/自杀倾向时，建议联系线下专业帮助\n- 回答结构：共情 → 澄清问题 → 可行动建议\n- 语气简洁、温柔、鼓励式。每次回答末尾加上【QWEN】`;

// =====================
// 工具函数
// =====================
// 安全 JSON 解析（避免异常中断）
const safeJsonParse = (text) => {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

// 统一时间格式：YYYY-MM-DD HH:mm:ss
const formatDateTime = (value = new Date()) => {
    const formatted = dayjs(value).format('YYYY-MM-DD HH:mm:ss');
    return formatted === 'Invalid Date' ? '' : formatted;
};

// 从 session_123 这类字符串提取数字 id
const buildId = (raw) => {
    if (raw === null || raw === undefined) return null;
    const text = String(raw);
    const match = text.match(/session_(\d+)/);
    if (match) return Number(match[1]);

    //如果本身就只有数字，那就直接返回数字。text = "456" → parsed = 456
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
};

// 生成会话唯一字符串 session_id
const buildSessionId = (id) => `session_${id}`;

// 根据 id 或 session_id（数字或带前缀）看某个会话是否存在，统一返回 id 与 session_id。
// 规则：详情接口传数字 id；情绪分析传 session_xxx，数字 id + 前缀就是 session_id。
const resolveSessionRow = (raw) => {
    if (!raw) return null;
    const text = String(raw);
    const id = buildId(text);
    const session_id = text.startsWith('session_')
        ? text
        : id
            ? buildSessionId(id)
            : null;

    if (session_id) {
        const byKey = db
            .prepare('SELECT id, session_id as sessionId FROM sessions WHERE session_id = ?')
            .get(session_id);
        if (byKey) {
            return { id: byKey.id, session_id: byKey.sessionId };
        }
    }

    if (id) {
        const byId = db
            .prepare('SELECT id, session_id as sessionId FROM sessions WHERE id = ?')
            .get(id);
        if (byId) {
            return { id: byId.id, session_id: byId.sessionId };
        }
    }

    return null;
};

// 获取或创建会话（若不存在则落库），返回的是会话的{id：xxx；session_id:xxx}
const getOrCreateSession = (raw, sessionTitle = '新对话') => {
    const resolved = resolveSessionRow(raw);
    if (resolved) return resolved; // 如果能找到，直接返回

    const idSeed = buildId(raw);
    const startedAt = formatDateTime(new Date());
    const session_id_seed = idSeed ? buildSessionId(idSeed) : null;
    const insert = db.prepare(
        'INSERT INTO sessions (id, session_id, session_title, status, started_at, last_message_content, last_message_time, message_count, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const info = insert.run(
        idSeed || null,
        session_id_seed,
        sessionTitle,
        'ACTIVE',
        startedAt,
        '',
        '',
        0,
        0
    );
    const id = idSeed || Number(info.lastInsertRowid);
    const session_id = buildSessionId(id);
    db.prepare('UPDATE sessions SET session_id = ? WHERE id = ?').run(session_id, id);
    return { id, session_id };
};

// 从模型返回的字符串中提取 JSON（允许前后夹杂文本）
const extractJsonFromText = (text = '') => {
    if (!text) return null;
    //整段就是 JSON
    const direct = safeJsonParse(text);
    if (direct) return direct;
    //如果json前后还有别的文字，那就找到{}，把json提取出来
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    const sliced = text.slice(start, end + 1);
    return safeJsonParse(sliced);
};

// Promise 超时辅助（用于情绪分析等待）
const waitWithTimeout = async (promise, timeoutMs) => {
    let timeoutId;
    const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve(null), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

// 情绪分析等待时间（需小于前端 Axios 5s 超时）
const EMOTION_WAIT_MS = 5000;

// 情绪分析结果的必需字段
const REQUIRED_EMOTION_FIELDS = [
    'primaryEmotion',
    'emotionScore',
    'isNegative',
    'riskLevel',
    'suggestion',
    'improvementSuggestions'
];

// 校验情绪分析结果结构是否完整
const validateEmotionPayload = (payload) => {
    if (!payload || typeof payload !== 'object') return false;
    const basicOk = REQUIRED_EMOTION_FIELDS.every((field) => payload[field] !== undefined && payload[field] !== null);
    if (!basicOk) return false;
    const isNegative = payload.isNegative === true;
    const riskLevel = Number(payload.riskLevel);
    if (isNegative && riskLevel > 1) {
        return payload.riskDescription !== undefined && payload.riskDescription !== null && String(payload.riskDescription).trim() !== '';
    }
    return true;
};

// 构造情绪分析提示词（基于用户最新消息）
const buildEmotionPrompt = (latestContent, strict = false) => {
    const strictTip = strict
        ? '如果无法判断，也必须给出合理值；严禁输出多余文本。请严格按 JSON 模板输出。'
        : '不得输出除 JSON 以外的任何内容。';
    const template = `{"primaryEmotion":"","emotionScore":0,"isNegative":false,"riskLevel":0,"suggestion":"","improvementSuggestions":[""],"riskDescription":"","keywords":[""],"icon":"","label":"","timestamp":0}`;
    return `请你作为“情绪分析助手”，只输出严格 JSON，不要包含任何多余文本或 Markdown。\n必须返回字段：primaryEmotion、emotionScore、isNegative、riskLevel、suggestion、improvementSuggestions。\n当 riskLevel > 1 且 isNegative = true 时，必须给出 riskDescription（温馨提示）。\n可选字段：keywords、icon、label、timestamp。\n\n字段说明：\n- primaryEmotion：用户当前的主要情绪（如悲伤、开心、抑郁、焦虑等，不限制词汇）。\n- emotionScore：情绪分数，0-100 的整数，越接近 0 情绪越不好，越接近 100 情绪越好。\n- isNegative：布尔值，主要情绪为负面时为 true，正面时为 false。\n- riskLevel：只允许 0/1/2/3。0=正常；1=需关注；2=预警；3=危机（存在危及生命等行为）。\n- suggestion：根据用户当前话语给出的相关建议。\n- improvementSuggestions：给出可执行的行动建议数组（字符串）。\n- riskDescription：仅当 isNegative=true 且 riskLevel>1 必填，作为温馨提示。\n\n${strictTip}\n输出模板示例：${template}\n请仅基于“用户最新消息”进行分析，不要结合历史内容。\n要求：suggestion 与 improvementSuggestions 必须与该消息主题相关，避免泛化建议。\n用户最新消息：\n${latestContent}`;
};

// 请求大模型完成情绪分析（返回 JSON）
const requestEmotionCompletion = async (prompt, signal) => {
    const upstream = await fetch(TARGET_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {})
        },
        body: JSON.stringify({
            model: MODEL,
            stream: false,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt }
            ]
        }),
        signal
    });

    const payload = await upstream.json();
    const text = payload?.choices?.[0]?.message?.content || '';
    return { parsed: extractJsonFromText(text), rawText: text };
};

// 执行情绪分析：必要时重试补全字段
const runEmotionAnalysis = async (session_id, latestContent) => {
    for (let attempt = 0; attempt < 1; attempt += 1) {
        const emotionPrompt = buildEmotionPrompt(latestContent, attempt === 1);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        try {
            const firstResponse = await requestEmotionCompletion(emotionPrompt, controller.signal);
            let parsed = firstResponse.parsed;
            if (parsed && !validateEmotionPayload(parsed)) {
                const completionPrompt = `以下 JSON 缺少字段或为空，请补全所有必需字段并只输出 JSON：\n${JSON.stringify(parsed)}\n必需字段：primaryEmotion、emotionScore、isNegative、riskLevel、suggestion、improvementSuggestions。\n当 riskLevel > 1 且 isNegative = true 时，必须给出 riskDescription。\n请基于 AI 最新回复：${latestContent}`;
                const completionResponse = await requestEmotionCompletion(completionPrompt, controller.signal);
                parsed = completionResponse.parsed;
            }

            if (!validateEmotionPayload(parsed)) {
                if (attempt === 2) {
                    console.warn('[llm-proxy] emotion parse failed', parsed);
                }
                continue;
            }

            let normalized = normalizeEmotionPayload(parsed);
            if (normalized.isNegative && normalized.riskLevel > 1 && !normalized.riskDescription) {
                normalized = {
                    ...normalized,
                    riskDescription: '当前情绪波动较大，建议适当休息并寻求支持。'
                };
            }
            upsertEmotionCache.run(
                String(session_id),
                latestContent,
                JSON.stringify(normalized),
                formatDateTime(new Date())
            );
            return normalized;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    const cached = getEmotionCache.get(String(session_id));
    if (cached) {
        const parsed = safeJsonParse(cached.payload);
        if (parsed) {
            return normalizeEmotionPayload(parsed);
        }
    }

    return null;
};
// 情绪分析的进行中任务（避免同一会话并发重复分析）
const pendingEmotion = new Map();
// 确保同一会话不会并发多次情绪分析
const ensureEmotionAnalysis = (session_id, latestContent) => {
    const pending = pendingEmotion.get(session_id);
    if (pending && pending.latestContent === latestContent) {
        return pending.promise;
    }
    const promise = runEmotionAnalysis(session_id, latestContent)
        .catch(() => null)
        .finally(() => pendingEmotion.delete(session_id));
    pendingEmotion.set(session_id, { latestContent, promise });
    return promise;
};


// 规范化字段类型（不写死内容，仅做类型处理）
const normalizeEmotionPayload = (payload) => {
    const normalized = {
        primaryEmotion: null,
        emotionScore: null,
        isNegative: null,
        riskLevel: null,
        suggestion: null,
        improvementSuggestions: null,
        keywords: null,
        icon: null,
        label: null,
        riskDescription: null,
        timestamp: null
    };

    if (!payload || typeof payload !== 'object') return normalized;

    const score = Number(payload.emotionScore);
    const risk = Number(payload.riskLevel);
    const primaryEmotion = payload.primaryEmotion != null ? String(payload.primaryEmotion) : null;
    const isNegative = typeof payload.isNegative === 'boolean' ? payload.isNegative : null;
    const riskDescription = payload.riskDescription != null ? String(payload.riskDescription) : null;
    const keywords = Array.isArray(payload.keywords) ? payload.keywords.map((item) => String(item)) : null;

    const icon = payload.icon != null ? String(payload.icon) : null;

    return {
        primaryEmotion,
        emotionScore: Number.isFinite(score)
            ? Math.round(Math.max(0, Math.min(100, score)))
            : normalized.emotionScore,
        isNegative,
        riskLevel: Number.isFinite(risk) ? Math.max(0, Math.min(3, risk)) : normalized.riskLevel,
        suggestion: payload.suggestion != null ? String(payload.suggestion) : normalized.suggestion,
        improvementSuggestions: Array.isArray(payload.improvementSuggestions)
            ? payload.improvementSuggestions.map((item) => String(item))
            : normalized.improvementSuggestions,
        keywords,
        icon,
        label: payload.label != null ? String(payload.label) : primaryEmotion,
        riskDescription,
        timestamp: payload.timestamp != null ? Number(payload.timestamp) : normalized.timestamp
    };
};

// =====================
// 数据库（SQLite）初始化
// =====================
//开（或创建）一个本地 SQLite 文件 data.db。
const db = new Database('data.db');
// WAL 模式提高并发读写性能
db.pragma('journal_mode = WAL');

// 初始化数据表：会话、消息、情绪缓存
db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE,
    session_title TEXT,
    status TEXT,
    started_at TEXT,
    last_message_content TEXT,
    last_message_time TEXT,
    message_count INTEGER DEFAULT 0,
    user_id INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    sender_type INTEGER,
    content TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS emotion_cache (
    session_id TEXT PRIMARY KEY,
    last_user_content TEXT,
    payload TEXT,
    updated_at TEXT
);
`);

// 确保 sessions 表字段完整（兼容老数据）
const ensureSessionColumns = () => {
    const columns = db
        .prepare("PRAGMA table_info('sessions')")
        .all()
        .map((item) => item.name);
    const addColumn = (name, definition) => {
        if (!columns.includes(name)) {
            db.exec(`ALTER TABLE sessions ADD COLUMN ${name} ${definition}`);
        }
    };
    addColumn('last_message_time', 'TEXT');
    addColumn('user_id', 'INTEGER DEFAULT 0');
};

ensureSessionColumns();

// 预编译 SQL：插入消息
const insertMessage = db.prepare(
    'INSERT INTO messages (session_id, sender_type, content, created_at) VALUES (?, ?, ?, ?)'
);
// 预编译 SQL：更新会话统计
const updateSessionStats = db.prepare(
    'UPDATE sessions SET last_message_content = ?, last_message_time = ?, message_count = message_count + 1 WHERE id = ?'
);
// 预编译 SQL：读取情绪缓存
const getEmotionCache = db.prepare(
    'SELECT last_user_content as lastUserContent, payload FROM emotion_cache WHERE session_id = ?'
);
// 预编译 SQL：写入/更新情绪缓存
const upsertEmotionCache = db.prepare(
    'INSERT INTO emotion_cache (session_id, last_user_content, payload, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET last_user_content = excluded.last_user_content, payload = excluded.payload, updated_at = excluded.updated_at'
);
// 预编译 SQL：读取最新用户消息
const getLatestUserMessage = db.prepare(
    'SELECT content FROM messages WHERE session_id IN (?, ?) AND sender_type = 1 ORDER BY id DESC LIMIT 1'
);

// 插入一条消息并更新会话统计
const addMessage = (session_id, senderType, content, id) => {
    const createdAt = formatDateTime(new Date());
    insertMessage.run(String(session_id), senderType, content, createdAt);
    updateSessionStats.run(content, createdAt, id);
    return createdAt;
};

// =====================
// API：创建新会话
// =====================
app.post('/api/psychological-chat/session/start', (req, res) => {
    const { sessionTitle = '新对话' } = req.body || {};
    const startedAt = formatDateTime(new Date());
    const insert = db.prepare(
        'INSERT INTO sessions (session_id, session_title, status, started_at, last_message_content, last_message_time, message_count, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const info = insert.run(null, sessionTitle, 'ACTIVE', startedAt, '', '', 0, 0);
    const id = Number(info.lastInsertRowid);
    const session_id = buildSessionId(id);
    db.prepare('UPDATE sessions SET session_id = ? WHERE id = ?').run(session_id, id);

    res.json({
        code: '200',
        msg: '操作成功',
        data: {
            sessionId: session_id,
            status: 'ACTIVE'
        }
    });
});

// =====================
// API：会话列表（仅有消息的会话）
// =====================
app.get('/api/psychological-chat/sessions', (req, res) => {
    const pageNum = Number(req.query.pageNum || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const offset = (pageNum - 1) * pageSize;

    const records = db
        .prepare(
            'SELECT id, session_title as sessionTitle, started_at as startedAt, last_message_content as lastMessageContent, last_message_time as lastMessageTime, message_count as messageCount, user_id as userId FROM sessions WHERE message_count > 0 ORDER BY id DESC LIMIT ? OFFSET ?'
        )
        .all(pageSize, offset)
        .map((row) => ({
            ...row,
            startedAt: formatDateTime(row.startedAt),
            lastMessageTime: formatDateTime(row.lastMessageTime || row.startedAt),
            durationMinutes: Math.max(1, Math.floor((Date.now() - new Date(row.startedAt).getTime()) / 60000))
        }));

    const total = db.prepare('SELECT COUNT(1) as total FROM sessions WHERE message_count > 0').get().total;
    const pages = total === 0 ? 0 : Math.ceil(total / pageSize);

    res.json({
        code: '200',
        msg: '操作成功',
        data: {
            records,
            total,
            size: pageSize,
            current: pageNum,
            pages
        }
    });
});

// =====================
// API：会话消息详情
// =====================
app.get('/api/psychological-chat/sessions/:sessionId/messages', (req, res) => {
    const { sessionId } = req.params;
    const resolved = resolveSessionRow(sessionId);
    if (!resolved) {
        res.json({ code: '200', msg: '操作成功', data: [] });
        return;
    }
    const { id, session_id } = resolved;
    const rows = db
        .prepare(
            'SELECT id, session_id as sessionId, sender_type as senderType, content, created_at as createdAt FROM messages WHERE session_id IN (?, ?) ORDER BY id ASC'
        )
        .all(String(session_id), String(id))
        .map((row) => ({
            ...row,
            sessionId: id,
            senderTypeDesc: row.senderType === 1 ? '用户' : 'AI助手',
            messageType: 1,
            messageTypeDesc: '文本',
            contentLength: row.content ? row.content.length : 0,
            contentPreview: row.content ? row.content.slice(0, 30) : '',
            createdAt: formatDateTime(row.createdAt)
        }));
    if (rows.length > 0 && !rows.some((item) => item.senderType === 2)) {
        const fallbackCreatedAt = rows[rows.length - 1]?.createdAt || formatDateTime(new Date());
        rows.push({
            id: Date.now(),
            sessionId: id,
            senderType: 2,
            senderTypeDesc: 'AI助手',
            messageType: 1,
            messageTypeDesc: '文本',
            content: '（历史AI回复缺失）',
            contentLength: 9,
            contentPreview: '（历史AI回复缺失）',
            createdAt: fallbackCreatedAt
        });
    }
    res.json({
        code: '200',
        msg: '操作成功',
        data: rows
    });
});

// =====================
// API：删除会话
// =====================
app.delete('/api/psychological-chat/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const resolved = resolveSessionRow(sessionId);
    if (!resolved) {
        res.json({ code: '200', msg: '操作成功', data: true });
        return;
    }
    db.prepare('DELETE FROM messages WHERE session_id IN (?, ?)').run(String(resolved.id), resolved.session_id);
    db.prepare('DELETE FROM sessions WHERE id = ? OR session_id = ?').run(resolved.id, resolved.session_id);
    res.json({ code: '200', msg: '操作成功', data: true });
});

// =====================
// API：流式聊天接口（SSE）
// =====================
app.post('/api/psychological-chat/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { sessionId, userMessage } = req.body || {};
    if (!userMessage) {
        res.write(`data: ${JSON.stringify({ code: 400, message: 'userMessage required' })}\n\n`);
        res.write('event: done\ndata: [DONE]\n\n');
        res.end();
        return;
    }

    const resolved = getOrCreateSession(sessionId, '新对话');
    if (!resolved) {
        res.write(`data: ${JSON.stringify({ code: 400, message: 'invalid sessionId' })}\n\n`);
        res.write('event: done\ndata: [DONE]\n\n');
        res.end();
        return;
    }

    addMessage(resolved.session_id, 1, userMessage, resolved.id);
    ensureEmotionAnalysis(resolved.session_id, userMessage);

    try {
        const upstream = await fetch(TARGET_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {})
            },
            body: JSON.stringify({
                model: MODEL,
                stream: true,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userMessage }
                ],
                metadata: { sessionId }
            })
        });

        if (!upstream.ok || !upstream.body) {
            const text = await upstream.text();
            res.write(`data: ${JSON.stringify({ code: upstream.status, message: text || 'upstream error' })}\n\n`);
            res.write('event: done\ndata: [DONE]\n\n');
            res.end();
            return;
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        let assistantContent = '';
        let doneReceived = false;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;

                const payload = trimmed.replace(/^data:\s*/, '');
                if (payload === '[DONE]') {
                    doneReceived = true;
                    continue;
                }

                let content = '';
                try {
                    const json = JSON.parse(payload);
                    content =
                        json?.choices?.[0]?.delta?.content ??
                        json?.choices?.[0]?.message?.content ??
                        json?.data?.content ??
                        '';
                } catch {
                    // 如果不是 JSON，就直接透传文本
                    content = payload;
                }

                if (content) {
                    assistantContent += content;
                    res.write(`data: ${JSON.stringify({
                        code: '200',
                        msg: '操作成功',
                        data: { content, type: 'normal' }
                    })}\n\n`);
                }
            }
        }

        const finalAssistantContent = assistantContent.trim()
            ? assistantContent
            : '（AI未返回内容）';
        addMessage(resolved.session_id, 2, finalAssistantContent, resolved.id);

        if (doneReceived) {
            res.write('event: done\ndata: [DONE]\n\n');
            res.end();
        }
    } catch (error) {
        addMessage(resolved.session_id, 2, '（AI回复失败）', resolved.id);
        res.write(`data: ${JSON.stringify({ code: 500, message: error?.message || 'proxy error' })}\n\n`);
        res.write('event: done\ndata: [DONE]\n\n');
        res.end();
    }
});

// =====================
// API：获取情绪分析结果（基于用户最新消息）
// =====================
app.get('/api/psychological-chat/session/:sessionId/emotion', async (req, res) => {
    const { sessionId } = req.params;
    const resolved = resolveSessionRow(sessionId);
    if (!resolved) {
        res.json({
            code: '200',
            msg: '操作成功',
            data: normalizeEmotionPayload(null)
        });
        return;
    }
    const latestRow = getLatestUserMessage.get(String(resolved.session_id), String(resolved.id));
    const latestContent = latestRow?.content || '';

    if (!latestContent) {
        res.json({
            code: '200',
            msg: '操作成功',
            data: normalizeEmotionPayload(null)
        });
        return;
    }

    const cached = getEmotionCache.get(String(resolved.session_id));
    if (cached) {
        const parsed = safeJsonParse(cached.payload);
        if (parsed) {
            if (cached.lastUserContent !== latestContent) {
                const freshPromise = ensureEmotionAnalysis(resolved.session_id, latestContent);
                const fresh = await waitWithTimeout(freshPromise, EMOTION_WAIT_MS);
                if (fresh) {
                    res.json({
                        code: '200',
                        msg: '操作成功',
                        data: fresh
                    });
                    return;
                }

                res.json({
                    code: '200',
                    msg: '操作成功',
                    data: normalizeEmotionPayload(parsed)
                });
                return;
            }

            res.json({
                code: '200',
                msg: '操作成功',
                data: normalizeEmotionPayload(parsed)
            });
            return;
        }
    }

    const analysisPromise = ensureEmotionAnalysis(resolved.session_id, latestContent);
    const analysis = await waitWithTimeout(analysisPromise, EMOTION_WAIT_MS);
    if (analysis) {
        res.json({
            code: '200',
            msg: '操作成功',
            data: analysis
        });
        return;
    }

    const cachedAfterWait = getEmotionCache.get(String(resolved.session_id));
    if (cachedAfterWait) {
        const parsed = safeJsonParse(cachedAfterWait.payload);
        if (parsed) {
            res.json({
                code: '200',
                msg: '操作成功',
                data: normalizeEmotionPayload(parsed)
            });
            return;
        }
    }

    res.json({
        code: '200',
        msg: '操作成功',
        data: normalizeEmotionPayload(null)
    });
});

// 健康检查
app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

// 启动服务
app.listen(PORT, () => {
    console.log(`[llm-proxy] listening on :${PORT}`);
});
