#!/usr/bin/env node

/**
 * 插件文件完整性验证脚本
 * 检查所有必要的文件是否存在并且内容有效
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 验证 Obsidian Incremental Reading Plugin v2.0.0 文件完整性...\n');

// 必需的文件列表
const requiredFiles = [
    'main.js',
    'manifest.json',
    'styles.css',
    'package.json'
];

// 可选但推荐包含的文件
const optionalFiles = [
    'README.md',
    'LICENSE',
    'INSTALL.md'
];

let allRequiredFilesExist = true;
let issues = [];

// 检查必需文件
console.log('📋 检查必需文件:');
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`  ✅ ${file} (${sizeKB} KB)`);

        // 特殊检查
        if (file === 'manifest.json') {
            try {
                const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
                if (!manifest.id || !manifest.version || !manifest.css) {
                    issues.push(`${file}: 缺少必要字段 (id, version, 或 css)`);
                }
            } catch (e) {
                issues.push(`${file}: JSON 格式错误`);
            }
        }
    } else {
        console.log(`  ❌ ${file} - 文件不存在!`);
        allRequiredFilesExist = false;
    }
});

// 检查可选文件
console.log('\n📚 检查推荐文件:');
optionalFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`  ✅ ${file} (${sizeKB} KB)`);
    } else {
        console.log(`  ⚠️  ${file} - 推荐包含但不存在`);
    }
});

// 检查 manifest.json 内容
console.log('\n📄 验证 manifest.json 内容:');
if (fs.existsSync('manifest.json')) {
    try {
        const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
        console.log(`  ✅ 插件ID: ${manifest.id}`);
        console.log(`  ✅ 版本: ${manifest.version}`);
        console.log(`  ✅ 最低Obsidian版本: ${manifest.minAppVersion}`);
        console.log(`  ✅ CSS文件: ${manifest.css}`);
        console.log(`  ✅ 桌面专用: ${manifest.isDesktopOnly ? '是' : '否'}`);
        console.log(`  ✅ 描述长度: ${manifest.description?.length || 0} 字符`);
    } catch (e) {
        issues.push(`manifest.json 解析失败: ${e.message}`);
        console.log(`  ❌ JSON 解析错误: ${e.message}`);
    }
}

// 检查 main.js 大小
console.log('\n📊 验证 main.js:');
if (fs.existsSync('main.js')) {
    const stats = fs.statSync('main.js');
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`  ✅ 文件大小: ${sizeKB} KB`);

    if (stats.size < 10000) { // 小于10KB可能有问题
        issues.push('main.js 文件过小，可能编译不完整');
    }

    // 检查文件开头
    const content = fs.readFileSync('main.js', 'utf8');
    if (content.includes('ESBUILD')) {
        console.log(`  ✅ ESBUILD 编译标记存在`);
    } else {
        issues.push('main.js 可能不是通过 ESBUILD 编译的');
    }
}

// 总结
console.log('\n' + '='.repeat(50));
if (allRequiredFilesExist && issues.length === 0) {
    console.log('🎉 验证通过！插件文件完整且格式正确。');
    console.log('\n📦 安装说明:');
    console.log('1. 确保当前目录包含所有必需文件');
    console.log('2. 在 Obsidian 中选择 "从文件夹安装插件"');
    console.log('3. 选择当前目录');
    console.log('4. 重启 Obsidian 并启用插件');
} else {
    console.log('❌ 验证失败，发现以下问题:');
    issues.forEach(issue => console.log(`  - ${issue}`));

    if (!allRequiredFilesExist) {
        console.log('\n💡 缺少必需文件，请运行 npm run build 重新编译');
    }
}

console.log('\n🔗 相关文件:');
console.log('  - README.md: 详细说明文档');
console.log('  - INSTALL.md: 安装和使用指南');
console.log('  - styles.css: 完整的UI样式');
console.log('  - manifest.json: v2.0.0 配置');