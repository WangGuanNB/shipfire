"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Copy, Palette, Grid, Zap, CheckCircle } from 'lucide-react';
import { convertImageToPixelArt, drawGrid } from '@/lib/pixel-converter';
import { WPLACE_COLOR_PALETTE, getFreeColors, getPremiumColors } from '@/lib/color-palette';
import { PixelConverterSettings, ConversionStats } from '@/types/pixel-converter';
import { toast } from 'sonner';
import { ConverterPage } from "@/types/pages/converter";
import { getCanonicalUrl } from "@/lib/utils";

interface ConverterClientProps {
  page: ConverterPage;
  locale: string;
}

export default function ConverterClient({ page, locale }: ConverterClientProps) {
  const [settings, setSettings] = useState<PixelConverterSettings>({
    pixelSize: 12,
    scale: 1.0,
    zoomLevel: 1,
    showGrid: true
  });
  
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  
  // 新增：鼠标悬停状态
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number; color: string; show: boolean }>({
    x: 0,
    y: 0,
    color: '',
    show: false
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size cannot exceed 5MB');
      return;
    }

    setIsProcessing(true);
    setUploadedImage(file);

    try {
      const { canvas, stats: conversionStats } = await convertImageToPixelArt(file, settings.pixelSize);
      
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          // 设置canvas尺寸
          canvasRef.current.width = canvas.width;
          canvasRef.current.height = canvas.height;
          
          // 清除canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // 绘制转换后的图片
          ctx.drawImage(canvas, 0, 0);
          
          // 绘制网格（根据设置决定是否显示）
          drawGrid(canvasRef.current, settings.pixelSize, settings.showGrid);
        }
      }
      
      setStats(conversionStats);
      toast.success('Image converted successfully!');
    } catch (error) {
      toast.error('Image conversion failed, please try again');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  }, [settings.pixelSize, settings.showGrid]);

  // 新增：处理鼠标移动事件
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !stats) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = settings.scale;
    
    // 计算鼠标在canvas上的实际位置
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);
    
    // 确保坐标在canvas范围内
    if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(x, y, 1, 1);
        const [r, g, b] = imageData.data;
        const color = `rgb(${r}, ${g}, ${b})`;
        
        setMousePosition({
          x,
          y,
          color,
          show: true
        });
      }
    } else {
      setMousePosition(prev => ({ ...prev, show: false }));
    }
  }, [stats, settings.scale]);

  // 新增：处理鼠标离开事件
  const handleMouseLeave = useCallback(() => {
    setMousePosition(prev => ({ ...prev, show: false }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = 'pixel-art.png';
    link.href = canvasRef.current.toDataURL();
    link.click();
  }, []);

  const handleCopy = useCallback(async () => {
    if (!canvasRef.current) return;
    
    try {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          toast.success('Image copied to clipboard');
        }
      });
    } catch (error) {
      toast.error('Copy failed, please try again');
    }
  }, []);

  // 重新处理图片当设置改变时
  useEffect(() => {
    if (uploadedImage) {
      handleFileUpload(uploadedImage);
    }
  }, [settings.pixelSize, settings.showGrid]);

  const filteredColors = showFreeOnly ? getFreeColors() : WPLACE_COLOR_PALETTE;

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Wplace Pixel Art Converter",
            "description": "Free online Wplace Pixel Art Converter for Wplace.live collaborative canvas. Transform any image into pixel art with official palette and grid analysis.",
            "url": getCanonicalUrl(locale, '/converter'),
            "applicationCategory": "DesignApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "creator": {
              "@type": "Organization",
              "name": "Wplace Pixel"
            },
            "featureList": [
              "Image to pixel art conversion",
              "Official Wplace.live palette",
              "Grid statistics and analysis",
              "Free and premium color breakdown",
              "Export and download functionality",
              "Real-time pixel coordinate tracking",
              "Color palette optimization"
            ],
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "1250"
            }
          })
        }}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Hero Section */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-3 px-4 py-2 text-sm bg-orange-100 text-orange-700 border-orange-200">
                {page.hero.badge}
              </Badge>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
                {page.hero.title}
              </h1>
              
              <p className="text-xl lg:text-2xl text-gray-600 mb-6 max-w-3xl mx-auto">
                {page.hero.description}
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                <span>{page.hero.features.free}</span>
                <span>{page.hero.features.no_registration}</span>
                <span>{page.hero.features.instant}</span>
                <span>{page.hero.features.official_palette}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 工具模块 */}
        <section className="py-8 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
                  {page.tool.title}
                </h2>
                <p className="text-lg text-muted-foreground">
                  {page.tool.description}
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* 左侧：图片上传和预览区域 */}
                <div className="space-y-3 flex flex-col min-h-[450px] justify-between">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="size-5" />
                        {page.upload.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* 图片统计信息 */}
                      {uploadedImage && stats && (
                        <div className="mb-3 px-3 py-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">H:</span>
                              <span className="font-medium">{mousePosition.show ? mousePosition.x : stats.horizontalBlocks}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">V:</span>
                              <span className="font-medium">{mousePosition.show ? mousePosition.y : stats.verticalBlocks}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Total:</span>
                              <span className="font-medium">{stats.totalBlocks}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Colors:</span>
                              <span className="font-medium">{stats.colorsUsed.length}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div
                        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/25 transition-colors hover:border-muted-foreground/50 ${
                          !uploadedImage ? 'min-h-[500px]' : 'h-[500px]'
                        }`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {!uploadedImage ? (
                          <div className="text-center">
                            <Upload className="mx-auto mb-4 size-12 text-muted-foreground" />
                            <p className="mb-2 text-lg font-medium">
                              {page.upload.click_upload}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {page.upload.format_support}
                            </p>
                          </div>
                        ) : (
                          <div className="w-full h-full overflow-auto relative">
                            <div className="inline-block relative">
                              <canvas
                                ref={canvasRef}
                                className="rounded border cursor-crosshair"
                                style={{
                                  transform: `scale(${settings.scale})`,
                                  transformOrigin: 'top left'
                                }}
                                onMouseMove={handleMouseMove}
                                onMouseLeave={handleMouseLeave}
                              />
                              
                              {/* 鼠标悬停提示框 */}
                              {mousePosition.show && (
                                <div 
                                  className="absolute pointer-events-none z-10 bg-black text-white text-xs rounded px-2 py-1 shadow-lg"
                                  style={{
                                    left: `${mousePosition.x * settings.scale + 10}px`,
                                    top: `${mousePosition.y * settings.scale - 30}px`,
                                    transform: 'translateX(-50%)'
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded border border-white"
                                      style={{ backgroundColor: mousePosition.color }}
                                    />
                                    <span>
                                      x {mousePosition.x} y {mousePosition.y} | {mousePosition.color}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            {isProcessing && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                                <div className="text-white">{page.upload.processing}</div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                      </div>

                      {uploadedImage && (
                        <div className="mt-4 flex gap-2">
                          <Button onClick={handleDownload} variant="outline" size="sm">
                            <Download className="mr-2 size-4" />
                            {page.upload.download}
                          </Button>
                          <Button onClick={handleCopy} variant="outline" size="sm">
                            <Copy className="mr-2 size-4" />
                            {page.upload.copy}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* 右侧：设置和颜色面板 */}
                <div className="space-y-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>{page.settings.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      <div>
                        <div className="mb-1 flex justify-between">
                          <label className="text-sm font-medium">{page.settings.pixel_size}</label>
                          <span className="text-sm text-muted-foreground">{settings.pixelSize}</span>
                        </div>
                        <Slider
                          value={[settings.pixelSize]}
                          onValueChange={([value]) => 
                            setSettings(prev => ({ ...prev, pixelSize: value }))
                          }
                          min={1}
                          max={32}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex justify-between">
                          <label className="text-sm font-medium">{page.settings.scale}</label>
                          <span className="text-sm text-muted-foreground">{settings.scale.toFixed(1)}x</span>
                        </div>
                        <Slider
                          value={[settings.scale]}
                          onValueChange={([value]) => 
                            setSettings(prev => ({ ...prev, scale: value }))
                          }
                          min={0.1}
                          max={3.0}
                          step={0.1}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex justify-between">
                          <label className="text-sm font-medium">{page.settings.zoom_level}</label>
                          <span className="text-sm text-muted-foreground">{settings.zoomLevel}x</span>
                        </div>
                        <Slider
                          value={[settings.zoomLevel]}
                          onValueChange={([value]) => 
                            setSettings(prev => ({ ...prev, zoomLevel: value }))
                          }
                          min={1}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">{page.settings.show_grid}</label>
                        <Switch
                          checked={settings.showGrid}
                          onCheckedChange={(checked) => 
                            setSettings(prev => ({ ...prev, showGrid: checked }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* 颜色统计 */}
                  {uploadedImage && stats && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle>{page.color_stats.title}</CardTitle>
                        <div className="text-sm text-muted-foreground">
                          {page.color_stats.total}: <strong>{stats.colorsUsed.length}</strong> | 
                          {page.color_stats.free}: <strong>{stats.freeColors}</strong> | 
                          {page.color_stats.premium}: <strong>{stats.premiumColors}</strong>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-16 gap-1">
                          {stats.colorsUsed.map((usage, index) => (
                            <div
                              key={index}
                              className="group relative aspect-square cursor-pointer rounded border border-muted"
                              style={{ backgroundColor: usage.color.hex }}
                            >
                              {usage.color.isPremium && (
                                <div className="absolute -right-1 -top-1 size-3 rounded-full bg-yellow-500 border border-white" />
                              )}
                              
                              {/* 工具提示 */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                <div className="text-center">
                                  <div className="font-medium">{usage.color.name}</div>
                                  <div className="text-gray-300">{usage.color.hex}</div>
                                  <div className="text-gray-300">{usage.count} {page.color_stats.blocks}</div>
                                </div>
                                {/* 箭头 */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 官方调色板 */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>{page.palette.title}</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant={showFreeOnly ? "outline" : "default"}
                          size="sm"
                          onClick={() => setShowFreeOnly(false)}
                        >
                          {page.palette.all}
                        </Button>
                        <Button
                          variant={showFreeOnly ? "default" : "outline"}
                          size="sm"
                          onClick={() => setShowFreeOnly(true)}
                        >
                          {page.palette.free_only}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-20 gap-1">
                        {filteredColors.map((color, index) => (
                          <div
                            key={index}
                            className="group relative aspect-square cursor-pointer rounded border border-muted hover:border-primary"
                            style={{ backgroundColor: color.hex }}
                          >
                            {color.isPremium && (
                              <div className="absolute -right-1 -top-1 size-3 rounded-full bg-yellow-500 border border-white" />
                            )}
                            
                            {/* 工具提示 */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                              <div className="text-center">
                                <div className="font-medium">{color.name}</div>
                                <div className="text-gray-300">{color.hex}</div>
                              </div>
                              {/* 箭头 */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="size-3 rounded-full bg-yellow-500 border border-white" />
                          {page.palette.premium_note}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-8">
                {page.features.title}
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload className="h-8 w-8 text-orange-600" />
                    </div>
                    <CardTitle className="text-xl">{page.features.instant.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-gray-600">
                    <p>{page.features.instant.description}</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Palette className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">{page.features.official.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-gray-600">
                    <p>{page.features.official.description}</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Grid className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="text-xl">{page.features.analysis.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-gray-600">
                    <p>{page.features.analysis.description}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-8">
                {page.how_to_use.title}
              </h2>
              
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    1
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{page.how_to_use.steps.upload.title}</h3>
                  <p className="text-gray-600 text-sm">{page.how_to_use.steps.upload.description}</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    2
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{page.how_to_use.steps.adjust.title}</h3>
                  <p className="text-gray-600 text-sm">{page.how_to_use.steps.adjust.description}</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    3
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{page.how_to_use.steps.analyze.title}</h3>
                  <p className="text-gray-600 text-sm">{page.how_to_use.steps.analyze.description}</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    4
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{page.how_to_use.steps.download.title}</h3>
                  <p className="text-gray-600 text-sm">{page.how_to_use.steps.download.description}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 bg-orange-600">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                {page.cta.title}
              </h2>
              <p className="text-xl text-orange-100 mb-8">
                {page.cta.description}
              </p>
              <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-3 text-lg">
                <CheckCircle className="mr-2 h-6 w-6" />
                {page.cta.button}
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-8">
                {page.faq.title}
              </h2>
              
              <div className="space-y-6">
                {page.faq.items.map((item, index) => (
                  <Card key={index} className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg">{item.question}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        {index === page.faq.items.length - 1 && item.answer.includes('main Wplace Pixel homepage') ? (
                          // Last FAQ item with link
                          <span dangerouslySetInnerHTML={{
                            __html: item.answer.replace(
                              'main Wplace Pixel homepage',
                              '<a href="/" class="text-blue-600 hover:text-blue-800 font-medium underline decoration-2 underline-offset-2">main Wplace Pixel homepage</a>'
                            )
                          }} />
                        ) : (
                          item.answer
                        )}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}