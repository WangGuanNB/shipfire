# 更新说明：图片生成器完整升级

## 元数据
- **更新日期**：2025-01-20
- **更新类型**：功能增强
- **影响范围**：UI层 + API层
- **优先级**：中（功能）
- **兼容性**：向后兼容
- **预计工作量**：中（2-4小时）

## 更新摘要

将 `/image-generator` 页面从模拟调用升级为真实 API 调用，集成 kie.ai、fal.ai、replicate 三个 AI provider，支持自动容错切换。新增实时进度条、下载、分享功能，并配置 Cloudflare R2 存储。同时优化 UI，将宽高比选择从按钮网格改为下拉选择。

## 背景说明

原有的图片生成器只是模拟调用，消耗用户积分但只显示占位图，没有实际价值。本次升级集成真实的 AI 图片生成 API，让用户获得真实的 AI 生成图片，大幅提升用户体验和产品价值。

---

## 影响的文件

### 修改文件
- `src/components/blocks/image-generator-tool/index.tsx` - 图片生成器组件（核心修改）
- `.env.local` - R2 存储配置

### 相关文件（已存在）
- `src/app/api/generate-image/route.ts` - 图片生成 API（已实现）
- `src/lib/storage.ts` - R2 存储工具（已实现）
- `src/lib/provider-router.ts` - Provider 路由（已实现）

---

## 配置变更

### 环境变量

#### R2 存储配置（必需）

```env
# Cloudflare R2 存储配置
R2_ACCOUNT_ID="your-account-id"              # Cloudflare Account ID
R2_BUCKET_NAME="shipfire-images"             # R2 Bucket 名称
R2_ACCESS_KEY_ID="your-access-key"           # R2 API Token Access Key
R2_SECRET_ACCESS_KEY="your-secret-key"       # R2 API Token Secret Key
R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"     # R2 公开访问 URL（可选）
```

#### AI Provider 配置（已有）

```env
# 主力 Provider
PRIMARY_PROVIDER="kie"                        # kie / fal / replicate
KIE_API_KEY="your-kie-key"
KIE_MODEL="nano-banana-2"

# 备用 Provider
FALLBACK_PROVIDER="fal"
FAL_KEY="your-fal-key"
FAL_MODEL="fal-ai/nano-banana-2"

# 第三备用
REPLICATE_API_TOKEN="your-replicate-token"
REPLICATE_MODEL="google/nano-banana"
```

---

## 核心功能

### 1. 真实 API 调用

**修改前（假调用）**:
```typescript
// ❌ 调用消耗积分 API，然后显示占位图
const resp = await fetch("/api/consume-image-credits", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
});
await new Promise((r) => setTimeout(r, 2000));
setGeneratedImage(PLACEHOLDER_IMAGE);
```

**修改后（真实调用）**:
```typescript
// ✅ 调用真实的图片生成 API
const resp = await fetch("/api/generate-image", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: prompt.trim(),
    aspect_ratio: aspectRatio,
    resolution: resolution,
    output_format: "png",
    locale: document.documentElement.lang || "en",
  }),
});

const res = await resp.json();

// 处理响应
if (res.code === 0 && res.data?.url) {
  setGeneratedImage(res.data.url);
  toast.success(`Image generated (provider: ${res.data.provider})`);
}
```

**关键变化**:
- ✅ 传递完整参数（prompt, aspect_ratio, resolution, output_format, locale）
- ✅ 显示真实生成的图片 URL
- ✅ 显示使用的 provider 信息
- ✅ 显示是否使用了备用 provider

---

### 2. 实时进度条

**功能**:
- 0-100% 进度显示
- 实时进度消息
- 预计时间提示（30-90 秒）
- 平滑动画效果

**实现**:
```typescript
// 状态管理
const [progress, setProgress] = useState(0);
const [progressMessage, setProgressMessage] = useState("");

// 进度模拟（每秒增加 5-10%）
const progressInterval = setInterval(() => {
  setProgress((prev) => {
    if (prev >= 90) return prev;
    return prev + Math.random() * 10;
  });
}, 1000);

// 进度消息更新
setTimeout(() => setProgressMessage("Connecting to AI provider..."), 500);
setTimeout(() => setProgressMessage("Generating image..."), 2000);
setTimeout(() => setProgressMessage("Processing..."), 10000);
setTimeout(() => setProgressMessage("Almost done..."), 30000);

// API 完成后
clearInterval(progressInterval);
setProgress(95);
setProgressMessage("Finalizing...");

// 图片加载完成
setProgress(100);
setProgressMessage("Complete!");
```

**进度阶段**:
1. 0% - Initializing...
2. 10-20% - Connecting to AI provider...
3. 20-50% - Generating image...
4. 50-90% - Processing...
5. 90-95% - Almost done...
6. 95-100% - Finalizing...
7. 100% - Complete!

---

### 3. 下载功能

