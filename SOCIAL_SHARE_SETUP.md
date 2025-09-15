# Miniatur AI 社交分享功能配置指南

## 🎯 功能概述

这个社交分享功能允许用户：
- 将生成的AI微缩模型图片分享到各大社交媒体平台
- 支持Twitter、Facebook、LinkedIn、Pinterest、WhatsApp、Telegram、Reddit等平台
- 提供复制链接和下载功能
- 通过Cloudflare R2存储图片，确保分享链接的持久性
- 完整的分享统计和用户行为追踪

## 🛠️ 环境变量配置

### 必需的Cloudflare R2配置

```bash
# Cloudflare R2 存储配置
STORAGE_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
STORAGE_ACCESS_KEY="your_r2_access_key"
STORAGE_SECRET_KEY="your_r2_secret_key"
STORAGE_BUCKET="miniatur-ai-images"
STORAGE_REGION="auto"

# 可选：自定义域名用于公共访问
STORAGE_DOMAIN="https://your-custom-domain.com"

# 应用程序URL
NEXT_PUBLIC_WEB_URL="https://miniatur.org"
```

### Cloudflare R2 设置步骤

1. **创建R2存储桶**
   ```bash
   # 登录Cloudflare仪表板
   # 导航到 R2 Object Storage
   # 创建新的存储桶 "miniatur-ai-images"
   ```

2. **配置API令牌**
   ```bash
   # 在Cloudflare仪表板中：
   # 我的个人资料 > API令牌 > 创建令牌
   # 选择"自定义令牌"
   # 权限：Account - Cloudflare R2:Edit
   # 账户资源：包括 - 你的账户
   # 区域资源：包括 - 所有区域
   ```

3. **配置CORS（重要！）**
   ```json
   [
     {
       "AllowedOrigins": ["https://miniatur.org", "https://your-domain.com"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

4. **设置公共访问（可选）**
   ```bash
   # 在R2存储桶设置中启用公共访问
   # 或者配置自定义域名指向R2存储桶
   ```

## 📁 文件结构

```
src/
├── app/api/
│   ├── upload-image/route.ts     # 图片上传到R2的API
│   └── track-share/route.ts      # 分享统计追踪API
├── app/[locale]/share/page.tsx   # 分享页面展示
└── components/blocks/
    ├── social-share/index.tsx    # 社交分享组件
    └── miniatur-ai-generator/    # 更新的生成器组件
        └── index.tsx
```

## 🎨 组件使用示例

### 基本使用

```tsx
import SocialShare from '@/components/blocks/social-share';

<SocialShare
  imageUrl="https://your-domain.com/image.png"
  imageData="data:image/png;base64,..."
  mimeType="image/png"
  title="Check out my AI miniature!"
  description="Amazing figurine created with Miniatur AI"
  hashtags={["MiniaturAI", "AIGenerated"]}
  onShare={(platform) => console.log(`Shared to ${platform}`)}
/>
```

### 高级配置

```tsx
<SocialShare
  imageUrl={generatedImageUrl}
  imageData={base64ImageData}
  mimeType="image/png"
  title="🎨 My AI-Generated Miniature Masterpiece!"
  description="Transform your photos into collectible figurines with Miniatur AI - 100% free, no signup required!"
  hashtags={[
    "MiniaturAI", 
    "AIGenerated", 
    "Miniature", 
    "Figurine", 
    "AIArt", 
    "CollectibleFigurine"
  ]}
  onShare={(platform) => {
    // 自定义分析追踪
    analytics.track('image_shared', { platform });
  }}
/>
```

## 🔗 支持的社交平台

| 平台 | 分享类型 | 特殊功能 |
|------|----------|----------|
| **Twitter** | URL + 文本 | 自动添加话题标签 |
| **Facebook** | URL + 引用文本 | 自动获取图片预览 |
| **LinkedIn** | 专业分享 | 商务化描述文本 |
| **Pinterest** | 图片钉板 | 直接显示图片 |
| **WhatsApp** | 消息分享 | 移动端优化 |
| **Telegram** | 频道分享 | 即时通讯 |
| **Reddit** | 社区分享 | 标题优化 |
| **复制链接** | 剪贴板 | 一键复制 |
| **下载** | 本地保存 | 高质量图片 |
| **原生分享** | 系统分享 | 移动端支持 |

## 📊 分享统计功能

### 数据追踪

系统会自动追踪以下数据：
- 分享平台类型
- 分享时间戳
- 用户设备信息（可选）
- 图片URL（可选）
- 来源页面

### 统计查看

```typescript
// API调用示例
GET /api/track-share
// 返回支持的平台列表和服务状态

POST /api/track-share
// 提交分享事件数据
{
  "platform": "twitter",
  "imageUrl": "https://...",
  "userAgent": "...",
  "referrer": "..."
}
```

## 🎯 SEO优化

### 分享页面元数据

分享页面 (`/share`) 自动生成优化的元数据：

```html
<!-- Open Graph -->
<meta property="og:title" content="Amazing AI-Generated Miniature | Miniatur AI" />
<meta property="og:description" content="Check out this incredible miniature..." />
<meta property="og:image" content="https://your-r2-domain.com/image.png" />
<meta property="og:type" content="website" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Amazing AI-Generated Miniature" />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="https://..." />
```

## 🚀 部署注意事项

### 1. Vercel部署

```bash
# 确保在Vercel中设置所有环境变量
vercel env add STORAGE_ENDPOINT
vercel env add STORAGE_ACCESS_KEY
vercel env add STORAGE_SECRET_KEY
# ... 其他变量
```

### 2. 域名配置

```bash
# 如果使用自定义域名：
# 1. 在Cloudflare中设置CNAME记录
# 2. 在R2存储桶中绑定自定义域名
# 3. 更新STORAGE_DOMAIN环境变量
```

### 3. 安全考虑

```typescript
// CORS配置要严格限制origin
// API Key要定期轮换
// 图片要设置适当的过期时间
// 分享链接要包含防滥用机制
```

## 🐛 故障排除

### 常见问题

1. **图片上传失败**
   ```bash
   # 检查R2 API凭据
   # 验证存储桶权限
   # 确认CORS配置
   ```

2. **分享链接无效**
   ```bash
   # 检查STORAGE_DOMAIN配置
   # 验证R2公共访问设置
   # 确认图片文件存在
   ```

3. **社交平台预览异常**
   ```bash
   # 验证Open Graph标签
   # 检查图片URL可访问性
   # 使用Facebook调试工具测试
   ```

### 调试命令

```bash
# 测试R2连接
curl -X GET https://your-account-id.r2.cloudflarestorage.com/bucket-name

# 测试API端点
curl -X GET http://localhost:3000/api/upload-image
curl -X GET http://localhost:3000/api/track-share

# 验证环境变量
echo $STORAGE_ENDPOINT
echo $STORAGE_ACCESS_KEY
```

## 📈 使用指标

### 成功指标
- 分享成功率 > 95%
- 图片加载时间 < 2秒
- 社交平台预览正确显示率 > 90%

### 监控建议
- 设置R2存储使用量警报
- 监控API响应时间
- 追踪用户分享行为转化率

---

## 🎉 完成！

现在你的Miniatur AI应用已经具备了完整的社交分享功能！用户可以：

✅ 将AI生成的微缩模型分享到各大社交平台  
✅ 通过专业的分享页面展示作品  
✅ 享受快速可靠的图片存储服务  
✅ 帮助你实现用户裂变和品牌传播  

祝你的应用用户增长和分享传播成功！🚀


