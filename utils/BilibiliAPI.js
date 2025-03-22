import axios from 'axios';

class BilibiliAPI {
    constructor() {
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.bilibili.com'
        };
    }

    async getVideoInfo(bvid) {
        try {
            const response = await axios.get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
            return response.data.data;
        } catch (error) {
            throw new Error('获取视频信息失败');
        }
    }

    async getVideoUrl(bvid, cid) {
        try {
            const response = await axios.get(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=80`);
            return response.data.data.durl[0].url;
        } catch (error) {
            throw new Error('获取视频下载地址失败');
        }
    }

    async getCollectionInfo(bvid) {
        const videoInfo = await this.getVideoInfo(bvid);
        if (videoInfo.pages?.length > 1) {
            return this._handleMultiPartVideo(videoInfo);
        }
        if (videoInfo.ugc_season) {
            return this._handleUgcSeason(videoInfo);
        }
        return null;
    }

    _handleMultiPartVideo(videoInfo) {
        return {
            title: videoInfo.title,
            episodes: videoInfo.pages.map(page => ({
                title: page.part,
                bvid: videoInfo.bvid,
                cid: page.cid,
                page: page.page
            }))
        };
    }

    _handleUgcSeason(videoInfo) {
        return {
            title: videoInfo.ugc_season.title,
            episodes: videoInfo.ugc_season.sections[0].episodes
        };
    }
}

export default BilibiliAPI;
