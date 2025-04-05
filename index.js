import BilibiliAPI from './utils/BilibiliAPI.js';
import FileManager from './utils/FileManager.js';
import VideoDownloader from './utils/VideoDownloader.js';
import UIManager from './utils/UIManager.js';
import readline from 'readline';
import path from 'path';

const api = new BilibiliAPI();
const fileManager = new FileManager();
const ui = new UIManager();
const downloader = new VideoDownloader(api, fileManager);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 工具函数：将readline包装成Promise
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

// 处理下载目录设置
async function askDownloadDirectory() {
    const dir = await askQuestion(ui.showPrompt('请输入下载目录 (直接回车使用当前目录): '));
    if (dir.trim()) {
        const fullPath = path.resolve(dir);
        await fileManager.ensureDir(fullPath);
        downloader.setDownloadDir(fullPath);
        ui.showSuccess(`下载目录已设置为: ${fullPath}`);
    } else {
        ui.showInfo('将使用当前目录作为下载目录');
    }
}

// 添加全局设置询问
async function askGlobalSettings() {
    ui.showSettings();
    const answer = await askQuestion(ui.showPrompt('是否忽略视频时长检查（超过1小时的视频将直接下载）? (y/n): '));
    downloader.setIgnoreDuration(answer.toLowerCase() === 'y');
    if (answer.toLowerCase() === 'y') {
        ui.showInfo('已设置忽略视频时长检查');
    }
}

// 处理用户选择
async function handleUserChoice(url) {
    if (url.includes('space.bilibili.com') && url.includes('favlist')) {
        ui.showInfo('检测到收藏夹链接，准备下载收藏夹内容...');
        await downloader.downloadFavorites(url);
        return;
    }

    ui.showDownloadOptions();

    try {
        const choice = await askQuestion(ui.showPrompt('请输入选择 (1 或 2): '));

        switch (choice.trim()) {
            case '1':
                await downloader.downloadVideo(url);
                break;
            case '2':
                await downloader.downloadCollection(url);
                break;
            default:
                ui.showWarning('无效的选择，默认下载单个视频');
                await downloader.downloadVideo(url);
        }
    } catch (error) {
        ui.showError(`下载失败: ${error.message}`);
    }
}

// 主程序入口
ui.showTitle();
console.log(ui.showPrompt('请输入B站视频URL或收藏夹URL:'));
rl.on('line', async (url) => {
    if (url.includes('bilibili.com/')) {
        try {
            await askGlobalSettings();
            await askDownloadDirectory();
            await handleUserChoice(url);
        } catch (error) {
            ui.showError(`处理失败: ${error.message}`);
        } finally {
            rl.close();
        }
    } else {
        ui.showError('请输入有效的B站视频URL');
        rl.close();
    }
});

// 优雅退出
process.on('SIGINT', () => {
    ui.showWarning('\n程序已终止');
    process.exit(0);
});
