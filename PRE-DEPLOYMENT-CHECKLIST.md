# 🚀 ShipFire 生产环境部署前检查清单

## ✅ 代码检查结果

### 1. TypeScript 类型检查
- ✅ **通过** - 所有文件无类型错误
- ✅ 检查的文件：
  - `src/aisdk/image-provider.ts`
  - `src/aisdk/provider-router.ts`
  - `src/aisdk/provider-adapters.ts`
  - `src/lib/error-handler.ts`
  - `src/app/api/generate-image/route.ts`
  - `src/components/blocks/image-generator-tool/index.tsx`
  - `src/aisdk/index.ts`
  - `src/aisdk/replicate-gemini/replicate-gemini-provider.ts`

### 2. 构建测试
- ✅ **通过** - `pnpm run build` 成功
- ✅ 生成了 28 个静态页面
- ✅ 所有路由正常编译
- ⚠️ 注意：构建时有一个语言警告（`Language "zh" is not supported`），但不影响功能

---

## 🔍 潜在问题和建议

### ⚠️ 高优先级

#### 1. R2 存储配置检查
**当前配置**:
```env
R2_ACCOUNT_ID="4b42bdee50348916c19344c2aea39d94"
R2_BUCKET_NAME="fire-ship"
R2_ACCESS_KEY_ID="c5ee0d5254020251e99dddfba9692e15"
R2_SECRET_ACCESS_KEY="dff33824ee8f6611cd34734de6a4eeb36d131ff325d85a09330a196e33b2e718"
R2_PUBLIC_URL="https://cdn.shipstart.net"
```

**检查项**:
- [ ] 确认 R2 Bucket `fire-ship` 已创建
- [ ] 确认 API Token 有 **Object Read & Write** 权限
- [ ] 确认 R2_PUBLIC_URL 已正确配置（CDN 域名）
- [ ] 测试图片上传和访问

**测试命令**:
```bash
# 测试图片生成和上传
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test image", "aspect_ratio": "16:9"}'
```

---

#### 2. API Provider 配置检查

**当前配置**:
```env
PRIMARY_PROVIDER="kie"
FALLBACK_PROVIDER="fal"

KIE_API_KEY="your_actual_kie_key"
FAL_KEY="your_key_id:your_key_secret"
REPLICATE_API_TOKEN="r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**检查项**:
- [ ] 确认 kie.ai API Key 有效且有余额
- [ ] 确认 fal.ai API Key 有效且有余额
- [ ] 确认 Replicate API Token 有效且有余额
- [ ] 测试主力 provider（kie.ai）
- [ ] 测试备用 provider（fal.ai）
- [ ] 测试 fallback 机制（禁用主力 API Key）

**测试步骤**:
1. 测试 kie.ai:
   ```bash
   # 临时设置只用 kie
   PRIMARY_PROVIDER="kie"
   FALLBACK_PROVIDER="kie"
   # 测试生成
   ```

2. 测试 fal.ai:
   ```bash
   # 临时设置只用 fal
   PRIMARY_PROVIDER="fal"
   FALLBACK_PROVIDER="fal"
   # 测试生成
   ```

3. 测试 fallback:
   ```bash
   # 临时禁用 kie，测试是否自动切换到 fal
   KIE_API_KEY=""
   PRIMARY_PROVIDER="kie"
   FALLBACK_PROVIDER="fal"
   # 测试生成，应该自动使用 fal
   ```

---

#### 3. Cloudflare Secrets 配置

**需要配置的 Secrets**:
```bash
# 进入项目目录
cd /Users/wangguan/Desktop/Banner/Code/shipfire

# 配置认证相关
pnpm wrangler secret put AUTH_SECRET
pnpm wrangler secret put AUTH_GOOGLE_SECRET

# 配置数据库
pnpm wrangler secret put DATABASE_URL

# 配置 AI Provider
pnpm wrangler secret put KIE_API_KEY
pnpm wrangler secret put FAL_KEY
pnpm wrangler secret put REPLICATE_API_TOKEN

# 配置 R2 存储
pnpm wrangler secret put R2_ACCESS_KEY_ID
pnpm wrangler secret put R2_SECRET_ACCESS_KEY

