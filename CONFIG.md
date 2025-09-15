# ShipFire项目环境变量配置
# -----------------------------------------------------------------------------
# Web Information
# -----------------------------------------------------------------------------
NEXT_PUBLIC_WEB_URL = "https://miniatur.org"
NEXT_PUBLIC_PROJECT_NAME = "ShipFire"

# -----------------------------------------------------------------------------
# Database with Supabase
# -----------------------------------------------------------------------------
# https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
# Set your Supabase DATABASE_URL
DATABASE_URL = ""

# -----------------------------------------------------------------------------
# Auth with next-auth
# https://authjs.dev/getting-started/installation?framework=Next.js
# Set your Auth URL and Secret
# Secret can be generated with `openssl rand -base64 32`
# -----------------------------------------------------------------------------
AUTH_SECRET = ""
AUTH_URL = "http://localhost:3000/api/auth"
AUTH_TRUST_HOST = true

# disable auth if needed
NEXT_PUBLIC_AUTH_ENABLED = "true"

# Google Auth
# https://authjs.dev/getting-started/providers/google
AUTH_GOOGLE_ID = ""
AUTH_GOOGLE_SECRET = ""
NEXT_PUBLIC_AUTH_GOOGLE_ID = ""
NEXT_PUBLIC_AUTH_GOOGLE_ENABLED = "false"
NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED = "false"

# Github Auth
# https://authjs.dev/getting-started/providers/github
AUTH_GITHUB_ID = ""
AUTH_GITHUB_SECRET = ""
NEXT_PUBLIC_AUTH_GITHUB_ENABLED = "true"

# -----------------------------------------------------------------------------
# Analytics with Google Analytics
# https://analytics.google.com
# -----------------------------------------------------------------------------
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID = ""

# -----------------------------------------------------------------------------
# Analytics with OpenPanel
# https://openpanel.dev
# -----------------------------------------------------------------------------
NEXT_PUBLIC_OPENPANEL_CLIENT_ID = ""

# Analytics with Plausible
# https://plausible.io/
NEXT_PUBLIC_PLAUSIBLE_DOMAIN = ""
NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL = ""

# -----------------------------------------------------------------------------
# Payment with Stripe
# https://docs.stripe.com/keys
# -----------------------------------------------------------------------------
STRIPE_PUBLIC_KEY = ""
STRIPE_PRIVATE_KEY = ""
STRIPE_WEBHOOK_SECRET = ""

NEXT_PUBLIC_PAY_SUCCESS_URL = "/my-orders"
NEXT_PUBLIC_PAY_FAIL_URL = "/pricing"
NEXT_PUBLIC_PAY_CANCEL_URL = "/pricing"

NEXT_PUBLIC_LOCALE_DETECTION = "false"

ADMIN_EMAILS = ""

NEXT_PUBLIC_DEFAULT_THEME = "dark"

# -----------------------------------------------------------------------------
# Storage with aws s3 sdk
# https://docs.aws.amazon.com/s3/index.html
# -----------------------------------------------------------------------------
STORAGE_ENDPOINT = ""
STORAGE_REGION = ""
STORAGE_ACCESS_KEY = ""
STORAGE_SECRET_KEY = ""
STORAGE_BUCKET = ""
STORAGE_DOMAIN = ""

# Google Adsence Code
# https://adsense.com/
NEXT_PUBLIC_GOOGLE_ADCODE = ""

# ReSend
RESEND_API_KEY = ""
RESEND_SENDER_EMAIL = ""


# Replicate API - Required for Miniatur AI generation
REPLICATE_API_TOKEN=""

# Cloudflare R2 存储配置 
# 应用程序URL
R2_ACCOUNT_ID=""
R2_BUCKET_NAME=""  
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_PUBLIC_URL=""


# =======================================================
# 社交媒体和联系方式配置 (Social Media & Contact Configuration)
#用于Landing Page Footer的联系方式
# =======================================================
# 客服邮箱 (Support Email),用于用户联系客服、反馈问题等
NEXT_PUBLIC_SUPPORT_EMAIL=
# Twitter/X 社交账号 (Twitter/X Account) 
NEXT_PUBLIC_TWITTER_URL=
# GitHub 开源仓库 (GitHub Repository)
NEXT_PUBLIC_GITHUB_URL=
# Discord 社区服务器 (Discord Community Server)
NEXT_PUBLIC_DISCORD_URL=
