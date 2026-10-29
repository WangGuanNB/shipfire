#!/usr/bin/env node

/**
 * 从 wrangler.jsonc 读取环境变量并在构建时设置
 * 用于解决 Next.js 构建时需要 NEXT_PUBLIC_* 变量的问题
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isLocalDevelopment = args[0] === 'next' && args[1] === 'dev';

// Local tunnels need their own origin and OAuth callback. Load Next's normal
// development env files first; Wrangler only supplies missing local defaults.
// Production/build commands intentionally retain Wrangler's existing precedence.
if (isLocalDevelopment) {
  require('@next/env').loadEnvConfig(path.join(__dirname, '..'), true);
}

// 读取 wrangler.jsonc 文件
const wranglerPath = path.join(__dirname, '..', 'wrangler.jsonc');
const wranglerContent = fs.readFileSync(wranglerPath, 'utf-8');

// 移除 JSONC 注释（处理 // 行注释和 /* */ 块注释）
let jsonContent = wranglerContent
  // 移除多行注释 /* */（非贪婪匹配）
  .replace(/\/\*[\s\S]*?\*\//g, '')
  // 移除单行注释 //（但不在字符串内）
  .split('\n')
  .map(line => {
    // 简单处理：如果行中包含 // 且不在引号内，则移除注释部分
    let inString = false;
    let escapeNext = false;
    let result = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        result += char;
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }
      if (!inString && char === '/' && i + 1 < line.length && line[i + 1] === '/') {
        // 找到注释开始，停止添加
        break;
      }
      result += char;
    }
    return result;
  })
  .join('\n');

// 解析 JSON
let wranglerConfig;
try {
  wranglerConfig = JSON.parse(jsonContent);
} catch (error) {
  console.error('❌ 解析 wrangler.jsonc 失败:', error.message);
  process.exit(1);
}

// 提取 vars 中的所有变量
const vars = wranglerConfig.vars || {};

// 设置所有变量到 process.env（包括 NEXT_PUBLIC_* 和其他变量）
Object.entries(vars).forEach(([key, value]) => {
  // 将所有变量设置为环境变量（字符串格式）
  // Empty template placeholders must not mask real values from .env.local or Secrets.
  if (value === null || value === undefined || String(value).trim() === '') return;
  if (isLocalDevelopment && process.env[key] !== undefined) return;
  process.env[key] = String(value);
});

// 输出已设置的变量（仅 NEXT_PUBLIC_* 用于调试）
const nextPublicVars = Object.keys(vars).filter(key => key.startsWith('NEXT_PUBLIC_'));
console.log(isLocalDevelopment
  ? 'Loaded local development environment; Wrangler supplies missing defaults (values hidden).'
  : `Loaded ${nextPublicVars.length} public settings from wrangler.jsonc (values hidden).`);

// 执行后续命令（如果有的话）
if (args.length > 0) {
  const { spawn } = require('child_process');
  const isWindows = process.platform === 'win32';
  
  // 在 Windows 上，使用 shell 执行命令；在其他平台也使用 shell 以便解析 node_modules/.bin
  const fullCommand = args.join(' ');
  
  const child = spawn(fullCommand, {
    stdio: 'inherit',
    shell: true, // 使用 shell 以便能找到 node_modules/.bin 中的命令
    env: { ...process.env }, // 确保传递所有环境变量（包括刚设置的）
    cwd: process.cwd()
  });
  
  child.on('error', (error) => {
    console.error('❌ 执行命令失败:', error.message);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
} else {
  // 如果没有后续命令，只设置环境变量（用于测试）
  console.log('ℹ️  环境变量已加载，但没有后续命令要执行');
}

