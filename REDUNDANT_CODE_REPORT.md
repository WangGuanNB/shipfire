【任务要求】
请根据我提供的输入信息，为我的网页模版生成一篇 1200–1400 字 的落地页文案。
文案必须：

符合 SEO（关键词布局自然、语义相关丰富）

高转化率（强调价值、场景、用户问题）

语言自然可信（避免AI味、避免堆叠形容词）

严格遵循我提供的 JSON 输出格式与每个字段的“字数要求”


【输入信息】

工具名称：{{tool_name}}

主关键词：{{main_keyword}}

目标用户群体：{{target_users}}

工具核心价值主张：{{core_value}}

长尾关键词（3–5个）：{{longtail_keywords}}

可对标的网站：{{competitors}}

【输出格式要求（必须严格遵守）】
下面是你要生成的模块结构，每个字段都有字数限制，请严格遵守：
1. hero 模块
"hero": {
  "title": "（8–12字，包含主关键词，强调价值）",
  "highlight_text": "（2–4字）",
  "description": "（20–35字，强调主场景、主价值）",
  "announcement": {
      "label": "（2–4字）",
      "title": "（8–12字）"
  }
}


2. introduce 模块
"introduce": {
  "title": "（8–14字）",
  "label": "Introduction",
  "description": "（40–55字，解释工具是什么 + 关键价值）",
  "items": [
    {
      "title": "（10–14字）",
      "description": "（90–120字，描述特色、场景、用户价值）"
    },
    {
      "title": "（10–14字）",
      "description": "（90–120字）"
    },
    {
      "title": "（10–14字）",
      "description": "（90–120字）"
    }
  ]
}


3. benefit 模块
"benefit": {
  "title": "（10–16字）",
  "description": "（35–50字）",
  "items": [
    {
      "title": "（8–12字）",
      "description": "（80–110字）"
    },
    {
      "title": "（8–12字）",
      "description": "（80–110字）"
    },
    {
      "title": "（8–12字）",
      "description": "（80–110字）"
    }
  ]
}


4. usage 模块
"usage": {
  "title": "（10–16字）",
  "description": "（20–35字）",
  "items": [
    {
      "title": "（6–10字）",
      "description": "（30–45字）"
    },
    {
      "title": "（6–10字）",
      "description": "（30–45字）"
    },
    {
      "title": "（6–10字）",
      "description": "（30–45字）"
    }
  ]
}


5. feature 模块
"feature": {
  "title": "（12–18字）",
  "description": "（35–50字）",
  "items": [
    {
      "title": "（6–10字）",
      "description": "（45–70字）"
    },
    {
      "title": "（6–10字）",
      "description": "（45–70字）"
    },
    {
      "title": "（6–10字）",
      "description": "（45–70字）"
    },
    {
      "title": "（6–10字）",
      "description": "（45–70字）"
    }
  ]
}


6. faq 模块
"faq": {
  "title": "（8–12字）",
  "description": "（20–30字）",
  "items": [
    {
      "title": "（8–12字）",
      "description": "（40–70字）"
    },
    {
      "title": "（8–12字）",
      "description": "（40–70字）"
    },
    {
      "title": "（8–12字）",
      "description": "（40–70字）"
    },
    {
      "title": "（8–12字）",
      "description": "（40–70字）"
    }
  ]
}


7. testimonial 模块
"testimonial": {
  "title": "（12–18字）",
  "description": "（20–30字）",
  "items": [
    {
      "title": "（人名）",
      "label": "（6–12字）",
      "description": "（40–70字）"
    },
    {
      "title": "（人名）",
      "label": "（6–12字）",
      "description": "（40–70字）"
    },
    {
      "title": "（人名）",
      "label": "（6–12字）",
      "description": "（40–70字）"
    }
  ]
}


8. cta 模块
"cta": {
  "title": "（12–18字）",
  "description": "（30–45字）",
  "button_title": "（4–6字）"
}

【最终要求】

输出 严格遵守上述 JSON 结构

所有标题、描述必须满足字数要求

必须自然融入主关键词 + 长尾关键词

所有内容需真实、自然、有可信度

不要多输出我未要求的字段
















