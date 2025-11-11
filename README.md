# 🔥 ShipFire

<div align="center">

> **The Ultimate Next.js 15 SaaS Starter Kit with AI Integration**  
> Ship your SaaS product faster with production-ready features and modern tech stack

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
 [🚀 **Get Started**](https://github.com/WangGuanNB/shipfire)

</div>

---

## ✨ Why ShipFire?

<table>
<tr>
<td width="50%">

### ⚡ Launch in Minutes
- 30 seconds to initialize
- 5 minutes to deploy
- Zero configuration needed

</td>
<td width="50%">

### 🤖 AI-First Approach
- OpenAI & Google AI integrated
- Image & video generation ready
- Built-in AI tools & utilities

</td>
</tr>
<tr>
<td width="50%">

### 💎 Enterprise Ready
- Complete authentication system
- Stripe payment integration
- Multi-tenant architecture

</td>
<td width="50%">

### 🎨 Modern Design
- Shadcn UI components
- Dark/Light theme support
- Fully responsive

</td>
</tr>
</table>

---

## 🚀 Quick Start

### 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm / yarn / pnpm

### 🛠️ Installation

```bash
# 1. Clone the repository
git clone https://github.com/WangGuanNB/shipfire.git
cd shipfire

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# 4. Initialize database
pnpm db:push

# 5. Start development server
pnpm dev
```

🎉 Visit `http://localhost:3000` to see your app!

---

## 📦 Tech Stack

<div align="center">

| Category | Technologies |
|:---:|:---|
| **🏗️ Framework** | Next.js 15 • React 19 • TypeScript |
| **🎨 Styling** | Tailwind CSS • Shadcn UI • Radix UI |
| **🗄️ Database** | PostgreSQL • Drizzle ORM |
| **🔐 Auth** | NextAuth.js v5 • Google One Tap |
| **💳 Payments** | Stripe |
| **🤖 AI** | OpenAI DALL-E • Google Imagen • Kling AI |
| **🌍 i18n** | next-intl |
| **📝 Content** | MDX • Fumadocs |
| **🚀 Deploy** | Vercel • Docker |

</div>

---

## 🔥 Features

### 🏗️ **Core Architecture**

```
✅ Next.js 15 App Router        - Modern routing system
✅ TypeScript Strict Mode       - Type-safe development
✅ Tailwind CSS + Shadcn UI    - Beautiful UI components
✅ PostgreSQL + Drizzle ORM    - Robust data layer
✅ Internationalization         - Multi-language support
✅ Dark/Light Theme            - User preference
```

### 🤖 **AI Integration**

| Feature | Description | Services |
|:---:|:---|:---|
| 🎨 **AI Image Generation** | Text-to-image creation | OpenAI DALL-E, Google Imagen |
| 🎬 **AI Video Generation** | Intelligent video creation | Kling AI |
| 🖼️ **Image Processing** | Crop, resize, filters | Built-in tools |
| 🎯 **Format Conversion** | Image format converter | Multiple formats |
| 🌈 **Color Tools** | Color space conversion | RGB/HEX/HSL |

### 🔐 **Authentication System**

```typescript
✅ NextAuth.js v5              - Latest auth solution
✅ Google One Tap              - One-click sign-in  
✅ Magic Link Login            - Passwordless auth
✅ Role-Based Access Control   - Multi-role support
✅ Session Management          - Secure & persistent
```

### 💳 **Payment & Billing**

```
💰 Stripe Integration          - Secure payments
📊 Subscription Management     - Recurring billing
🎁 Credit System              - Reward & incentives
👥 Referral Program           - Invite & earn
💳 One-time Purchases         - Flexible pricing
```

### 📊 **Admin Dashboard**

| Module | Features |
|:---|:---|
| 👥 **User Management** | View, edit, suspend users |
| 📋 **Order Management** | Transaction history & analytics |
| 💬 **Feedback System** | User feedback & support tickets |
| 📝 **Content Management** | Blog posts & documentation |
| 🔑 **API Management** | API keys & rate limiting |

### 📝 **Content System**

```
📖 MDX Blog System            - Write in Markdown
📚 Documentation (Fumadocs)   - Beautiful docs
✏️ Rich Text Editor           - WYSIWYG editing
🔍 Full-Text Search          - Fast content search
📱 Responsive Design         - Mobile-friendly
```

---

## 🗂️ Project Structure

```
shipfire/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard
│   ├── api/               # API routes
│   └── [locale]/          # Internationalized pages
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   └── shared/           # Shared components
├── lib/                  # Utility functions
│   ├── db/              # Database utilities
│   └── auth/            # Auth helpers
├── services/            # Business logic
├── types/               # TypeScript definitions
├── public/              # Static assets
└── config/              # Configuration files
```

---

## 🔧 Environment Setup

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/shipfire

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# OpenAI
OPENAI_API_KEY=sk-...

# Google AI (Optional)
GOOGLE_AI_API_KEY=your-google-ai-key

# Kling AI (Optional)
KLING_AI_API_KEY=your-kling-ai-key
```

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/WangGuanNB/shipfire)

```bash
# Or use Vercel CLI
vercel --prod
```

### Docker Deployment

```bash
# Build the Docker image
pnpm docker:build

# Run the container
docker run -p 3000:3000 shipfire:latest
```

---

## 📖 Documentation

Comprehensive documentation is available at [shipfire.cn/docs](https://shipfire.cn/docs)


---

## 🎯 Use Cases

Perfect for building:

- 🚀 **SaaS Applications** - Subscription-based services
- 🤖 **AI-Powered Tools** - Image/video generation apps
- 💼 **B2B Platforms** - Enterprise solutions
- 📊 **Analytics Dashboards** - Data visualization
- 🎨 **Creative Tools** - Design & editing platforms
- 📱 **Mobile-First Apps** - Progressive web apps

---

🌟 Built with ShipFire
Real products shipped using this starter template. Join these successful projects!
<table>
<tr>
<td width="33%" align="center">
<a href="https://circle-fifths.com" target="_blank">
<img src="https://circle-fifths.com/favicon.ico" width="64" height="64" alt="Circle of Fifths">
<br/>
<strong>Circle of Fifths</strong>
</a>
<br/>
<sub>Interactive music theory learning platform</sub>
<br/>
<sup>🎵 Education • AI • Music</sup>
</td>
<td width="33%" align="center">
<a href="https://graffiti-generator.org" target="_blank">
<img src="https://graffiti-generator.org/favicon.ico" width="64" height="64" alt="Graffiti Generator">
<br/>
<strong>Graffiti Generator</strong>
</a>
<br/>
<sub>AI-powered street art creation tool</sub>
<br/>
<sup>🎨 Design • AI • Creative</sup>
</td>
<td width="33%" align="center">
<a href="https://pinpointanswer.net" target="_blank">
<img src="https://pinpointanswer.net/favicon.ico" width="64" height="64" alt="Pinpoint Answer">
<br/>
<strong>Pinpoint Answer</strong>
</a>
<br/>
<sub>Daily LinkedIn puzzle solver</sub>
<br/>
<sup>🎯 Gaming • Community</sup>
</td>
</tr>
<tr>
<td width="33%" align="center">
<a href="https://love-mbti.com" target="_blank">
<img src="https://love-mbti.com/favicon.ico" width="64" height="64" alt="Love MBTI">
<br/>
<strong>Love MBTI</strong>
</a>
<br/>
<sub>Romance personality test platform</sub>
<br/>
<sup>💕 Psychology • Testing</sup>
</td>
<td width="33%" align="center">
<a href="https://wplaceart.com" target="_blank">
<img src="https://wplaceart.com/favicon.ico" width="64" height="64" alt="WPlaceArt">
<br/>
<strong>WPlaceArt</strong>
</a>
<br/>
<sub>Creative art platform</sub>
<br/>
<sup>🖼️ Art • Creative</sup>
</td>
<td width="33%" align="center">
<strong>Your Project?</strong>
<br/>
<sub>Built something with ShipFire?</sub>
<br/>
<a href="https://github.com/WangGuanNB/shipfire/issues">Share your project →</a>
 <a href="https://circle-fifths.com/">Circle of Fifths</a>
  <a href="https://graffiti-generator.org">graffiti generator</a>
</td>
</tr>
</table>

💡 Want to be featured? If you've built something with ShipFire, submit your project and get listed here!


## 🛣️ Roadmap

- [ ] Mobile app support (React Native / Expo)
- [ ] More AI model integrations (Anthropic Claude, Mistral)
- [ ] Advanced analytics & reporting
- [ ] Team collaboration features
- [ ] Multi-database support (MySQL, MongoDB)
- [ ] GraphQL API option
- [ ] Serverless function templates
- [ ] E-commerce features

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with love by [WangGuanNB](https://github.com/WangGuanNB)
- Powered by [Next.js](https://nextjs.org/)
- UI components from [Shadcn UI](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

<div align="center">

**🔥 Ship your SaaS faster with ShipFire!**

[⭐ Star on GitHub](https://github.com/WangGuanNB/shipfire) • [🐦 Follow on Twitter](https://twitter.com/your-handle) • [💬 Join Discord](https://discord.gg/your-server)

Made with ❤️ by developers, for developers

</div> 
