import axios from 'axios';
import fs from 'fs';
import path from 'path';
import ProgressBar from 'progress';
import readline from 'readline';
import { parse } from 'url';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getBilibiliVideoInfo(bvid) {
    try {
        const response = await axios.get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
        return response.data.data;
    } catch (error) {
        throw new Error('获取视频信息失败');
    }
}

async function getVideoUrl(bvid, cid) {
    try {
        const response = await axios.get(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=80`);
        return response.data.data.durl[0].url;
    } catch (error) {
        throw new Error('获取视频下载地址失败');
    }
}

async function getCollectionInfo(bvid) {
    try {
        const videoInfo = await getBilibiliVideoInfo(bvid);
        if (!videoInfo.ugc_season) {
            return null;
        }
        return {
            title: videoInfo.ugc_season.title,
            episodes: videoInfo.ugc_season.sections[0].episodes
        };
    } catch (error) {
        throw new Error('获取合集信息失败');
    }
}

async function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
}

// 添加安全的文件名处理函数
function sanitizeFileName(fileName) {
    // 仅替换Windows文件系统不允许的字符
    return fileName
        .replace(/[<>:"/\\|?*]/g, '_')  // 替换Windows不允许的字符
        .replace(/\s+/g, ' ')           // 将多个空格替换为单个空格
        .trim();                        // 移除首尾空格
}

async function downloadSingleVideo(url, targetDir = '.') {
    try {
        const bvid = url.match(/BV[a-zA-Z0-9]+/)?.[0];
        if (!bvid) {
            throw new Error('无效的B站视频链接');
        }

        console.log('正在获取视频信息...');
        const videoInfo = await getBilibiliVideoInfo(bvid);
        const videoTitle = sanitizeFileName(videoInfo.title); // 使用新的文件名处理函数
        const fileName = path.join(targetDir, `${videoTitle}.mp4`);

        console.log(`找到视频: ${videoTitle}`);
        const videoUrl = await getVideoUrl(bvid, videoInfo.cid);

        // 设置下载请求头
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.bilibili.com',
            'Range': 'bytes=0-'
        };

        const response = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            headers: headers
        });

        const totalLength = response.headers['content-length'];
        console.log('开始下载...');

        const bar = new ProgressBar('下载进度: [:bar] :percent :etas', {
            width: 40,
            complete: '=',
            incomplete: ' ',
            total: parseInt(totalLength)
        });

        const writer = fs.createWriteStream(fileName);
        response.data.on('data', (chunk) => {
            writer.write(chunk);
            bar.tick(chunk.length);
        });

        response.data.on('end', () => {
            writer.end();
            console.log(`\n下载完成! 文件已保存为: ${fileName}`);
        });

        return fileName;
    } catch (error) {
        console.error('下载出错:', error.message);
        return null;
    }
}

async function downloadCollection(url) {
    try {
        const bvid = url.match(/BV[a-zA-Z0-9]+/)?.[0];
        const collectionInfo = await getCollectionInfo(bvid);
        
        if (!collectionInfo) {
            console.log('未找到合集信息，将作为单个视频下载...');
            return await downloadSingleVideo(url);
        }

        const dirName = sanitizeFileName(collectionInfo.title); // 使用新的文件名处理函数
        const targetDir = await ensureDir(dirName);
        
        console.log(`找到合集: ${collectionInfo.title}`);
        console.log(`共${collectionInfo.episodes.length}个视频`);

        for (let i = 0; i < collectionInfo.episodes.length; i++) {
            const episode = collectionInfo.episodes[i];
            // 保留原始标题
            console.log(`\n[${i + 1}/${collectionInfo.episodes.length}] 下载: ${episode.title}`);
            await downloadSingleVideo(`https://www.bilibili.com/video/${episode.bvid}`, targetDir);
        }

        console.log('\n合集下载完成！保存在文件夹:', dirName);
    } catch (error) {
        console.error('下载合集失败:', error.message);
    }
}

// 在 downloadCollection 函数前添加新的选择处理函数
async function handleUserChoice(url) {
    console.log('\n请选择下载模式:');
    console.log('1. 下载单个视频');
    console.log('2. 下载整个合集(如果存在)');
    
    return new Promise((resolve) => {
        rl.question('请输入选择 (1 或 2): ', async (choice) => {
            switch (choice.trim()) {
                case '1':
                    await downloadSingleVideo(url);
                    break;
                case '2':
                    await downloadCollection(url);
                    break;
                default:
                    console.log('无效的选择，默认下载单个视频');
                    await downloadSingleVideo(url);
            }
            resolve();
        });
    });
}

// 修改启动程序部分
console.log('请输入B站视频URL:');
rl.on('line', async (url) => {
    if (url.includes('bilibili.com/')) {
        try {
            await handleUserChoice(url);
        } catch (error) {
            console.error('处理失败:', error.message);
        }
    } else {
        console.log('请输入有效的B站视频URL');
    }
    rl.close();
});