```typescript
<Button
  size="sm"
  variant="secondary"
  onClick={() => {
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `generated-${Date.now()}.png`;
    link.click();
  }}
>
  <Icon name="RiDownloadLine" className="mr-1 size-4" />
  Download
</Button>
```

**功能**:
- 一键下载生成的图片
- 自动命名为 `generated-{timestamp}.png`
- 保存到本地

---

### 4. 分享功能

```typescript
<Button
  size="sm"
  variant="secondary"
  onClick={() => {
    navigator.clipboard.writeText(generatedImage);
    toast.success("Image URL copied to clipboard");
  }}
>
  <Icon name="RiShareLine" className="mr-1 size-4" />
  Share
</Button>
```

**功能**:
- 复制图片 URL 到剪贴板
- 用户可以分享给其他人
- 显示成功提示

---

### 5. UI 优化：宽高比下拉选择

**修改前（按钮网格）**:
```typescript
<div className="grid grid-cols-4 gap-2">
  {ASPECT_RATIOS.map(({ value, label }) => (
    <Button
      key={value}
      variant={aspectRatio === value ? "default" : "outline"}
      onClick={() => setAspectRatio(value)}
    >
      {label}
    </Button>
  ))}
</div>
```

**修改后（下拉选择）**:
```typescript
<select
  id="aspect-ratio"
  value={aspectRatio}
  onChange={(e) => setAspectRatio(e.target.value)}
  disabled={isGenerating}
  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
>
  {ASPECT_RATIOS.map(({ value, label }) => (
    <option key={value} value={value}>
      {label}
    </option>
  ))}
</select>
```

**优势**:
- ✅ 节省空间（11 个选项不占用大量空间）
- ✅ 更符合表单设计规范
- ✅ 与其他输入框样式一致
- ✅ 更易于扩展（添加更多选项）

---

## R2 存储配置步骤

### 步骤 1：创建 R2 Bucket

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧菜单 → **R2 Object Storage**
3. 点击 **Create bucket**
4. Bucket 名称：`shipfire-images`
5. 位置：选择离用户最近的区域（如 `APAC`）
6. 点击 **Create bucket**
7. 记录 **Account ID**（在 R2 页面右侧）

### 步骤 2：创建 R2 API Token

1. R2 页面 → 右上角 **Manage R2 API Tokens**
2. 点击 **Create API token**
3. Token 名称：`shipfire-r2-token`
4. **Permissions**: 选择 **Object Read & Write**
5. **TTL**: 选择 **Forever**
6. **Bucket**: 选择 `shipfire-images`
7. 点击 **Create API Token**
8. **重要**: 复制并保存 **Access Key ID** 和 **Secret Access Key**（只显示一次）

### 步骤 3：配置公开访问（可选）

1. 进入 Bucket → **Settings** 标签
2. 找到 **Public access** 部分
3. 点击 **Allow Access**
4. 选择 **Connect a custom domain** 或使用默认的 `r2.dev` 域名
5. 记录公开 URL（如 `https://pub-xxxxx.r2.dev`）

### 步骤 4：更新 .env.local

```env
R2_ACCOUNT_ID="4b42bdee50348916c19344c2aea39d94"
R2_BUCKET_NAME="shipfire-images"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"
```

### 步骤 5：重启开发服务器

```bash
# 停止当前服务器（Ctrl+C）
pnpm dev
```

---

## API 响应格式

### 成功响应 (code: 0)
```typescript
{
  code: 0,
  message: "success",
  data: {
    url: string,              // 生成的图片 URL
    key: string,              // R2 存储的 key
    provider: string,         // 使用的 provider（kie/fal/replicate）
    fallbackUsed: boolean,    // 是否使用了备用 provider
  }
}
```

### 积分不足 (code: -3)
```typescript
{
  code: -3,
  message: "insufficient credits",
  data: {
    insufficient: true,
    required: number,
    available: number,
  }
}
```

### 未登录 (code: -2)
```typescript
{
  code: -2,
  message: "no auth"
}
```

---

## 注意事项

⚠️ **重要警告**
- R2 配置必须正确，否则图片无法上传
- API Token 只显示一次，务必保存
- 不要将 API Token 提交到 Git 仓库

💡 **最佳实践**
- 使用 fal.ai 作为主力 provider（最便宜 $0.039/张）
- 配置备用 provider 确保高可用性
- 定期清理 R2 中的旧图片降低成本
- 启用 Cloudflare CDN 加速图片访问

✅ **兼容性说明**
- 向后兼容，不影响现有功能
- 用户积分系统保持不变
- 只有生成成功才扣除积分

---

## 验证清单

完成更新后，请逐项检查：

