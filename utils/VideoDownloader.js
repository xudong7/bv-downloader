import ProgressBar from 'progress';
import axios from 'axios';
import path from 'path';

class VideoDownloader {
    constructor(bilibiliAPI, fileManager) {
        this.api = bilibiliAPI;
        this.fileManager = fileManager;
    }

    setDownloadDir(dir) {
        this.fileManager.setBaseDir(dir);
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

        const filePath = path.join(targetDir, fileName);
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

    async downloadVideo(url, targetDir = '.', pageNumber = 1) {
        const bvid = this._extractBvid(url);
        if (!bvid) throw new Error('无效的B站视频链接');

        console.log('正在获取视频信息...');
        const videoInfo = await this.api.getVideoInfo(bvid);
        const cid = this._getCid(videoInfo, pageNumber);

        if (!cid) {
            throw new Error('无法获取视频CID');
        }

        console.log(`找到视频: ${videoInfo.title}`);
        const videoUrl = await this.api.getVideoUrl(bvid, cid);

        const fileName = this._generateFileName(videoInfo, pageNumber);
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
}

export default VideoDownloader;
