# 🚨 严重安全漏洞审计报告 - API 暴露风险

## 审计日期
2025-01-20

## 审计类型
**紧急安全审计** - 响应 shipany-template-two Config 表泄露事件

---

## 🔴 严重安全漏洞（立即修复）

### 漏洞 1: Demo API 无认证保护 - API Key 泄露风险 🔴🔴🔴

**影响等级**: 🔴 **极其严重** - 可能导致 API 费用被刷爆

#### 受影响的文件

1. **`src/app/api/demo/gen-image/route.ts`**
   - ❌ 无任何认证检查
   - ❌ 任何人都可以调用
   - ❌ 直接使用你的 API Keys

2. **`src/app/api/demo/gen-text/route.ts`**
   - ❌ 无任何认证检查
   - ❌ 任何人都可以调用
   - ❌ 直接使用你的 API Keys

#### 暴露的 API Keys

这些 API 会使用以下环境变量中的 API Keys：

```typescript
// gen-image/route.ts 使用：
- OPENAI_API_KEY (OpenAI)
- REPLICATE_API_KEY (Replicate)
- KLING_API_KEY (Kling)
- R2_ACCESS_KEY_ID (Cloudflare R2)
- R2_SECRET_ACCESS_KEY (Cloudflare R2)

// gen-text/route.ts 使用：
- OPENAI_API_KEY (OpenAI)
- DEEPSEEK_API_KEY (DeepSeek)
- OPENROUTER_API_KEY (OpenRouter)
- SILICONFLOW_API_KEY (SiliconFlow)
```

#### 攻击场景

```bash
# 攻击者可以无限调用你的 API
curl -X POST https://your-domain.com/api/demo/gen-image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "expensive high-resolution image",
    "provider": "openai",
    "model": "dall-e-3"
  }'

# 攻击者可以写脚本循环调用
for i in {1..10000}; do
  curl -X POST https://your-domain.com/api/demo/gen-text \
    -H "Content-Type: application/json" \
    -d '{"prompt": "test", "provider": "openai", "model": "gpt-4"}'
done
```

#### 实际风险

- 💰 **OpenAI GPT-4**: $0.03/1K tokens - 10万次调用 = $3,000+
- 💰 **DALL-E 3**: $0.04/image - 1万张图片 = $400+
- 💰 **Replicate**: 按使用量计费 - 可能数千美元
- 💰 **R2 存储**: 无限上传文件，消耗存储和流量

#### 代码问题

```typescript
// ❌ 当前代码 - 无认证检查
export async function POST(req: Request) {
  try {
    const { prompt, provider, model } = await req.json();
    // 直接使用 API，没有任何认证检查！
    const { images } = await generateImage({
      model: imageModel,
      prompt: prompt,
    });
    return respData(processedImages);
  } catch (err) {
    return respErr("gen image failed");
  }
}
```

---

### 漏洞 2: 图片上传 API 无认证保护 🔴🔴

**影响等级**: 🔴 **严重** - 可能导致存储费用激增

#### 受影响的文件

**`src/app/api/upload-image/route.ts`**

#### 问题代码

```typescript
export async function POST(request: NextRequest) {
  try {
    // ❌ 有 auth() 调用，但没有检查结果！
    const session = await auth();
    
    const body: ImageUploadRequest = await request.json();
    // 直接处理上传，没有验证 session 是否存在
    const storage = newStorage();
    const uploadResult = await storage.uploadFile({
      body: imageBuffer,
      key: storageKey,
      contentType: mimeType,
    });
    return NextResponse.json({ success: true, imageUrl: publicUrl });
  } catch (error) {
    return NextResponse.json({ success: false });
  }
}
```

#### 攻击场景

```bash
# 攻击者可以无限上传文件到你的 R2
curl -X POST https://your-domain.com/api/upload-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "base64_encoded_large_file",
    "mimeType": "image/png"
  }'
```

#### 实际风险

- 💰 **R2 存储费用**: $0.015/GB/月
- 💰 **R2 流量费用**: $0.36/GB（出站流量）
- 📦 **存储空间**: 攻击者可以上传大量文件填满存储
- 🌐 **带宽**: 如果文件被访问，会产生大量流量费用

---

### 漏洞 3: Demo Stream Text API 无认证保护 🔴🔴

**影响等级**: 🔴 **严重**

#### 受影响的文件

**`src/app/api/demo/gen-stream-text/route.ts`**

#### 问题

- ❌ 无认证检查
- ❌ 使用流式响应，可能长时间占用资源
- ❌ 暴露 OpenAI、DeepSeek、OpenRouter API Keys

---

## 🟡 中等安全问题

### 问题 1: 用户信息 API 返回完整对象 🟡

