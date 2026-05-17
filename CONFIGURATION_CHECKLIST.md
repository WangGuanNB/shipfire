# 🔧 ShipFire 配置检查清单

## ✅ 已完成的配置

### 1. 代码实现 ✅
- [x] 统一 Provider 接口
- [x] Provider Router（容错路由）
- [x] kie-gemini Provider
- [x] fal-gemini Provider
- [x] replicate-gemini Provider（已升级）
- [x] /api/generate-image 路由
- [x] 多语言错误处理
- [x] 依赖安装（@fal-ai/client）

### 2. 配置文件 ✅
- [x] `.env.local` - 本地开发环境变量
- [x] `wrangler.jsonc` - Cloudflare 部署配置

---

## ⚠️ 需要你配置的 API Keys

### 在 `.env.local` 中配置（本地开发）

```bash
# 1. kie.ai API Key（主力 Provider）
KIE_API_KEY="your_kie_api_key_here"

# 2. fal.ai API Key（备用 Provider）
FAL_KEY="your_fal_key_id:your_fal_key_secret"
```

### 在 Cloudflare Secrets 中配置（生产环境）

```bash
# 1. 配置 kie.ai API Key
pnpm wrangler secret put KIE_API_KEY
# 输入你的 kie.ai API Key

# 2. 配置 fal.ai API Key
pnpm wrangler secret put FAL_KEY
# 输入你的 fal.ai API Key（格式：key_id:key_secret）

# 3. 配置其他敏感信息（如果还没配置）
pnpm wrangler secret put AUTH_SECRET
pnpm wrangler secret put AUTH_GOOGLE_SECRET
pnpm wrangler secret put DEEPSEEK_API_KEY
pnpm wrangler secret put RESEND_API_KEY
# ... 等等
```

---

## 📋 API Key 申请指南

### 1. kie.ai API Key

**申请步骤**：
1. 访问 https://kie.ai
2. 注册账号
3. 进入 Dashboard
4. 找到 API Keys 页面
5. 创建新的 API Key
6. 复制 API Key（格式：32 位字符串）

**价格**：$0.09/张（nano-banana-pro 模型）

### 2. fal.ai API Key

**申请步骤**：
1. 访问 https://fal.ai
2. 注册账号
3. 进入 Dashboard
4. 找到 API Keys 页面
5. 创建新的 API Key
6. 复制 API Key（格式：`key_id:key_secret`，用冒号分隔）

**价格**：$0.039/张（nano-banana-2 模型）

**注意**：fal.ai 的 API Key 格式是 `key_id:key_secret`，中间用冒号分隔。

---

## 🧪 测试步骤

### 1. 本地测试

```bash
# 1. 确保已配置 API Keys
# 编辑 .env.local 文件，填入你的 API Keys

# 2. 启动开发服务器
pnpm dev

# 3. 测试 API（使用 curl 或 Postman）
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -H "Cookie: your_session_cookie" \
  -d '{
    "prompt": "A beautiful sunset over mountains",
    "aspect_ratio": "16:9",
    "resolution": "2K",
    "output_format": "png",
    "locale": "zh"
  }'
```

### 2. 测试不同的 Provider 配置

#### 测试 kie.ai（主力）
```bash
# .env.local
PRIMARY_PROVIDER="kie"
FALLBACK_PROVIDER="fal"
```

#### 测试 fal.ai（主力）
```bash
# .env.local
PRIMARY_PROVIDER="fal"
FALLBACK_PROVIDER="replicate"
```

#### 测试 replicate（保守配置）
```bash
# .env.local
PRIMARY_PROVIDER="replicate"
FALLBACK_PROVIDER="replicate"
```

### 3. 测试 Fallback 机制

```bash
# 临时禁用主力 provider 的 API Key
# 在 .env.local 中注释掉 KIE_API_KEY
# KIE_API_KEY="..."

# 重启服务器
pnpm dev

# 测试 API，应该自动切换到 fal.ai
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test fallback",
    "locale": "zh"
  }'

# 检查日志，应该看到：
# ⚠️ [ProviderRouter] Primary provider (kie) failed: ...
# 🔄 [ProviderRouter] Falling back to: fal
# ✅ [ProviderRouter] Fallback provider (fal) succeeded
```

