import { ColorPalette, ConversionStats, ColorUsage } from '@/types/pixel-converter';
import { WPLACE_COLOR_PALETTE } from './color-palette';

// 计算两个颜色之间的欧几里得距离
function colorDistance(color1: [number, number, number], color2: [number, number, number]): number {
  const [r1, g1, b1] = color1;
  const [r2, g2, b2] = color2;
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// 将十六进制颜色转换为RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
}

// 将RGB颜色转换为十六进制
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// 找到最接近的调色板颜色
function findClosestColor(targetColor: [number, number, number]): ColorPalette {
  let minDistance = Infinity;
  let closestColor = WPLACE_COLOR_PALETTE[0];
  
  for (const paletteColor of WPLACE_COLOR_PALETTE) {
    const paletteRgb = hexToRgb(paletteColor.hex);
    const distance = colorDistance(targetColor, paletteRgb);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = paletteColor;
    }
  }
  
  return closestColor;
}

// 处理图片并转换为像素艺术
export async function convertImageToPixelArt(
  imageFile: File,
  pixelSize: number = 12
): Promise<{
  canvas: HTMLCanvasElement;
  stats: ConversionStats;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('无法获取canvas上下文');

        // 计算新的尺寸
        const horizontalBlocks = Math.ceil(img.width / pixelSize);
        const verticalBlocks = Math.ceil(img.height / pixelSize);
        
        canvas.width = horizontalBlocks * pixelSize;
        canvas.height = verticalBlocks * pixelSize;

        // 绘制原始图片
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 获取图片数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 用于统计颜色使用情况
        const colorUsageMap = new Map<string, ColorUsage>();

        // 像素化处理
        for (let y = 0; y < verticalBlocks; y++) {
          for (let x = 0; x < horizontalBlocks; x++) {
            // 计算当前块的平均颜色
            let totalR = 0, totalG = 0, totalB = 0, pixelCount = 0;
            
            for (let py = y * pixelSize; py < (y + 1) * pixelSize && py < canvas.height; py++) {
              for (let px = x * pixelSize; px < (x + 1) * pixelSize && px < canvas.width; px++) {
                const index = (py * canvas.width + px) * 4;
                totalR += data[index];
                totalG += data[index + 1];
                totalB += data[index + 2];
                pixelCount++;
              }
            }

            if (pixelCount > 0) {
              const avgR = Math.round(totalR / pixelCount);
              const avgG = Math.round(totalG / pixelCount);
              const avgB = Math.round(totalB / pixelCount);

              // 找到最接近的调色板颜色
              const closestColor = findClosestColor([avgR, avgG, avgB]);
              const closestRgb = hexToRgb(closestColor.hex);

              // 统计颜色使用
              if (colorUsageMap.has(closestColor.hex)) {
                colorUsageMap.get(closestColor.hex)!.count++;
              } else {
                colorUsageMap.set(closestColor.hex, {
                  color: closestColor,
                  count: 1
                });
              }

              // 填充像素块
              ctx.fillStyle = closestColor.hex;
              ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
          }
        }

        // 计算统计信息
        const colorsUsed = Array.from(colorUsageMap.values());
        const freeColors = colorsUsed.filter(usage => !usage.color.isPremium).length;
        const premiumColors = colorsUsed.filter(usage => usage.color.isPremium).length;

        const stats: ConversionStats = {
          horizontalBlocks,
          verticalBlocks,
          totalBlocks: horizontalBlocks * verticalBlocks,
          colorsUsed,
          freeColors,
          premiumColors
        };

        resolve({ canvas, stats });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(imageFile);
  });
}

// 在canvas上绘制网格
export function drawGrid(canvas: HTMLCanvasElement, pixelSize: number, showGrid: boolean) {
  if (!showGrid) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;

  // 绘制垂直线
  for (let x = 0; x <= canvas.width; x += pixelSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // 绘制水平线
  for (let y = 0; y <= canvas.height; y += pixelSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}