# 配置邮件服务
pnpm wrangler secret put RESEND_API_KEY

# 配置 AI 服务
pnpm wrangler secret put DEEPSEEK_API_KEY

# 配置支付（如果启用）
pnpm wrangler secret put CREEM_API_KEY
pnpm wrangler secret put CREEM_WEBHOOK_SECRET
```

**检查项**:
- [ ] 所有必需的 Secrets 已配置
- [ ] Secrets 值与 `.env.local` 一致
- [ ] 没有将 Secrets 提交到 Git

---

### 💡 中优先级

#### 4. 环境变量一致性检查

**wrangler.jsonc vs .env.local 差异**:

| 变量 | wrangler.jsonc | .env.local | 状态 |
|------|----------------|------------|------|
| `NEXT_PUBLIC_WEB_URL` | `https://shipstart.net` | `https://fast3d.online` | ⚠️ 不一致 |
| `NEXT_PUBLIC_PROJECT_NAME` | `shipstart` | `fast3d` | ⚠️ 不一致 |
| `R2_BUCKET_NAME` | 未配置 | `fire-ship` | ⚠️ 缺失 |
| `R2_ACCESS_KEY_ID` | 未配置 | 已配置 | ⚠️ 缺失 |
| `R2_SECRET_ACCESS_KEY` | 未配置 | 已配置 | ⚠️ 缺失 |

**建议**:
1. 确认生产环境使用哪个域名（`shipstart.net` 还是 `fast3d.online`）
2. 统一 `wrangler.jsonc` 和 `.env.local` 的配置
3. 在 `wrangler.jsonc` 的 `vars` 中添加 R2 配置（非敏感部分）

**修复示例**:
```jsonc
// wrangler.jsonc
{
  "vars": {
    "NEXT_PUBLIC_WEB_URL": "https://fast3d.online",  // 改为实际域名
    "NEXT_PUBLIC_PROJECT_NAME": "fast3d",  // 改为实际项目名
    "R2_BUCKET_NAME": "fire-ship",  // 添加
    "R2_ACCOUNT_ID": "4b42bdee50348916c19344c2aea39d94",  // 添加
    "R2_PUBLIC_URL": "https://cdn.shipstart.net",  // 添加
    // ... 其他配置
  }
}
```

---

#### 5. 图片生成器前端调用检查

**当前实现**:
- ✅ 使用真实 API (`/api/generate-image`)
- ✅ 传递所有必需参数
- ✅ 显示进度条
- ✅ 下载和分享功能
- ✅ 宽高比下拉选择

**检查项**:
- [ ] 测试未登录用户 → 应弹出登录框
- [ ] 测试积分不足 → 应弹出购买页面
- [ ] 测试生成成功 → 显示真实图片
- [ ] 测试下载功能
- [ ] 测试分享功能（复制 URL）
- [ ] 测试进度条显示
- [ ] 测试响应式布局（手机/平板/桌面）

---

### 📝 低优先级

#### 6. 文档和注释

**已完成**:
- ✅ API 升级文档（`.template/updates/2025-01-20-api-provider-upgrade.md`）
- ✅ 图片生成器升级文档（`.template/updates/2025-01-20-image-generator-upgrade.md`）
- ✅ CHANGELOG 更新
- ✅ SUMMARY 更新

**建议**:
- [ ] 添加生产环境部署文档
- [ ] 添加故障排查指南
- [ ] 添加监控和告警配置

---

#### 7. 性能优化建议

**当前配置**:
- 主力: kie.ai ($0.09/张)
- 备用: fal.ai ($0.039/张)

**建议**:
考虑将主力和备用对调，因为 fal.ai 更便宜且更稳定：
```env
PRIMARY_PROVIDER="fal"      # $0.039/张（最便宜）
FALLBACK_PROVIDER="replicate"  # $0.05/张（现有）
```

**成本对比**:
- 当前配置: 主力 $0.09/张，备用 $0.039/张
- 建议配置: 主力 $0.039/张，备用 $0.05/张
- **节省**: 56% 成本（假设 95% 使用主力）