【目标】
生成一篇 1200–1400 字的落地页文案，既能被Google理解（SEO优化良好），又能吸引真实用户（高转化率），语言自然、有可信度。关键词密度控制在4%左右，避免关键词堆砌。

【输入信息】
- 工具名称：[ShipFire]
- 主关键词：[ShipFire]
- 次要关键词：[ShipFire free, ShipFire online, ShipFire AI等]
- 目标用户群体：[开发者]
- 工具核心价值主张（主卖点）：[快速免费搭建Saas网站]
- 长尾关键词与语义相关词（3–5个）：[ShipFire free, ShipFire online, ShipFire AI]
- 可以借鉴的竞品网站：[如有可填写]

【具体内容要求】

## 1. Hero 模块（总计 50-70 字）

**title（12-15字）：**
- 必须包含主关键词
- 体现核心功能和定位
- 格式：[主关键词] + [功能描述词] + [结果/价值]
- 示例结构："[主关键词] AI [功能] Maker" 或 "[主关键词] - [核心价值主张]"

**highlight_text（3-5字）：**
- 强调核心优势的关键词
- 使用动词或结果导向词汇
- 示例：Create Instantly / Start Now / Build Fast / Generate Free

**description（20~30字）：**
- 清晰说明工具如何解决用户痛点
- 包含1-2个具体功能特性（如生成速度、质量、使用门槛）
- 提及输出质量或独特优势
- 避免堆砌关键词，保持自然流畅
- 可以包含次要关键词的自然提及

**announcement.label + announcement.title（3-6字）：**
- 突出核心吸引点（如"100% Free" + "No Sign Up" / "Limited Offer" + "Early Access"）

**metrics（各8-12字）：**
- 2条简短的核心优势或承诺
- 使用具体的技术指标或商业承诺
- 示例："High-quality output" / "No credit card required" / "Export in seconds"

---

## 2. Introduce 模块（总计 200-250 字）

**label（1-3字）：**
- INTRODUCTION / OVERVIEW / WHAT IS [工具名]

**title（5-8字）：**
- 必须包含主关键词
- 采用问句形式增强互动
- 示例："What is [主关键词]"

**description（20-30字）：**
- 一句话概括工具的核心能力和使用场景
- 强调速度、专业性或独特价值

**items（3个子功能卡片，每个 50~60 字）：**

### 子功能 1：核心功能/资源库
**title（6-10字）：**
- 强调数量或质量优势
- 可包含次要关键词
- 示例："[数字]+ Professional [功能特性]" / "Extensive [资源类型] Library"

**description（40~50字）：**
- 第1-2句：列举具体类型、风格或选项
- 第3-4句：说明专业性来源或技术优势
- 第5句：强调适用场景和目标用户
- 自然融入1次主关键词或相关词

### 子功能 2：智能技术/AI优化
**title（5-8字）：**
- 突出"AI"、"Smart"或"Intelligent"技术属性
- 示例："Smart AI [功能] Optimization" / "Intelligent [特性] Engine"

**description（40~50字）：**
- 第1-2句：解释AI/技术如何优化核心功能
- 第3-4句：说明技术如何提升质量或效率
- 第5句：指出适用于专业场景或商业用途
- 可融入1次主关键词的自然提及

### 子功能 3：输出/导出功能
**title（5-8字）：**
- 强调速度、格式多样性或便利性
- 示例："Multi-Format Fast Export" / "Instant [格式] Download"

**description（40~50字）：**
- 第1-2句：说明生成/导出速度和即时性
- 第3句：列举支持的格式或平台
- 第4句：强调多场景应用价值
- 可包含次要关键词（如"[主关键词] online"）

---

## 3. Benefit 模块（总计 300-350 字）

**label（2-4字）：**
- Core Benefits / Why Choose Us / BENEFITS

**title（8-12字）：**
- 必须包含主关键词
- 以用户视角出发
- 示例："Why [用户群体] Choose [主关键词]" / "Why [主关键词] Stands Out"

**description（25-35字）：**
- 总结工具的差异化优势
- 强调核心价值主张的关键词（如"零门槛"、"高质量"、"完全免费"）

**items（3个核心优势，每个 90-110 字）：**

### 优势 1：质量/专业性优势
**title（4-6字）：**
- 强调真实性、专业性或高质量
- 示例："[形容词] Professional Quality" / "Industry-Standard Results"

