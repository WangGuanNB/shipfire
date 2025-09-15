'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Upload, Download, Copy, Palette, Settings, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { ColorPage } from "@/types/pages/color";

// 简化的设置接口
interface SimpleSettings {
  pixelSize: number;
  scale: number;
  showGrid: boolean;
}

// Wplace 调色板颜色
const STANDARD_COLORS = [
  // 标准颜色 (Free)
  '#000000', '#3c3c3c', '#787878', '#d2d2d2', '#ffffff',
  '#600018', '#ed1c24', '#ff7f27', '#f6aa09', '#f9dd3b', '#fffabc',
  '#0eb968', '#13e67b', '#87ff5e', '#4093e4', '#aa38b9'
];

const PREMIUM_COLORS = [
  // 高级颜色 (Premium)
  '#aaaaaa', '#a50e1e', '#fa8072', '#e45c1a', '#9c8431',
  '#c5ad31', '#e8d45f', '#4a6b3a', '#5a944a', '#84c573',
  '#0f799f', '#bbfaf2', '#7dc7ff', '#4d31b8', '#4a4284',
  '#7a71c4', '#b5aef1', '#9b5249', '#d18078', '#fab6a4'
];

const WPLACE_COLORS = [...STANDARD_COLORS, ...PREMIUM_COLORS];

// 像素化处理函数
function pixelateImage(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, pixelSize: number) {
  // 获取图像数据
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // 创建临时画布保存原始图像
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx!.putImageData(imageData, 0, 0);
  
  // 清除原画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 用于收集使用的颜色
  const usedColorsSet = new Set<string>();
  
  // 应用像素化效果
  for (let y = 0; y < canvas.height; y += pixelSize) {
    for (let x = 0; x < canvas.width; x += pixelSize) {
      // 获取当前像素块的平均颜色
      const pixelData = tempCtx!.getImageData(x, y, pixelSize, pixelSize);
      const pixelAvgColor = getAverageColor(pixelData.data);
      
      // 找到最接近的Wplace颜色
      const wplaceColor = findClosestWplaceColor(pixelAvgColor);
      
      // 添加到使用的颜色集合
      usedColorsSet.add(wplaceColor);
      
      // 绘制像素块
      ctx.fillStyle = wplaceColor;
      ctx.fillRect(x, y, pixelSize, pixelSize);
    }
  }
  
  // 返回使用的颜色
  return Array.from(usedColorsSet);
}

// 计算像素块的平均颜色
function getAverageColor(data: Uint8ClampedArray) {
  let r = 0, g = 0, b = 0, count = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) { // 仅考虑非透明像素
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  
  if (count === 0) return { r: 0, g: 0, b: 0 };
  
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  };
}

// 将RGB颜色转换为十六进制
function rgbToHex(r: number, g: number, b: number) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// 将十六进制颜色转换为RGB
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// 计算颜色距离（欧几里得距离）
function colorDistance(color1: {r: number, g: number, b: number}, color2: {r: number, g: number, b: number}) {
  return Math.sqrt(
    Math.pow(color1.r - color2.r, 2) +
    Math.pow(color1.g - color2.g, 2) +
    Math.pow(color1.b - color2.b, 2)
  );
}

// 找到最接近的Wplace颜色
function findClosestWplaceColor(color: {r: number, g: number, b: number}) {
  let closestColor = WPLACE_COLORS[0];
  let minDistance = Number.MAX_VALUE;
  
  for (const wplaceColor of WPLACE_COLORS) {
    const wplaceRgb = hexToRgb(wplaceColor);
    const distance = colorDistance(color, wplaceRgb);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = wplaceColor;
    }
  }
  
  return closestColor;
}