**文件**: `src/app/api/get-user-info/route.ts`

#### 问题

```typescript
export async function POST(req: Request) {
  const user_uuid = await getUserUuid();
  const dbUser = await findUserByUuid(user_uuid);
  
  // ⚠️ 返回完整的数据库用户对象
  const user = {
    ...(dbUser as unknown as User),
    credits: userCredits,
  };
  
  return respData(user);
}
```

#### 风险

虽然有认证检查，但返回了完整的用户对象，可能包含：
- `signin_ip` - 用户登录 IP
- `signin_openid` - 第三方登录 ID
- `invited_by` - 邀请关系
- 其他内部字段

#### 建议

只返回必要的字段：

```typescript
const user = {
  uuid: dbUser.uuid,
  email: dbUser.email,
  nickname: dbUser.nickname,
  avatar_url: dbUser.avatar_url,
  locale: dbUser.locale,
  invite_code: dbUser.invite_code,
  credits: userCredits,
};
```

---

### 问题 2: Update Invite API 返回完整用户对象 🟡

**文件**: `src/app/api/update-invite/route.ts`

#### 问题

```typescript
export async function POST(req: Request) {
  const { invite_code, user_uuid } = await req.json();
  
  // ⚠️ 从请求体接收 user_uuid，没有验证是否是当前登录用户
  const user = await findUserByUuid(user_uuid);
  
  // ⚠️ 返回完整用户对象
  return respData(user);
}
```

#### 风险

1. **权限问题**: 没有验证 `user_uuid` 是否是当前登录用户
2. **信息泄露**: 返回完整用户对象

---

## 🟢 低风险问题

### 问题 1: Contact 和 Feedback API 无认证 🟢

**文件**: 
- `src/app/api/contact/route.ts`
- `src/app/api/add-feedback/route.ts`

#### 说明

这两个 API 无认证是**合理的**，因为：
- 允许未登录用户提交反馈
- 允许未登录用户联系支持

但建议添加：
- ✅ Rate limiting（速率限制）
- ✅ CAPTCHA 验证
- ✅ IP 黑名单

---

## 📊 安全风险总结

| 漏洞 | 严重程度 | 影响 | 修复优先级 |
|-----|---------|------|-----------|
| Demo API 无认证 | 🔴 极其严重 | API 费用被刷爆 | 🔴 立即修复 |
| 图片上传无认证 | 🔴 严重 | 存储费用激增 | 🔴 立即修复 |
| Stream Text 无认证 | 🔴 严重 | API 费用被刷 | 🔴 立即修复 |
| 返回完整用户对象 | 🟡 中等 | 信息泄露 | 🟡 尽快修复 |
| Update Invite 权限 | 🟡 中等 | 权限绕过 | 🟡 尽快修复 |
| Contact/Feedback 无限制 | 🟢 低 | 垃圾信息 | 🟢 计划修复 |

---

## 🔧 修复方案

### 方案 1: 添加认证检查（推荐）

为所有 Demo API 添加认证和积分检查：

```typescript
// ✅ 修复后的代码
export async function POST(req: Request) {
  try {
    // 1. 检查用户认证
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth");
    }
    
    // 2. 检查积分（可选）
    const credits = await getUserCredits(user_uuid);
    if (credits < 10) {
      return respErr("insufficient credits");
    }
    
    // 3. 扣除积分
    await decreaseCredits({
      user_uuid,
      trans_type: CreditsTransType.ImageGeneration,
      credits: 10,
    });
    
    // 4. 执行业务逻辑
    const { prompt, provider, model } = await req.json();
    const { images } = await generateImage({
      model: imageModel,
      prompt: prompt,
    });
    
    return respData(processedImages);
  } catch (err) {
    return respErr("gen image failed");
  }
}
```

---

### 方案 2: 禁用 Demo API（最安全）

如果这些 API 只是用于演示，建议：

#### 选项 A: 完全删除

```bash
rm -rf src/app/api/demo
```

#### 选项 B: 添加环境变量开关

```typescript
export async function POST(req: Request) {
  // 只在开发环境或明确启用时才允许访问
  if (process.env.NODE_ENV !== 'development' && 
      process.env.ENABLE_DEMO_API !== 'true') {
    return respErr("demo api disabled");
  }
  
  // ... 原有逻辑
}
```

---

### 方案 3: 添加 API Key 认证

为 Demo API 添加独立的 API Key 认证：

```typescript
export async function POST(req: Request) {
  try {
    // 检查 API Key
    const apiKey = req.headers.get('x-api-key');
    const validApiKey = process.env.DEMO_API_KEY;
    
    if (!apiKey || apiKey !== validApiKey) {
      return respErr("invalid api key");
    }
    
    // ... 原有逻辑
  } catch (err) {
    return respErr("gen image failed");
  }
}
```

