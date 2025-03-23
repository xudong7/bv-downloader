import BilibiliAPI from './utils/BilibiliAPI.js';
import FileManager from './utils/FileManager.js';
import VideoDownloader from './utils/VideoDownloader.js';
import readline from 'readline';
import path from 'path';

const api = new BilibiliAPI();
const fileManager = new FileManager();
const downloader = new VideoDownloader(api, fileManager);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 工具函数：将readline包装成Promise
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

// 处理下载目录设置
async function askDownloadDirectory() {
    const dir = await askQuestion('请输入下载目录 (直接回车使用当前目录): ');
    if (dir.trim()) {
        const fullPath = path.resolve(dir);
        await fileManager.ensureDir(fullPath);
        downloader.setDownloadDir(fullPath);
        console.log(`下载目录已设置为: ${fullPath}`);
    } else {
        console.log('将使用当前目录作为下载目录');
    }
}

// 添加全局设置询问
async function askGlobalSettings() {
    const answer = await askQuestion('是否忽略视频时长检查（超过1小时的视频将直接下载）? (y/n): ');
    downloader.setIgnoreDuration(answer.toLowerCase() === 'y');
}

// 处理用户选择
async function handleUserChoice(url) {
    if (url.includes('space.bilibili.com') && url.includes('favlist')) {
        await downloader.downloadFavorites(url);
        return;
    }

    console.log('\n请选择下载模式:');
    console.log('1. 下载单个视频');
    console.log('2. 下载整个合集(如果存在)');

    try {
        const choice = await askQuestion('请输入选择 (1 或 2): ');

        switch (choice.trim()) {
            case '1':
                await downloader.downloadVideo(url);
                break;
            case '2':
                await downloader.downloadCollection(url);
                break;
            default:
                console.log('无效的选择，默认下载单个视频');
                await downloader.downloadVideo(url);
        }
    } catch (error) {
        console.error('下载失败:', error.message);
    }
}

// 主程序入口
console.log('请输入B站视频URL或收藏夹URL:');
rl.on('line', async (url) => {
    if (url.includes('bilibili.com/')) {
        try {
            await askGlobalSettings();
            await askDownloadDirectory();
            await handleUserChoice(url);
        } catch (error) {
            console.error('处理失败:', error.message);
        } finally {
            rl.close();
        }
    } else {
        console.log('请输入有效的B站视频URL');
        rl.close();
    }
});

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n程序已终止');
    process.exit(0);
});