---

## 🚀 部署到 Cloudflare

### 1. 配置 Secrets

```bash
# 进入项目目录
cd /Users/wangguan/Desktop/Banner/Code/shipfire

# 配置 kie.ai API Key
pnpm wrangler secret put KIE_API_KEY
# 输入: your_kie_api_key

# 配置 fal.ai API Key
pnpm wrangler secret put FAL_KEY
# 输入: key_id:key_secret

# 配置其他必需的 Secrets（如果还没配置）
pnpm wrangler secret put AUTH_SECRET
pnpm wrangler secret put AUTH_GOOGLE_SECRET
pnpm wrangler secret put DEEPSEEK_API_KEY
pnpm wrangler secret put RESEND_API_KEY
pnpm wrangler secret put CLOUDFLARE_D1_TOKEN
pnpm wrangler secret put R2_ACCESS_KEY_ID
pnpm wrangler secret put R2_SECRET_ACCESS_KEY
pnpm wrangler secret put CREEM_API_KEY
pnpm wrangler secret put CREEM_WEBHOOK_SECRET
```

### 2. 构建和部署

```bash
# 构建 Cloudflare 版本
pnpm run cf:build

# 部署到 Cloudflare
pnpm run cf:deploy
```

### 3. 验证部署

```bash
# 访问生产环境
https://shipstart.net

# 测试 API
curl -X POST https://shipstart.net/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Production test",
    "locale": "zh"
  }'
```

---

## 📊 监控和调试

### 查看日志

```bash
# 查看 Cloudflare Workers 日志
pnpm wrangler tail

# 或者在 Cloudflare Dashboard 中查看
# https://dash.cloudflare.com -> Workers & Pages -> shipfire -> Logs
```

### 查看统计信息

API 会自动记录统计信息（每 10 次请求输出一次）：

```
📊 [ProviderRouter] Statistics:
  Primary (kie):
    - Attempts: 100
    - Successes: 95
    - Failures: 5
  Fallback (fal):
    - Attempts: 5
    - Successes: 5
    - Failures: 0
  Overall:
    - Fallback Rate: 4.76%
```

---

## ✅ 最终检查清单

### 开发环境
- [ ] 已在 `.env.local` 中配置 `KIE_API_KEY`
- [ ] 已在 `.env.local` 中配置 `FAL_KEY`
- [ ] 本地测试成功（`pnpm dev`）
- [ ] API 调用成功
- [ ] Fallback 机制测试成功

### 生产环境
- [ ] 已使用 `wrangler secret put` 配置 `KIE_API_KEY`
- [ ] 已使用 `wrangler secret put` 配置 `FAL_KEY`
- [ ] 已更新 `wrangler.jsonc` 配置
- [ ] 构建成功（`pnpm run cf:build`）
- [ ] 部署成功（`pnpm run cf:deploy`）
- [ ] 生产环境测试成功

---

## 🎯 推荐配置

### 成本优先（推荐）

```bash
PRIMARY_PROVIDER="kie"      # $0.09/张
FALLBACK_PROVIDER="fal"     # $0.039/张
```

**优势**：
- 主力使用 kie.ai（便宜）
- 失败时切换到 fal.ai（更便宜且稳定）
- 成本最优

### 稳定优先

```bash
PRIMARY_PROVIDER="fal"      # $0.039/张
FALLBACK_PROVIDER="replicate"  # $0.05/张
```

**优势**：
- 主力使用 fal.ai（最稳定）
- 失败时切换到 replicate（现有）
- 稳定性最优

---

## 📞 需要帮助？

如果遇到问题，请检查：

1. **API Key 格式是否正确**
   - kie.ai: 32 位字符串
   - fal.ai: `key_id:key_secret`（用冒号分隔）

2. **环境变量是否正确配置**
   - 本地：`.env.local`
   - 生产：Cloudflare Secrets

3. **日志输出**
   - 查看控制台日志
   - 查看 Cloudflare Workers 日志

4. **网络连接**
   - 确保可以访问 kie.ai 和 fal.ai 的 API

---

**更新时间**: 2026-05-16  
**状态**: ✅ 配置文件已更新，等待 API Keys
