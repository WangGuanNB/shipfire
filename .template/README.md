# ShipFire 模版更新系统

完整的系统说明请查看图片中的结构。

## 📁 目录结构

```
.template/
├── README.md                    # 本文件 - 系统说明
├── CHANGELOG.md                 # 更新日志（每次更新后添加记录）
├── update-template.md           # 更新文档标准模版（复制使用）
├── .template-sync.json          # 同步状态示例（克隆项目使用）
└── updates/                     # 更新文档目录
    ├── 2025-01-15-supabase-to-d1-migration.md      # D1 迁移完整指南
    └── 2025-01-20-subscription-payment.md          # 订阅支付完整指南
```

## 🚀 使用方法

### 对于模版维护者（你）

**完成新功能开发后：**

1. 复制模版创建更新文档
```bash
cp .template/update-template.md .template/updates/2025-01-XX-功能名.md
```

2. 让 AI 填写更新文档（提供代码变更）

3. 更新 CHANGELOG.md 添加记录

4. 提交
```bash
git add .template/
git commit -m "docs: 添加 XXX 功能更新文档"
```

### 对于克隆项目

**需要同步更新时：**

1. 查看可用更新
```bash
cat ~/shipfire/.template/CHANGELOG.md
```

2. 复制更新文档到克隆项目
```bash
cp ~/shipfire/.template/updates/2025-01-XX-功能名.md ./
```

3. 让 AI 读取文档并应用更新
```
提示词："请阅读这个更新文档，应用到我的项目中，保留我的定制代码"
```

4. 在项目中创建 `.template-sync.json` 记录同步状态

## 📝 更新文档规范

每个更新文档包含：
- 元数据（日期、类型、优先级）
- 影响的文件列表
- 迁移步骤（带命令）
- Before/After 代码对比
- 验证清单

参考 `update-template.md` 模版。

---

**维护者**：banner  
**模版版本**：2.6.0
