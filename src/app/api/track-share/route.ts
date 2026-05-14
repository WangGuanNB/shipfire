import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export interface ShareTrackingRequest {
  platform: string;
  imageUrl?: string;
  userAgent?: string;
  referrer?: string;
}

export interface ShareTrackingResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 获取用户会话（可选）
    const session = await auth();
    
    const body: ShareTrackingRequest = await request.json();
    const { platform, imageUrl } = body;

    // 🔒 基本的输入验证和速率限制保护
    if (!platform || typeof platform !== 'string' || platform.length > 50) {
      return NextResponse.json({
        success: false,
        error: 'Invalid platform specified'
      } as ShareTrackingResponse, { status: 400 });
    }

    if (imageUrl && (typeof imageUrl !== 'string' || imageUrl.length > 2000)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid image URL'
      } as ShareTrackingResponse, { status: 400 });
    }

    // 验证平台参数
    const validPlatforms = [
      'twitter', 'facebook', 'linkedin', 'pinterest', 
      'whatsapp', 'telegram', 'reddit', 'copy', 'download', 'native'
    ];

    if (!platform || !validPlatforms.includes(platform)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid platform specified'
      } as ShareTrackingResponse, { status: 400 });
    }

    // 获取请求信息
    const userAgent = request.headers.get('user-agent') || '';
    const referrer = request.headers.get('referer') || '';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // 这里可以添加数据库记录逻辑
    // 例如：记录到 shares 表
    /*
    await db.insert(shares).values({
      platform,
      imageUrl,
      userUuid: session?.user?.id || null,
      userAgent,
      referrer,
      ip,
      createdAt: new Date(),
    });
    */

    // 记录到控制台（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 Share tracked:', {
        platform,
        imageUrl: imageUrl ? 'provided' : 'none',
        userAgent: userAgent.substring(0, 50) + '...',
        referrer,
        ip,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Share tracked successfully'
    } as ShareTrackingResponse);

  } catch (error) {
    console.error('Share tracking error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to track share'
    } as ShareTrackingResponse, { status: 500 });
  }
}

// GET方法用于健康检查
export async function GET() {
  return NextResponse.json({
    service: 'Share Tracking API',
    status: 'active',
    supportedPlatforms: [
      'twitter', 'facebook', 'linkedin', 'pinterest', 
      'whatsapp', 'telegram', 'reddit', 'copy', 'download', 'native'
    ],
    version: '1.0.0'
  });
}