---

## 🛡️ 防护措施建议

### 1. 立即行动（今天）

- [ ] **禁用或删除所有 Demo API**
- [ ] **为 upload-image API 添加认证检查**
- [ ] **检查 API Keys 是否已被滥用**
  - 登录 OpenAI Dashboard 查看使用量
  - 登录 Replicate Dashboard 查看使用量
  - 登录 Cloudflare R2 查看存储使用量

### 2. 短期修复（本周）

- [ ] 为所有需要认证的 API 添加认证检查
- [ ] 修复 `update-invite` API 的权限问题
- [ ] 只返回必要的用户字段
- [ ] 添加 Rate Limiting

### 3. 长期改进（本月）

- [ ] 实施 API Key 管理系统
- [ ] 添加使用量监控和告警
- [ ] 实施 IP 白名单/黑名单
- [ ] 添加 CAPTCHA 验证
- [ ] 实施请求日志和审计

---

## 🔍 如何检查是否已被攻击

### 1. 检查 API 使用量

```bash
# OpenAI
# 登录 https://platform.openai.com/usage
# 查看最近的 API 调用量是否异常

# Replicate
# 登录 https://replicate.com/account/billing
# 查看最近的使用量

# Cloudflare R2
# 登录 Cloudflare Dashboard
# 查看 R2 存储使用量和请求数
```

### 2. 检查服务器日志

```bash
# 搜索 demo API 的调用日志
grep "demo/gen-image" /var/log/nginx/access.log
grep "demo/gen-text" /var/log/nginx/access.log
grep "upload-image" /var/log/nginx/access.log

# 查找异常的高频请求
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20
```

### 3. 检查数据库

```sql
-- 查找异常的大量订单或积分消耗
SELECT user_uuid, COUNT(*) as count 
FROM orders_shipfire 
WHERE created_at > datetime('now', '-7 days')
GROUP BY user_uuid 
ORDER BY count DESC 
LIMIT 20;

-- 查找异常的积分消耗
SELECT user_uuid, SUM(credits) as total_credits
FROM credits_shipfire
WHERE created_at > datetime('now', '-7 days')
  AND trans_type = 'consume'
GROUP BY user_uuid
ORDER BY total_credits DESC
LIMIT 20;
```

---

## 📋 修复验证清单

修复后，验证以下内容：

### Demo API
- [ ] 未登录用户访问 `/api/demo/gen-image` 返回 401 或 403
- [ ] 未登录用户访问 `/api/demo/gen-text` 返回 401 或 403
- [ ] 未登录用户访问 `/api/demo/gen-stream-text` 返回 401 或 403
- [ ] 登录用户访问需要扣除积分
- [ ] 积分不足时返回错误

### Upload API
- [ ] 未登录用户访问 `/api/upload-image` 返回 401 或 403
- [ ] 登录用户可以正常上传
- [ ] 上传有大小限制（建议 5MB）
- [ ] 上传有频率限制（建议 10次/分钟）

### User Info API
- [ ] 只返回必要的用户字段
- [ ] 不返回 `signin_ip`、`signin_openid` 等敏感字段

### Update Invite API
- [ ] 验证 `user_uuid` 是否是当前登录用户
- [ ] 只返回必要的用户字段

---

## 🚨 紧急联系方式

如果发现已被攻击：

1. **立即禁用 API**
   ```bash
   # 临时方案：在 Cloudflare 或 Nginx 中阻止这些路径
   # /api/demo/*
   # /api/upload-image
   ```

2. **撤销并重新生成所有 API Keys**
   - OpenAI API Key
   - Replicate API Key
   - Kling API Key
   - DeepSeek API Key
   - OpenRouter API Key
   - SiliconFlow API Key
   - Cloudflare R2 Access Keys

3. **联系支付平台**
   - 如果费用异常，立即联系平台客服
   - 申请费用减免（如果是被攻击导致）

---

## 📚 参考资料

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Next.js Authentication Best Practices](https://nextjs.org/docs/authentication)
- [Cloudflare Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)

---

**审计完成日期**: 2025-01-20  
**审计人员**: Kiro AI  
**严重程度**: 🔴 极其严重  
**建议行动**: 立即修复

---

## ⚠️ 重要提醒

**这不是 Config 表泄露问题**（因为你的项目没有 Config 表），但是：

1. **Demo API 无认证** 的问题**更严重**
2. 任何人都可以直接使用你的 API Keys
3. 这会导致和群友一样的问题：**API 费用被刷爆**

**请立即采取行动！**
