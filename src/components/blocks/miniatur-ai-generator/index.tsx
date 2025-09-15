'use client';
import { useTranslations } from 'next-intl';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Upload, Wand2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import Icon from '@/components/icon';
import CompactSocialShare from '@/components/blocks/social-share/compact';

export default function MiniaturaAIGenerator() {
  const t = useTranslations('miniatureGenerator');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [editingInstructions, setEditingInstructions] = useState('Transform the person in the reference image into a 1/7 scale collectible figurine. The figurine must exactly match the person\'s appearance: same face, same hairstyle, same clothing (white shirt and dark skirt). Maintain all facial features, body proportions, and outfit details from the original photo. Place on computer desk with transparent base, ZBrush on screen, BANDAI box nearby.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedImageData, setGeneratedImageData] = useState<string | null>(null);
  const [generatedImageMimeType, setGeneratedImageMimeType] = useState<string>('image/png');
  const [enableTranslate, setEnableTranslate] = useState(true);
  const [progress, setProgress] = useState(98);
  const [showProgress, setShowProgress] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{
    canUse: boolean;
    remaining: number;
    isLoggedIn: boolean;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 检查使用限制
  const checkUsageLimit = useCallback(async () => {
    try {
      const response = await fetch('/api/check-usage-limit');
      const data = await response.json();
      
      if (data.success) {
        setUsageInfo({
          canUse: data.canUse,
          remaining: data.remaining,
          isLoggedIn: data.isLoggedIn
        });
        
        // 移除了页面加载时的弹层提示，用户可以通过UI中的提示区域看到剩余次数
      }
    } catch (error) {
      console.error('Failed to check usage limit:', error);
    }
  }, []);

  // 记录使用
  const recordUsage = useCallback(async () => {
    try {
      const response = await fetch('/api/check-usage-limit', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setUsageInfo({
          canUse: data.canUse,
          remaining: data.remaining || 0,
          isLoggedIn: data.isLoggedIn
        });
      }
      
      return data.success;
    } catch (error) {
      console.error('Failed to record usage:', error);
      return false;
    }
  }, []);

  const handleFileUpload = useCallback((files: FileList) => {
    const file = files[0]; // 只取第一个文件
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('messages.uploadValidImage'));
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('messages.imageTooLarge'));
      return;
    }

    setUploadedImage(file);
    toast.success(t('messages.uploadSuccess'));
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const removeImage = useCallback(() => {
    setUploadedImage(null);
  }, []);

  // 辅助函数：将文件转换为base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result?.toString().split(',')[1];
        resolve(base64 || '');
      };
      reader.onerror = reject;
    });
  };

  const handleGenerate = useCallback(async () => {
    if (!uploadedImage) {
      toast.error(t('messages.pleaseUploadImage'));
      return;
    }

    if (!editingInstructions.trim()) {
      toast.error(t('messages.pleaseProvideInstructions'));
      return;
    }

    // 检查使用限制
    if (usageInfo && !usageInfo.canUse && !usageInfo.isLoggedIn) {
      toast.error(t('messages.dailyLimitExceeded'));
      return;
    }

    setIsGenerating(true);
    setShowProgress(true);
    setProgress(98);
    setGeneratedImage(null);
    setGeneratedImageData(null);
    setShowShareOptions(false); // 重置分享状态
    
    // 清除之前的定时器
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    try {
      // 准备图片数据
      setProgress(98);
      const base64 = await fileToBase64(uploadedImage);
      const imageData = [{
        data: base64,
        mimeType: uploadedImage.type,
        name: uploadedImage.name
      }];

      setProgress(98);
      
      // 调用API生成微型模型
      const response = await fetch('/api/generate-miniature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: imageData,
          instructions: editingInstructions,
          enableTranslate,
          config: {
            style: 'realistic',
            scale: '1/7',
            environment: 'desk',
            includePackaging: true,
            numberOfImages: 1,
            aspectRatio: '16:9'
          }
        }),
      });

      setProgress(98);

      const result = await response.json();

      if (result.success && result.images?.[0]) {
        const imageData = result.images[0];
        const imageUrl = `data:${imageData.mimeType};base64,${imageData.data}`;
        
        setGeneratedImage(imageUrl);
        setGeneratedImageData(imageUrl); // 保存完整的数据URL供分享使用
        setGeneratedImageMimeType(imageData.mimeType);
        setProgress(100);
        setShowShareOptions(true); // 显示分享选项
        
        // 记录使用（如果未登录）
        await recordUsage();
        
        toast.success(t('messages.miniatureGeneratedSuccess'));
      } else {
        throw new Error(result.error || t('messages.generationFailed'));
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(t('messages.generateMiniatureFailed'));
    } finally {
      setIsGenerating(false);
      setShowProgress(false);
      // 清除定时器
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    }
  }, [uploadedImage, editingInstructions, enableTranslate, t]);

  // 下载图片功能
  const handleDownload = useCallback(() => {
    if (!generatedImageData) return;

    try {
      const link = document.createElement('a');
      link.href = generatedImageData;
      link.download = `miniature-${Date.now()}.${generatedImageMimeType.split('/')[1] || 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t('messages.imageDownloaded'));
    } catch (error) {
      toast.error(t('messages.imageDownloadFailed'));
    }
  }, [generatedImageData, generatedImageMimeType, t]);

  // 分享回调
  const handleShare = useCallback((platform: string) => {
    // 这里可以添加分享统计逻辑
    console.log(`Shared to ${platform}`);
    
    // 发送分享事件到分析工具
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'share', {
        method: platform,
        content_type: 'image',
        content_id: 'miniature_generation',
      });
    }
  }, []);
  
  // 页面加载时检查使用限制
  useEffect(() => {
    checkUsageLimit();
  }, [checkUsageLimit]);
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="py-12" id="generator">
      <div className="container">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* 左侧：图片上传和编辑指令 */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Wand2 className="size-6" />
                  {t('ui.title')}
                </CardTitle>
                <p className="text-muted-foreground">
                  {t('ui.subtitle')}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 图片上传区域 */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{t('upload.title')}</h3>
                    <span className="text-sm text-muted-foreground">
                      {t('upload.subtitle')}
                    </span>
                  </div>
                  
                  <div
                    className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/25 p-8 transition-colors hover:border-muted-foreground/50"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="rounded-lg bg-primary/10 p-4 mb-4">
                      <ImageIcon className="size-8 text-primary" />
                    </div>
                    <p className="mb-2 text-center font-medium">
                      {t('upload.dragDrop')}
                    </p>
                    <p className="text-sm text-muted-foreground text-center">
                      {t('upload.fileInfo')}
                    </p>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>

                  {/* 已上传图片预览 */}
                  {uploadedImage && (
                    <div className="mt-4">
                      <div className="relative group w-full max-w-xs mx-auto">
                        <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
                          <img
                            src={URL.createObjectURL(uploadedImage)}
                            alt="Uploaded image"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage();
                          }}
                          className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 编辑指令区域 */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{t('instructions.title')}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t('instructions.translate')}</span>
                      <Switch
                        checked={enableTranslate}
                        onCheckedChange={setEnableTranslate}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('instructions.subtitle')}
                  </p>
                  
                  <Textarea
                    value={editingInstructions}
                    onChange={(e) => setEditingInstructions(e.target.value)}
                    placeholder="Describe how you want to transform your image into a miniature scene..."
                    className="min-h-[120px] resize-none"
                    maxLength={1000}
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{editingInstructions.length}/1000</span>
                    </div>
                    {enableTranslate && (
                      <Badge variant="outline" className="text-xs">
                        {t('instructions.autoTranslateEnabled')}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 使用次数提示 */}
                {usageInfo && !usageInfo.isLoggedIn && (
                  <div className="text-center p-3 bg-muted/50 rounded-lg border">
                    {usageInfo.canUse ? (
                      <p className="text-sm text-muted-foreground">
                        🎨 {t('usage.remaining', { remaining: usageInfo.remaining })}
                        {usageInfo.remaining === 1 && (
                          <span className="block mt-1 text-xs">
                            💡 {t('usage.signInTip')}
                          </span>
                        )}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-destructive">
                          ⚠️ {t('usage.limitReached')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('usage.signInUnlimited')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 生成按钮 */}
                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !uploadedImage || (usageInfo ? !usageInfo.canUse && !usageInfo.isLoggedIn : false)}
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 hover:from-blue-700 hover:via-purple-700 hover:to-teal-700"
                >
                  {isGenerating ? (
                    <>
                      <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t('buttons.generating')}
                    </>
                  ) : usageInfo && !usageInfo.canUse && !usageInfo.isLoggedIn ? (
                    <>
                      <span className="mr-2">🔒</span>
                      {t('buttons.limitReached')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 size-4" />
                      {t('buttons.generate')}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* 右侧：生成结果展示 */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="rounded-full bg-red-500 p-1">
                    <div className="size-2 rounded-full bg-white" />
                  </div>
                  {t('result.title')}
                </CardTitle>
                <p className="text-muted-foreground">
                  {t('result.subtitle')}
                </p>
              </CardHeader>
              <CardContent>
                {!generatedImage && !isGenerating ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/25 p-12 text-center">
                    <div className="rounded-lg bg-primary/10 p-6 mb-6">
                      <ImageIcon className="size-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      {t('result.readyTitle')}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm">
                      {t('result.readySubtitle')}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="size-2 rounded-full bg-muted-foreground/50" />
                      <span>{t('result.willAppear')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
                      {isGenerating ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-8">
                          {showProgress ? (
                            <>
                              {/* 环形进度条 */}
                              <div className="relative mb-6">
                                <svg className="size-32 transform -rotate-90" viewBox="0 0 100 100">
                                  {/* 背景圆环 */}
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    className="text-muted-foreground/20"
                                  />
                                  {/* 进度圆环 */}
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 45}`}
                                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                                    className="text-primary transition-all duration-1000 ease-in-out"
                                    strokeLinecap="round"
                                  />
                                </svg>
                                {/* 进度文字 */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-2xl font-bold text-primary">{progress}%</span>
                                </div>
                              </div>
                              <p className="text-lg font-medium mb-2">{t('result.creating')}</p>
                              <p className="text-sm text-muted-foreground">{t('result.almostDone')}</p>
                            </>
                          ) : (
                            <>
                              <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                              <p className="text-lg font-medium mb-2">{t('result.creating')}</p>
                              <p className="text-sm text-muted-foreground">{t('result.takeFewMoments')}</p>
                            </>
                          )}
                        </div>
                      ) : generatedImage ? (
                        <img
                          src={generatedImage}
                          alt="Generated miniature"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : null}
                    </div>
                    
                    {generatedImage && !isGenerating && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={handleDownload}
                          >
                            <Upload className="mr-2 size-4" />
                            {t('buttons.download')}
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={handleGenerate}
                          >
                            <Wand2 className="mr-2 size-4" />
                            {t('buttons.regenerate')}
                          </Button>
                        </div>
                        
                        {/* 紧凑的分享选项 */}
                        {showShareOptions && generatedImageData && (
                          <CompactSocialShare
                            imageUrl={generatedImage || ''}
                            imageData={generatedImageData}
                            mimeType={generatedImageMimeType}
                            title="Check out my AI-generated miniature!"
                            description="I just created this amazing miniature figurine using Miniatur AI. Transform your photos into collectible masterpieces for free!"
                            hashtags={["MiniaturAI", "AIGenerated", "Miniature", "Figurine", "AIArt", "CollectibleFigurine"]}
                            onShare={handleShare}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