**description（85-105字）：**
- 第1-2句：说明质量来源或专业背书
- 第3句：强调输出效果或用户体验
- 避免重复使用主关键词，使用"platform"、"tool"、"solution"等代称

### 优势 2：价格/访问优势
**title（4-6字）：**
- 强调免费、开放或无限制
- 示例："Completely Free Forever" / "Zero Cost Solution" / "Unlimited Access"

**description（85-105字）：**
- 第1-2句：明确说明无付费门槛、无隐藏费用
- 第3句：强调商业使用权或额外价值
- 列举可用场景

### 优势 3：易用性优势
**title（4-6字）：**
- 强调简单、快速或零学习成本
- 示例："Zero Learning Required" / "Instant Results" / "Beginner-Friendly"

**description（85-105字）：**
- 第1-2句：说明使用简单性和直观性
- 第3句：说明新手友好特性或自动化功能
- 强调快速上手和高效产出

---

## 4. Usage 模块（总计 150-180 字）

**label（2-4字）：**
- HOW TO USE / HOW IT WORKS / WORKFLOW

**title（6-10字）：**
- 包含主关键词
- 示例："How to Use [主关键词]" / "Get Started with [主关键词]"

**description（20-30字）：**
- 引导用户了解使用流程
- 强调"简单"、"快速"、"[数字]步骤"

**items（3个步骤，每个 30-40 字）：**

### 步骤 1：输入/开始
**title（4-6字）：**
- 描述第一步操作
- 示例："Enter Your [内容]" / "Upload Your [文件]" / "Choose Your [选项]"

**description（25-35字）：**
- 说明需要输入的内容类型
- 提及支持的格式或选项

### 步骤 2：选择/定制
**title（4-6字）：**
- 描述自定义或选择步骤
- 示例："Customize [选项]" / "Select [风格/模板]"

**description（25-35字）：**
- 强调选项数量和灵活性
- 提及实时预览或智能推荐
- 可包含次要关键词

### 步骤 3：导出/完成
**title（5-8字）：**
- 描述最终输出步骤
- 示例："Export & Download" / "Generate Results" / "Get Your [输出]"

**description（25-35字）：**
- 列举可导出的格式或平台
- 强调速度和便利性

---

## 5. Feature 模块（总计 240-280 字）

**label（1-2字）：**
- FEATURES / CAPABILITIES

**title（5-8字）：**
- 包含主关键词
- 示例："Advanced [主关键词] Features" / "Powerful [主关键词] Capabilities"

**description（25-35字）：**
- 总结功能模块的整体价值
- 强调"效率"、"专业"或"全面"

**items（6个特性，每个 35-45 字）：**

### 特性 1-6：核心功能点
**title（4-6字）：**
- 清晰描述单个功能
- 使用动词或名词短语
- 示例："Real-Time Preview" / "Cloud Storage" / "Batch Processing"

**description（30-40字）：**
- 说明功能的具体作用
- 强调给用户带来的价值
- 可以列举支持的具体选项或参数
- 说明适用场景

**注意：6个特性应该覆盖：**
- 编辑/预览功能（1个）
- 输出质量/格式（1个）
- 兼容性/支持范围（1个）
- 智能/自动化功能（1个）
- 定制/个性化选项（1个）
- 协作/管理功能（1个）

---

## 6. Testimonial 模块（总计 240-300 字）

**label（1-2字）：**
- Testimonials / REVIEWS / USER STORIES

**title（6-10字）：**
- 包含主关键词
- 示例："Real Users Love [主关键词]" / "What Our Users Say"

**description（15-25字）：**
- 引导读者查看真实用户反馈
- 可以提及用户数量或满意度

**items（6个用户评价，每个 35-45 字）：**

### 评价结构（每条）：
**title（用户名，2-4字）：**
- 使用真实感的名字（中英文均可）

**label（职业/身份，3-6字）：**
- 明确用户的职业或使用场景
- 示例："Brand Designer" / "Content Creator" / "[行业] Professional"

**description（30-40字）：**
- 第1句：具体使用场景或痛点
- 第2句：使用工具后的量化结果或主观感受
- 可包含1次次要关键词的自然提及
- 保持真实可信的语气

