import ProgressBar from 'progress';
import axios from 'axios';
import path from 'path';
import readline from 'readline';

class VideoDownloader {
    constructor(bilibiliAPI, fileManager, uiManager) {
        this.api = bilibiliAPI;
        this.fileManager = fileManager;
        this.ui = uiManager || null; // 添加UI管理器
        this.ignoreDuration = false; // 添加时长检查开关
        this.confirmedCollections = new Set(); // 添加已确认合集的跟踪
    }

    setDownloadDir(dir) {
        this.fileManager.setBaseDir(dir);
        return this;
    }

    setIgnoreDuration(ignore) {
        this.ignoreDuration = ignore;
        return this;
    }

    _extractBvid(url) {
        return url.match(/BV[a-zA-Z0-9]+/)?.[0];
    }

    _getCid(videoInfo, pageNumber) {
        if (pageNumber > 1 && videoInfo.pages) {
            const page = videoInfo.pages.find(p => p.page === pageNumber);
            return page?.cid;
        }
        return videoInfo.cid;
    }

    _generateFileName(videoInfo, pageNumber) {
        const title = this.fileManager.sanitizeFileName(videoInfo.title);
        return pageNumber > 1 ? `${title}_P${pageNumber}.mp4` : `${title}.mp4`;
    }

    async _handleDownload(response, fileName, targetDir) {
        const totalLength = response.headers['content-length'];
        console.log('开始下载...');

        const bar = new ProgressBar('下载进度: [:bar] :percent :etas', {
            width: 40,
            complete: '=',
            incomplete: ' ',
            total: parseInt(totalLength)
        });

        // 使用绝对路径确保文件保存在正确的位置
        const filePath = path.resolve(targetDir, fileName);
        // 直接传递绝对路径给createWriteStream
        const writer = this.fileManager.createWriteStream(filePath);

        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                writer.write(chunk);
                bar.tick(chunk.length);
            });

            response.data.on('end', () => {
                writer.end();
                console.log(`\n下载完成! 文件已保存为: ${filePath}`);
                resolve(filePath);
            });

            response.data.on('error', reject);
            writer.on('error', reject);
        });
    }

    async _askConfirmation(duration, title) {
        const minutes = Math.floor(duration / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        const durationText = `${hours}小时${remainingMinutes}分钟`;
        const answer = await new Promise(resolve => {
            // 创建新的readline接口，避免影响主接口
            const tempRl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            tempRl.question(
                `视频 "${title}" 时长为${durationText}，是否继续下载？(y/n): `,
                (ans) => {
                    tempRl.close();
                    resolve(ans);
                }
            );
        });
        return answer.toLowerCase() === 'y';
    }

    async _askCollectionConfirmation(collectionInfo) {
        const answer = await new Promise(resolve => {
            const tempRl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            tempRl.question(
                `是否下载合集 "${collectionInfo.title}" 的所有视频？(y/n): `,
                (ans) => {
                    tempRl.close();
                    resolve(ans);
                }
            );
        });
        if (answer.toLowerCase() === 'y') {
            // 记录已确认的合集标题
            this.confirmedCollections.add(collectionInfo.title);
        }
        return answer.toLowerCase() === 'y';
    }

    async downloadVideo(url, targetDir = this.fileManager.baseDir || '.', pageNumber = 1, collectionTitle = null) {
        const bvid = this._extractBvid(url);
        if (!bvid) throw new Error('无效的B站视频链接');

        console.log('正在获取视频信息...');
        const videoInfo = await this.api.getVideoInfo(bvid);
        this.ui.showVideoInfo(videoInfo);
        const fileName = this._generateFileName(videoInfo, pageNumber);
        // 使用path.resolve保持与_handleDownload方法一致的路径处理
        const filePath = path.resolve(targetDir, fileName);

        // 检查文件是否已存在
        if (this.fileManager.fileExists(filePath)) {
            console.log(`文件已存在，跳过下载: ${fileName}`);
            return filePath;
        }

        // 根据设置决定是否检查视频时长
        if (!this.ignoreDuration && videoInfo.duration > 3600) { // 3600秒 = 1小时
            // 如果视频属于已确认的合集，跳过确认
            if (!collectionTitle || !this.confirmedCollections.has(collectionTitle)) {
                const shouldDownload = await this._askConfirmation(videoInfo.duration, videoInfo.title);
                if (!shouldDownload) {
                    console.log('已取消下载');
                    return null;
                }
            }
        }

        const cid = this._getCid(videoInfo, pageNumber);
        if (!cid) {
            throw new Error('无法获取视频CID');
        }

        console.log(`找到视频: ${videoInfo.title}`);
        const videoUrl = await this.api.getVideoUrl(bvid, cid);

        await this.fileManager.ensureDir(targetDir);
        const response = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            headers: this.api.headers
        });

        return this._handleDownload(response, fileName, targetDir);
    }

    async downloadCollection(url) {
        const bvid = this._extractBvid(url);
        if (!bvid) throw new Error('无效的B站视频链接');

        const collectionInfo = await this.api.getCollectionInfo(bvid);
        if (!collectionInfo) {
            console.log('未找到合集信息，将作为单个视频下载...');
            return await this.downloadVideo(url);
        }

        const dirName = this.fileManager.sanitizeFileName(collectionInfo.title);
        const targetDir = await this.fileManager.ensureDir(dirName);

        console.log(`找到${collectionInfo.episodes.length > 1 ? '分P视频' : '合集'}: ${collectionInfo.title}`);
        console.log(`共${collectionInfo.episodes.length}个视频`);

        for (let i = 0; i < collectionInfo.episodes.length; i++) {
            const episode = collectionInfo.episodes[i];
            console.log(`\n[${i + 1}/${collectionInfo.episodes.length}] 下载: ${episode.title}`);

            if (episode.page) {
                await this.downloadVideo(`https://www.bilibili.com/video/${episode.bvid}`, targetDir, episode.page);
            } else {
                await this.downloadVideo(`https://www.bilibili.com/video/${episode.bvid}`, targetDir);
            }
        }

        console.log('\n全部下载完成！保存在文件夹:', dirName);
    }

    _extractFavInfo(url) {
        const midMatch = url.match(/space\.bilibili\.com\/(\d+)/);
        const fidMatch = url.match(/fid=(\d+)/);
        const typeMatch = url.match(/ftype=(\w+)/);

        if (midMatch && fidMatch) {
            return {
                mid: midMatch[1],
                fid: fidMatch[1],
                type: typeMatch && typeMatch[1] === 'collect' ? 'collected' : 'created'
            };
        }
        return null;
    }

    async downloadFavorites(url) {
        const favInfo = this._extractFavInfo(url);
        if (!favInfo) {
            throw new Error('无效的收藏夹链接');
        }

        this.ui.startSpinner('正在获取收藏夹信息...');
        const favList = await this.api.getFavList(favInfo.mid, favInfo.fid, favInfo.type);
        this.ui.stopSpinnerSuccess('获取收藏夹信息成功');
        
        // 显示收藏夹信息
        this.ui.showFavInfo(favList);

        const dirName = this.fileManager.sanitizeFileName(favList.title);
        const targetDir = await this.fileManager.ensureDir(dirName);
        
        // 询问是否下载整个收藏夹
        const answer = await new Promise(resolve => {
            const tempRl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            tempRl.question(
                this.ui.showPrompt(`是否下载收藏夹 "${favList.title}" 的所有视频？(y/n): `),
                (ans) => {
                    tempRl.close();
                    resolve(ans);
                }
            );
        });
        
        if (answer.toLowerCase() !== 'y') {
            this.ui.showInfo('已取消下载收藏夹');
            return;
        }

        let skipCount = 0;
        for (let i = 0; i < favList.videos.length; i++) {
            const video = favList.videos[i];
            this.ui.showInfo(`\n[${i + 1}/${favList.videos.length}] 处理: ${video.title}`);
            try {
                // 对于订阅的收藏夹，直接下载视频，不检查合集
                if (favInfo.type === 'collected') {
                    const videoFilePath = path.join(targetDir, `${this.fileManager.sanitizeFileName(video.title)}.mp4`);
                    if (this.fileManager.fileExists(videoFilePath)) {
                        this.ui.showWarning(`文件已存在，跳过下载: ${video.title}`);
                        skipCount++;
                        continue;
                    }
                    await this.downloadVideo(`https://www.bilibili.com/video/${video.bvid}`, targetDir);
                    continue;
                }

                // 自建收藏夹的处理逻辑保持不变
                const collectionInfo = await this.api.getCollectionInfo(video.bvid);
                if (collectionInfo) {
                    // 为合集创建子目录
                    const subDirName = this.fileManager.sanitizeFileName(video.title);
                    const subDir = await this.fileManager.ensureDir(path.join(targetDir, subDirName));

                    this.ui.showInfo(`发现${collectionInfo.episodes.length > 1 ? '分P视频' : '合集'}: ${video.title}`);
                    this.ui.showInfo(`共${collectionInfo.episodes.length}个视频`);

                    // 询问是否下载整个合集
                    const shouldDownloadAll = await this._askCollectionConfirmation(collectionInfo);
                    if (!shouldDownloadAll) {
                        this.ui.showInfo('已跳过此合集');
                        continue;
                    }

                    for (let j = 0; j < collectionInfo.episodes.length; j++) {
                        const episode = collectionInfo.episodes[j];
                        this.ui.showInfo(`\n  [${j + 1}/${collectionInfo.episodes.length}] 下载: ${episode.title}`);

                        if (episode.page) {
                            await this.downloadVideo(
                                `https://www.bilibili.com/video/${episode.bvid}`,
                                subDir,
                                episode.page,
                                collectionInfo.title
                            );
                        } else {
                            await this.downloadVideo(
                                `https://www.bilibili.com/video/${episode.bvid}`,
                                subDir,
                                1,
                                collectionInfo.title
                            );
                        }
                    }
                } else {
                    // 单个视频的处理
                    const videoFilePath = path.join(targetDir, `${this.fileManager.sanitizeFileName(video.title)}.mp4`);
                    if (this.fileManager.fileExists(videoFilePath)) {
                        this.ui.showWarning(`文件已存在，跳过下载: ${video.title}`);
                        skipCount++;
                        continue;
                    }
                    await this.downloadVideo(`https://www.bilibili.com/video/${video.bvid}`, targetDir);
                }
            } catch (error) {
                this.ui.showError(`下载视频 ${video.title} 失败: ${error.message}`);
                continue;
            }
            
            // 添加延迟，避免请求过于频繁
            if (i < favList.videos.length - 1) {
                this.ui.startSpinner('等待1秒后继续下一个视频...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                this.ui.stopSpinnerSuccess('准备下载下一个视频');
            }
        }

        this.ui.showSuccess('\n收藏夹下载完成！');
        this.ui.showSuccess(`共${favList.videos.length}个视频，${skipCount}个已存在被跳过，保存在文件夹: ${dirName}`);
    }
}

export default VideoDownloader;
