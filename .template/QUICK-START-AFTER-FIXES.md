# 修复后快速启动指南

## 🎯 立即执行的步骤

### 1. 执行数据库迁移（必须）

```bash
# 查看新生成的迁移文件（包含所有索引）
cat src/db/migrations/0001_sparkling_bushwacker.sql

# 执行迁移到远端 D1（将索引应用到数据库）
npx wrangler d1 migrations apply your-project-db --remote
```

**⚠️ 重要：** 如果你已经有旧的迁移文件，这个新的迁移会添加所有缺失的索引。

---

### 2. 本地测试

```bash
# 启动开发服务器
pnpm dev
```

**测试以下功能：**
- ✅ 用户注册（测试 `insertUser`）
- ✅ 用户更新（测试 `updateUserInviteCode`）
- ✅ 订单创建（测试 `insertOrder`）
- ✅ 订单查询（测试索引性能）
- ✅ 积分发放（测试 `insertCredit`）
- ✅ 计数查询（测试 `getUsersTotal`, `getPaidOrdersTotal`）

---

### 3. 部署到生产环境

```bash
# 构建项目
pnpm run cf:build

# 部署到 Cloudflare
pnpm run cf:deploy
```

---

## 🔍 验证修复效果

### 检查连接池问题是否解决

在高并发场景下测试：
```bash
# 使用 Apache Bench 或类似工具进行压力测试
ab -n 1000 -c 100 https://your-domain.com/api/users
```

**预期结果：**
- ✅ 所有请求成功
- ✅ 没有连接超时错误
- ✅ 内存占用稳定

---

### 检查 .returning() 问题是否解决

测试插入和更新操作：
```javascript
// 测试用户注册
const user = await insertUser({
  uuid: crypto.randomUUID(),
  email: "test@example.com",
  // ...
});
console.log("User created:", user); // 应该返回完整的用户对象

// 测试订单创建
const order = await insertOrder({
  order_no: "ORDER-" + Date.now(),
  user_uuid: user.uuid,
  // ...
});
console.log("Order created:", order); // 应该返回完整的订单对象
```

**预期结果：**
- ✅ 不再报错 "SQLite does not support RETURNING clause"
- ✅ 返回完整的对象数据

---

### 检查计数查询性能

测试计数查询速度：
```javascript
console.time("getUsersTotal");
const total = await getUsersTotal();
console.timeEnd("getUsersTotal");
console.log("Total users:", total);
```

**预期结果：**
- ✅ 查询时间 < 50ms（即使有 10,000+ 用户）
- ✅ 返回正确的计数

---

### 检查索引是否生效

查看查询计划：
```bash
# 连接到 D1 数据库
npx wrangler d1 execute your-project-db --command "EXPLAIN QUERY PLAN SELECT * FROM orders_shipfire WHERE user_uuid = 'xxx' AND status = 'paid'"
```

**预期结果：**
- ✅ 显示 "USING INDEX orders_user_status_idx"
- ✅ 不显示 "SCAN TABLE"（全表扫描）

---

## 📊 性能监控

### 使用 Drizzle Studio 查看数据

```bash
pnpm run db:studio
```

在浏览器中打开 `https://local.drizzle.studio`，可以：
- 查看所有表和索引
- 执行 SQL 查询
- 查看查询性能

---

### 监控生产环境性能

在 Cloudflare Dashboard 中查看：
1. **Workers Analytics** - 查看请求量和响应时间
2. **D1 Analytics** - 查看数据库查询性能
3. **Logs** - 查看错误日志

**关键指标：**
- 平均响应时间 < 100ms
- 错误率 < 0.1%
- CPU 使用率 < 50%

---

## 🚨 常见问题排查

### 问题 1：迁移执行失败

**错误信息：**
```
Error: index already exists
```

**解决方案：**
```bash
# 删除旧的迁移记录（仅在开发环境）
npx wrangler d1 execute your-project-db --command "DROP TABLE IF EXISTS __drizzle_migrations"

# 重新执行迁移
npx wrangler d1 migrations apply your-project-db --remote
```

---

### 问题 2：本地开发连接失败

**错误信息：**
```
D1 HTTP error 401: Unauthorized
```

**解决方案：**
检查 `.env.local` 中的环境变量：
```env
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_D1_DATABASE_ID=your-database-id
CLOUDFLARE_D1_TOKEN=your-api-token
```

确保 API Token 有 D1 编辑权限。

---

### 问题 3：查询仍然很慢

**可能原因：**
- 索引未生效
- 查询条件不匹配索引

**解决方案：**
```bash
# 查看表的索引
npx wrangler d1 execute your-project-db --command "SELECT * FROM sqlite_master WHERE type='index' AND tbl_name='orders_shipfire'"

# 查看查询计划
npx wrangler d1 execute your-project-db --command "EXPLAIN QUERY PLAN SELECT * FROM orders_shipfire WHERE user_uuid = 'xxx'"
```

---

### 问题 4：生产环境部署失败

**错误信息：**
```
Error: env.DB is undefined
```

**解决方案：**
检查 `wrangler.jsonc` 中的 D1 binding：
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "your-project-db",
      "database_id": "your-database-id"
    }
  ]
}
```

---

## 📚 相关文档

- [修复总结](./FIXES-APPLIED.md) - 详细的修复内容
- [安全审计报告](./D1-DATABASE-SECURITY-AUDIT.md) - 完整的问题分析
- [迁移文档](./updates/2025-01-15-supabase-to-d1-migration.md) - D1 迁移指南

---

## ✅ 修复完成检查清单

- [ ] 数据库迁移已执行
- [ ] 本地开发环境测试通过
- [ ] 用户注册功能正常
- [ ] 订单创建功能正常
- [ ] 积分发放功能正常
- [ ] 计数查询性能正常（< 50ms）
- [ ] 索引查询性能正常（< 10ms）
- [ ] 生产环境部署成功
- [ ] 压力测试通过（1000+ 并发）
- [ ] 性能监控正常

---

## 🎉 预期效果

修复完成后，你的应用将：
- ✅ 支持 10,000+ 并发用户
- ✅ 查询响应时间 < 50ms
- ✅ 内存占用减少 90%
- ✅ 不再出现连接耗尽问题
- ✅ 所有核心功能正常工作

如有任何问题，请参考审计报告或联系技术支持。