**注意：6个评价应覆盖不同用户类型和使用场景**

---

## 7. FAQ 模块（总计 180-240 字）

**label（1字）：**
- FAQ

**title（3-5字）：**
- Frequently Asked Questions

**description（15-25字）：**
- 引导用户寻求帮助或联系客服
- 示例："Can't find the answer? Contact us for help."

**items（6个问题，每个答案 25-35 字）：**

### 必答问题类型：
1. **是否免费/定价相关**
   - title（6-10字）：询问是否免费或如何定价
   - description（25-35字）：明确回答，说明免费程度或定价结构

2. **支持格式/平台**
   - title（8-12字）：询问支持的输出格式或平台
   - description（25-35字）：列举具体格式，说明适用场景

3. **是否需要经验/技能**
   - title（10-15字）：询问使用门槛
   - description（25-35字）：回答"不需要"，说明简单性

4. **商业使用/版权**
   - title（8-12字）：询问商业使用权限
   - description（25-35字）：明确说明使用权限和授权范围

5. **操作流程/导出方式**
   - title（6-10字）：询问如何使用或导出
   - description（25-35字）：简要说明操作步骤

6. **特色功能相关**
   - title（6-10字）：询问特定功能或支持
   - description（25-35字）：回答功能细节

---

## 8. CTA 模块（总计 40-60 字）

**title（10-15字）：**
- 必须包含主关键词
- 强调"立即"、"现在"、"快速"等行动词
- 示例："Start Using [主关键词] Now" / "Experience [主关键词]'s Power Today"

**description（30-45字）：**
- 第1句：强化核心价值主张（免费、快速、专业等）
- 第2句：说明无门槛优势（无需注册、无限使用等）
- 第3句：营造紧迫感或FOMO（错过机会、立即行动）
- 可包含次要关键词（如"[主关键词] free"）

---

【SEO 关键词分布策略】

**主关键词分布（6-7次，密度约4%）：**
1. Hero title（1次）- 必须出现
2. Introduce title（1次）- 必须出现
3. Benefit title（1次）- 必须出现
4. Usage title（1次）- 必须出现
5. Feature title（1次）- 必须出现
6. Testimonial title（1次）- 必须出现
7. CTA title（1次）- 必须出现

**次要关键词分布（每个1-2次）：**
- 在 Introduce、Usage、Testimonial 的描述中自然提及
- 在 FAQ 的问题或答案中适当使用
- 在 CTA 中选择性使用

**语义相关词分布：**
- 均匀分散在各模块的描述文字中
- 作为同义词替换主关键词，避免重复
- 使用"tool"、"platform"、"solution"、"service"等通用词代替部分关键词

---

【语言风格要求】

1. **自然流畅**：
   - 避免生硬的关键词堆砌
   - 使用代词（our platform, this tool, the system）替换部分关键词重复
   - 保持句子结构多样化

2. **具体量化**：
   - 使用具体数字（时间、数量、百分比）
   - 提供可验证的数据或结果
   - 示例："3 seconds", "50+ templates", "4K resolution", "38% increase"

3. **场景化描述**：
   - 描述真实使用场景和用户故事
   - 说明在具体情境下如何解决问题
   - 提及目标用户群体的实际需求

4. **信任建设**：
   - 提及技术支持、专业背书或合作伙伴
   - 使用"professional"、"industry-standard"等信任词汇
   - 在 Testimonial 中提供具体、可信的案例

5. **行动导向**：
   - 使用动词开头（Generate, Create, Start, Build, Export）
   - 在描述中明确用户可以做什么
   - CTA 使用强烈的行动召唤

---

【生成后自查清单】

✅ 总字数在 1200-1400 字之间
✅ 主关键词出现 6-7 次，密度约 4%
✅ 次要关键词自然分布 3-6 次
✅ 每个模块字数符合上述要求（±10字可接受）
✅ 无关键词堆砌，语言流畅自然
✅ 包含具体数字和量化结果
✅ 真实用户评价场景具体可信
✅ FAQ 回答直接明确，覆盖核心问题
✅ CTA 具有紧迫感和吸引力
✅ 语义相关词分散使用，避免单一词汇过度重复
✅ 标题层级清晰，信息层次分明
✅ 符合目标用户群体的语言习惯和专业水平