- [ ] R2 Bucket 已创建
- [ ] R2 API Token 已创建并配置
- [ ] `.env.local` 已更新
- [ ] 开发服务器已重启
- [ ] 配置日志显示正确
- [ ] 未登录用户点击生成 → 弹出登录框
- [ ] 登录用户积分不足 → 弹出购买页面
- [ ] 登录用户积分充足 → 成功生成图片
- [ ] 生成过程显示进度条
- [ ] 进度消息正确更新
- [ ] 生成成功显示真实图片（不是占位图）
- [ ] 点击下载按钮 → 下载图片到本地
- [ ] 点击分享按钮 → 复制 URL 到剪贴板
- [ ] 生成成功后积分减少
- [ ] 生成失败不扣积分
- [ ] 图片可以在 R2 Bucket 中看到
- [ ] 宽高比下拉选择正常工作
- [ ] 响应式布局正常（手机/平板/桌面）

---

## 回滚方案

如果更新出现问题，可以按以下步骤回滚：

1. **代码回滚**
   ```bash
   git revert <commit-hash>
   ```

2. **恢复旧的组件代码**
   - 从 Git 历史恢复 `src/components/blocks/image-generator-tool/index.tsx`

3. **清除 R2 配置**（可选）
   ```env
   # 注释掉 R2 配置
   # R2_ACCOUNT_ID=""
   # R2_BUCKET_NAME=""
   # R2_ACCESS_KEY_ID=""
   # R2_SECRET_ACCESS_KEY=""
   ```

---

## 常见问题

### Q1: 为什么需要 R2 存储？

**A**: 生成的图片需要存储在某个地方才能显示给用户。R2 是 Cloudflare 的对象存储服务，类似于 AWS S3，但更便宜。

**费用**:
- 存储: $0.015/GB/月
- 出站流量: 免费（使用 Cloudflare CDN）
- 操作: 免费（前 100 万次/月）

### Q2: 图片生成需要多长时间？

**A**: 根据 AI provider 和图片复杂度：
- **kie.ai**: 60-80 秒
- **fal.ai**: 30-50 秒
- **replicate**: 40-60 秒

进度条会显示预计时间（30-90 秒）。

### Q3: 如果主力 provider 失败怎么办？

**A**: API 会自动切换到备用 provider：
1. 尝试主力 provider（如 kie.ai）
2. 失败 → 自动切换到备用（如 fal.ai）
3. 还失败 → 尝试第三备用（如 replicate）
4. 返回成功的 provider 和是否使用了备用

### Q4: R2 配置错误会怎样？

**A**: 会出现以下错误：
```
Error: Bucket is required
Error: Access Key is required
Error: Upload failed: 403 Forbidden
```

**解决方法**: 检查 `.env.local` 中的 R2 配置是否正确。

### Q5: 如何降低成本？

**A**: 几个建议：
1. 使用 fal.ai 作为主力（最便宜 $0.039/张）
2. 使用较低分辨率（1K 而不是 4K）
3. 定期清理 R2 中的旧图片
4. 启用 Cloudflare CDN 减少出站流量

---

## 性能优化

### 1. Provider 成本对比

| Provider | 成本/张 | 速度 | 稳定性 | 推荐 |
|---------|--------|------|--------|------|
| **fal.ai** | $0.039 | 快（30-50s） | 高 | ⭐⭐⭐ 主力 |
| **replicate** | $0.05 | 中（40-60s） | 高 | ⭐⭐ 备用 |
| **kie.ai** | $0.09 | 慢（60-80s） | 中 | ⭐ 第三备用 |

**推荐配置**:
```env
PRIMARY_PROVIDER="fal"      # 最便宜且稳定
FALLBACK_PROVIDER="replicate"  # 现有
```

### 2. 进度条性能

- 使用 CSS `transition` 而不是 JavaScript 动画
- 定时器在完成后立即清理
- 状态更新节流（每秒一次）

### 3. R2 存储优化

- 使用 Cloudflare CDN 加速访问
- 设置合理的缓存策略
- 定期清理未使用的图片

---

## 用户体验提升

| 功能 | 修改前 | 修改后 | 提升 |
|-----|-------|-------|-----|
| 图片生成 | ❌ 假的占位图 | ✅ 真实 AI 图片 | +100% |
| 进度反馈 | ❌ 无进度显示 | ✅ 实时进度条 | +100% |
| 下载功能 | ❌ 无 | ✅ 一键下载 | +100% |
| 分享功能 | ❌ 无 | ✅ 复制 URL | +100% |
| Provider 信息 | ❌ 无 | ✅ 显示 provider | +100% |
| 容错机制 | ❌ 无 | ✅ 自动切换 | +100% |
| 积分扣除 | ⚠️ 总是扣除 | ✅ 成功才扣 | +50% |
| UI 设计 | ⚠️ 按钮网格 | ✅ 下拉选择 | +30% |

---

## 相关文档

- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [R2 定价](https://developers.cloudflare.com/r2/pricing/)
- [R2 API 文档](https://developers.cloudflare.com/r2/api/)

---

## 更新日志

- **2025-01-20**: 初始版本
  - 真实 API 调用
  - 实时进度条
  - 下载和分享功能
  - R2 存储配置
  - UI 优化（宽高比下拉选择）