---

## 🚀 部署步骤

### 1. 最终检查
```bash
# 1. 确保所有测试通过
pnpm run build

# 2. 检查 Git 状态
git status

# 3. 查看待提交的更改
git diff
```

### 2. 提交代码
```bash
# 1. 添加所有更改
git add .

# 2. 提交（使用有意义的提交信息）
git commit -m "feat: upgrade image generation API with multi-provider fallback

- Add unified Provider interface (ImageProvider)
- Implement triple fallback mechanism (kie.ai + fal.ai + replicate)
- Add multi-language error handling (zh/en)
- Optimize credit deduction (only on success)
- Add real-time progress bar to image generator
- Change aspect ratio from buttons to dropdown
- Update documentation and changelog

Closes #XXX"

# 3. 推送到远程
git push origin main
```

### 3. 配置 Cloudflare Secrets
```bash
# 按照上面"Cloudflare Secrets 配置"部分执行
```

### 4. 部署到 Cloudflare
```bash
# 部署
pnpm run cf:deploy

# 或者使用 wrangler 直接部署
pnpm wrangler deploy
```

### 5. 部署后验证
```bash
# 1. 访问生产环境
open https://fast3d.online

# 2. 测试图片生成功能
# - 登录
# - 进入 /image-generator
# - 输入提示词
# - 点击生成
# - 检查是否成功生成图片

# 3. 检查 Cloudflare Workers 日志
pnpm wrangler tail

# 4. 监控错误
# 在 Cloudflare Dashboard → Workers & Pages → shipfire → Logs
```

---

## ⚠️ 回滚计划

如果部署后出现问题：

### 方案 1: 快速回滚代码
```bash
# 1. 回滚到上一个版本
git revert HEAD

# 2. 推送
git push origin main

# 3. 重新部署
pnpm run cf:deploy
```

### 方案 2: 禁用新功能
```bash
# 临时禁用新的 provider，使用旧的 replicate
pnpm wrangler secret put PRIMARY_PROVIDER
# 输入: replicate

pnpm wrangler secret put FALLBACK_PROVIDER
# 输入: replicate
```

### 方案 3: 完全回滚
```bash
# 1. 找到上一个稳定版本的 commit
git log --oneline

# 2. 回滚到该 commit
git reset --hard <commit-hash>

# 3. 强制推送（谨慎使用）
git push origin main --force

# 4. 重新部署
pnpm run cf:deploy
```

---

## 📊 监控指标

部署后需要监控的指标：

### 1. 图片生成成功率
- 目标: >95%
- 监控: Cloudflare Workers 日志
- 告警: 成功率 <90%

### 2. Provider 使用情况
- 主力 provider 使用率
- Fallback 触发率
- 各 provider 成功率

### 3. 响应时间
- 图片生成平均时间
- 目标: <90 秒
- 告警: >120 秒

### 4. 错误率
- API 错误率
- 目标: <5%
- 告警: >10%

### 5. 成本
- 每日图片生成数量
- 每日成本
- 预算告警

---

## ✅ 最终检查清单

部署前请确认：

- [ ] 所有 TypeScript 类型检查通过
- [ ] 构建成功（`pnpm run build`）
- [ ] R2 存储配置正确
- [ ] API Provider 配置正确
- [ ] Cloudflare Secrets 已配置
- [ ] 环境变量一致性检查完成
- [ ] 前端功能测试通过
- [ ] 文档已更新
- [ ] Git 提交信息清晰
- [ ] 回滚计划已准备
- [ ] 监控指标已设置

---

## 🎉 部署完成后

1. **通知团队**: 新功能已上线
2. **监控日志**: 观察前 1 小时的运行情况
3. **收集反馈**: 询问用户体验
4. **记录问题**: 如有问题，记录到 issue tracker
5. **优化迭代**: 根据监控数据和用户反馈持续优化

---

**检查完成时间**: 2025-01-20  
**检查人**: Kiro AI  
**状态**: ✅ 准备就绪，可以部署

**建议**: 先在测试环境部署，验证无误后再部署到生产环境。