// 绘制网格
function drawGrid(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, pixelSize: number) {
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 0.5;
  
  // 绘制竖线
  for (let x = 0; x <= width; x += pixelSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  
  // 绘制横线
  for (let y = 0; y <= height; y += pixelSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  
  ctx.stroke();
}

interface ColorConverterProps {
  page: ColorPage;
}

export default function ColorConverter({ page }: ColorConverterProps) {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<SimpleSettings>({
    pixelSize: 12,
    scale: 1.0,
    showGrid: true
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [usedColors, setUsedColors] = useState<string[]>([]);
  const [colorStats, setColorStats] = useState({
    total: 0,
    standard: 0,
    premium: 0
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 防止hydration错误
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 当像素大小或显示网格设置改变时重新处理图像
  useEffect(() => {
    if (canvasRef.current && uploadedImage) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 重新加载和处理图像
        const img = new Image();
        img.onload = () => {
          // 设置canvas尺寸
          const maxSize = 800;
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          // 绘制原始图像
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // 应用像素化并获取使用的颜色
          const colors = pixelateImage(canvas, ctx, settings.pixelSize);
          
          // 计算颜色统计信息
          setUsedColors(colors);
          const standardCount = colors.filter(color => STANDARD_COLORS.includes(color)).length;
          const premiumCount = colors.filter(color => PREMIUM_COLORS.includes(color)).length;
          
          setColorStats({
            total: colors.length,
            standard: standardCount,
            premium: premiumCount
          });
          
          // 如果启用网格，绘制网格
          if (settings.showGrid && settings.pixelSize > 4) {
            drawGrid(canvas, ctx, settings.pixelSize);
          }
        };
        img.src = URL.createObjectURL(uploadedImage);
      }
    }
  }, [settings.pixelSize, settings.showGrid, uploadedImage]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size cannot exceed 10MB');
      return;
    }

    setIsProcessing(true);
    setUploadedImage(file);

    try {
      // 简化的图像处理
      const img = new Image();
      img.onload = () => {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // 设置canvas尺寸
            const maxSize = 800; // 限制最大尺寸
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            // 先绘制原始图像到画布
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // 开始像素化处理
            pixelateImage(canvas, ctx, settings.pixelSize);
            
            // 如果启用网格，显示网格
            if (settings.showGrid && settings.pixelSize > 4) {
              drawGrid(canvas, ctx, settings.pixelSize);
            }
            
            toast.success('Image processed successfully!');
          }
        }
        setIsProcessing(false);
      };
      
      img.onerror = () => {
        toast.error('Failed to load image');
        setIsProcessing(false);
      };
      
      img.src = URL.createObjectURL(file);
    } catch (error) {
      toast.error('Upload failed');
      setIsProcessing(false);
    }
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
    link.download = 'wplace-pixel-art.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    
    toast.success('Downloaded successfully!');
  }, []);

  // 防止hydration问题，在客户端挂载前显示简单内容
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <section className="py-12 bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="container">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="mb-4 text-4xl font-bold tracking-tight lg:text-6xl">
                {page.hero.title}
              </h1>
              <p className="text-xl text-muted-foreground lg:text-2xl">
                {page.loading}
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6">
              <Badge variant="secondary" className="mb-4">
                <Palette className="mr-2 size-4" />
                {page.hero.badge}
              </Badge>
              <h1 className="mb-4 text-4xl font-bold tracking-tight lg:text-6xl">
                {page.hero.title}
              </h1>
              <p className="text-xl text-muted-foreground lg:text-2xl">
                {page.hero.description}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                ✨ {page.hero.features.quality}
              </div>
              <div className="flex items-center gap-2">
                🔒 {page.hero.features.privacy}
              </div>
              <div className="flex items-center gap-2">
                💫 {page.hero.features.preview}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Converter Section */}
      <section className="py-12">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Left Column: Image Upload */}
              <Card className="shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="size-5" />
                    {page.upload.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    data-upload-section
                    className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/25 transition-all duration-200 hover:border-primary/50 hover:bg-muted/50 ${
                      !uploadedImage ? 'min-h-[450px]' : 'h-[450px]'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {!uploadedImage ? (
                      <div className="text-center">
                        <Upload className="mx-auto mb-3 size-12 text-muted-foreground" />
                        <h3 className="mb-2 text-lg font-semibold">
                          {page.upload.heading}
                        </h3>
                        <p className="mb-3 text-muted-foreground text-sm">
                          {page.upload.description}
                        </p>
                        <div className="rounded-lg bg-background/50 px-3 py-1.5 text-xs">
                          {page.upload.support}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full overflow-auto relative">
                        <canvas
                          ref={canvasRef}
                          className="rounded border shadow-sm max-w-full max-h-full"
                          style={{
                            transform: `scale(${settings.scale})`,
                            transformOrigin: 'top left'
                          }}
                        />
                        {isProcessing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                            <div className="text-white text-lg">{page.upload.processing}</div>
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

                  {/* Download Options */}
                  {uploadedImage && (
                    <div className="mt-6 flex gap-3">
                      <Button onClick={handleDownload} className="flex-1">
                        <Download className="mr-2 size-4" />
                        {page.upload.download}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right Column: Settings */}
              <div className="space-y-6">
                <Card className="shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="size-5" />
                      {page.settings.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Pixel Size */}
                    <div>
                      <div className="mb-2 flex justify-between">
                        <label className="text-sm font-medium">{page.settings.pixel_size}</label>
                        <span className="text-sm text-muted-foreground">{settings.pixelSize}px</span>
                      </div>
                      <Slider
                        value={[settings.pixelSize]}
                        onValueChange={([value]) => 
                          setSettings(prev => ({ ...prev, pixelSize: value }))
                        }
                        min={1}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Preview Scale */}
                    <div>
                      <div className="mb-2 flex justify-between">
                        <label className="text-sm font-medium">{page.settings.preview_scale}</label>
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

                    {/* Show Grid Toggle */}
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

                {/* Status */}
                <Card className="shadow-lg">
                  <CardHeader className="pb-1">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="size-5" />
                      {page.status.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="py-0">
                      {uploadedImage ? (
                        <div>
                          <div className="text-green-600 font-semibold mb-1">✅ {page.status.image_loaded}</div>
                          <div className="text-sm text-muted-foreground mb-0">
                            {page.status.file}: {uploadedImage.name}
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {page.status.size}: {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                          
                          {usedColors.length > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-medium">
                                  <div className="flex items-center">
                                    <Palette className="h-4 w-4 mr-1" />
                                    {page.status.colors_used}
                                  </div>
                                </div>
                                <div className="flex gap-3 text-sm">
                                  <span className="text-muted-foreground">{page.status.total}: <span className="font-semibold">{colorStats.total}</span></span>
                                  <span className="text-green-600">{page.status.free}: <span className="font-semibold">{colorStats.standard}</span></span>
                                  <span className="text-amber-600">{page.status.premium}: <span className="font-semibold">{colorStats.premium}</span></span>
                                </div>
                              </div>
                              
                              <p className="text-xs text-muted-foreground mb-3">
                                {page.status.description}
                              </p>
                              
                              <div className="flex flex-wrap gap-1 mb-1">
                                {usedColors.map((color, index) => (
                                  <div 
                                    key={`color-${index}`}
                                    className="relative size-5 rounded border border-gray-300 dark:border-gray-600"
                                    style={{ backgroundColor: color }}
                                  >
                                    {PREMIUM_COLORS.includes(color) && (
                                      <div className="absolute -right-1 -top-1 size-2 rounded-full bg-amber-500 border border-white" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-muted-foreground mb-2">{page.status.no_image}</div>
                          <div className="text-sm text-muted-foreground">
                            {page.status.upload_to_start}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wplace Color Palette Section */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="mb-4 text-3xl font-bold">{page.palette.title}</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Complete 64-color palette with free and premium colors for perfect Wplace pixel art creation
              </p>
            </div>

            {/* Premium Colors Section */}
            <div className="mb-12">
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-full">
                  <span className="text-amber-600 font-semibold">✨ Premium Wplace.live Colors</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {/* Premium colors with real data */}
                {[
                  { name: 'Medium Gray', hex: '#aaaaaa' },
                  { name: 'Dark Red', hex: '#a50e1e' },
                  { name: 'Light Red', hex: '#fa8072' },
                  { name: 'Dark Orange', hex: '#e45c1a' },
                  { name: 'Dark Goldenrod', hex: '#9c8431' },
                  { name: 'Goldenrod', hex: '#c5ad31' },
                  { name: 'Light Goldenrod', hex: '#e8d45f' },
                  { name: 'Dark Olive', hex: '#4a6b3a' },
                  { name: 'Olive', hex: '#5a944a' },
                  { name: 'Light Olive', hex: '#84c573' },
                  { name: 'Dark Cyan', hex: '#0f799f' },
                  { name: 'Light Cyan', hex: '#bbfaf2' },
                  { name: 'Light Blue', hex: '#7dc7ff' },
                  { name: 'Dark Indigo', hex: '#4d31b8' },
                  { name: 'Dark Slate Blue', hex: '#4a4284' },
                  { name: 'Slate Blue', hex: '#7a71c4' },
                  { name: 'Light Slate Blue', hex: '#b5aef1' },
                  { name: 'Dark Peach', hex: '#9b5249' },
                  { name: 'Peach', hex: '#d18078' },
                  { name: 'Light Peach', hex: '#fab6a4' }
                ].map((color, i) => (
                  <div key={`premium-${i}`} className="group bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div 
                          className="w-12 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-600 cursor-pointer"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="absolute -right-1 -top-1 size-3 rounded-full bg-amber-500 border border-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                          {color.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-600 font-mono">
                          {color.hex}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(color.hex);
                          toast.success(`Copied ${color.hex}!`);
                        }}
                        className="p-1.5 text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded"
                        title="Copy color code"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {page.palette.premium_section}. {page.palette.premium_identification}
                </p>
              </div>
            </div>

            {/* Standard Colors Section */}
            <div className="mb-12">
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-full">
                  <span className="text-green-600 font-semibold">{page.palette.standard_colors}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {/* Standard colors with real data */}
                {[
                  { name: 'Black', hex: '#000000' },
                  { name: 'Dark Gray', hex: '#3c3c3c' },
                  { name: 'Gray', hex: '#787878' },
                  { name: 'Light Gray', hex: '#d2d2d2' },
                  { name: 'White', hex: '#ffffff' },
                  { name: 'Deep Red', hex: '#600018' },
                  { name: 'Red', hex: '#ed1c24' },
                  { name: 'Orange', hex: '#ff7f27' },
                  { name: 'Gold', hex: '#f6aa09' },
                  { name: 'Yellow', hex: '#f9dd3b' },
                  { name: 'Light Yellow', hex: '#fffabc' },
                  { name: 'Dark Green', hex: '#0eb968' },
                  { name: 'Green', hex: '#13e67b' },
                  { name: 'Light Green', hex: '#87ff5e' },
                  { name: 'Blue', hex: '#4093e4' },
                  { name: 'Purple', hex: '#aa38b9' }
                ].map((color, i) => (
                  <div key={`standard-${i}`} className="group bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-600 cursor-pointer"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                          {color.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-600 font-mono">
                          {color.hex}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(color.hex);
                          toast.success(`Copied ${color.hex}!`);
                        }}
                        className="p-1.5 text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded"
                        title="Copy color code"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {page.palette.standard_description}
                </p>
              </div>
            </div>

            {/* Compact Grid View */}
            <div className="text-center bg-muted/50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">{page.palette.integration_title}</h3>
              <p className="text-muted-foreground mb-6">
                {page.palette.integration_description}
              </p>
              
              {/* Compact color grid like reference image */}
              <div className="bg-gray-800 rounded-lg p-6 mb-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-amber-100 dark:bg-amber-900/30 px-4 py-2 rounded-full">
                    <span className="text-amber-600 font-semibold text-sm">✨ Premium Wplace.live Colors</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                  {[
                    '#cc4125', '#e06040', '#f2a889', '#d2691e', '#daa520', '#f0e68c',
                    '#9acd32', '#6b8e23', '#98fb98', '#20b2aa', '#87ceeb', '#4169e1',
                    '#6a5acd', '#9370db', '#dda0dd', '#c71585', '#ff69b4', '#ffb6c1',
                    '#8b4513', '#a0522d', '#d2b48c', '#708090', '#778899', '#b0c4de',
                    '#cc4125', '#e06040', '#f2a889', '#d2691e', '#daa520', '#f0e68c',
                    '#9acd32', '#6b8e23', '#98fb98', '#20b2aa', '#87ceeb', '#4169e1',
                    '#6a5acd', '#9370db', '#dda0dd', '#c71585', '#ff69b4', '#ffb6c1',
                    '#8b4513', '#a0522d', '#d2b48c', '#708090', '#778899', '#b0c4de'
                  ].map((color, i) => (
                    <div key={`compact-${i}`} className="group relative">
                      <div 
                        className="aspect-square rounded border border-gray-600 hover:border-amber-400 transition-colors cursor-pointer"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          navigator.clipboard.writeText(color);
                          toast.success(`Copied ${color}!`);
                        }}
                      >
                        <div className="absolute -right-1 -top-1 size-2 rounded-full bg-amber-500 border border-white" />
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-white/70 text-xs mt-4">
                  {page.palette.premium_section}. {page.palette.premium_identification}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="mb-4 text-3xl font-bold">{page.why_choose.title}</h2>
              <p className="text-lg text-muted-foreground">
                The ultimate color converter and Wplace color palette tool for professional pixel art creation
              </p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center bg-background rounded-lg p-6 shadow-sm">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                  <span className="text-2xl">💚</span>
                </div>
                <h3 className="mb-3 font-semibold text-lg">{page.why_choose.free.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {page.why_choose_details.free.prefix} {page.why_choose.free.description} {page.why_choose_details.free.suffix}
                </p>
              </div>
              
              <div className="text-center bg-background rounded-lg p-6 shadow-sm">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="mb-3 font-semibold text-lg">{page.why_choose.privacy.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {page.why_choose_details.privacy.description}
                </p>
              </div>
              
              <div className="text-center bg-background rounded-lg p-6 shadow-sm">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
                  <span className="text-2xl">🎨</span>
                </div>
                <h3 className="mb-3 font-semibold text-lg">{page.why_choose_details.interface.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {page.why_choose_details.interface.description}
                </p>
              </div>
              
              <div className="text-center bg-background rounded-lg p-6 shadow-sm">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                  <span className="text-2xl">📏</span>
                </div>
                <h3 className="mb-3 font-semibold text-lg">{page.why_choose_details.no_limits.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {page.why_choose_details.no_limits.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Use Section */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="mb-4 text-3xl font-bold">{page.how_to_use.title}</h2>
              <p className="text-lg text-muted-foreground">{page.how_to_use.description}</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold">
                  1
                </div>
                <h3 className="mb-4 font-semibold text-lg">{page.how_to_use.steps.upload.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {page.how_to_use.steps.upload.description}
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold">
                  2
                </div>
                <h3 className="mb-4 font-semibold text-lg">{page.how_to_use.steps.convert.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {page.how_to_use.steps.convert.description}
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold">
                  3
                </div>
                <h3 className="mb-4 font-semibold text-lg">{page.how_to_use.steps.analyze.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {page.how_to_use.steps.analyze.description}
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold">
                  4
                </div>
                <h3 className="mb-4 font-semibold text-lg">{page.how_to_use.steps.download.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {page.how_to_use.steps.download.description}
                </p>
              </div>
            </div>

            <div className="mt-12 text-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-4">{page.cta.title}</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                {page.cta.description}
              </p>
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  const uploadSection = document.querySelector('[data-upload-section]');
                  uploadSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {page.cta.button}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <h2 className="mb-3 text-3xl font-bold text-gray-800">{page.faq.title}</h2>
              <p className="text-gray-600">{page.faq.subtitle}</p>
            </div>
            <div className="space-y-6">
              {page.faq.items.map((item, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-lg">
                  <h3 className="text-xl font-medium text-gray-800 mb-2">{item.question}</h3>
                  <p className="text-gray-600">
                    {index === page.faq.items.length - 1 && item.answer.includes('main Wplace Pixel homepage') ? (
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What Players Say */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-10">
              <h2 className="mb-3 text-3xl font-bold text-gray-800">{page.testimonials.title}</h2>
              <p className="text-gray-600">{page.testimonials.subtitle}</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {page.testimonials.items.map((testimonial, index) => (
                <Card key={index} className="h-full bg-white border-gray-200">
                  <CardContent className="pt-6">
                    <div className="mb-2 text-yellow-500">{testimonial.rating}</div>
                    <p className="text-sm text-gray-300">
                      {testimonial.text}
                    </p>
                    <div className="mt-4 text-sm font-medium text-gray-200">{testimonial.author}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}