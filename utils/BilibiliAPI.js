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

    async getFavList(mid, fid, type = 'created') {
        try {
            // 根据收藏夹类型选择不同的API接口
            const apiUrl = type === 'collected'
                ? `https://api.bilibili.com/x/v3/fav/folder/collected/list?up_mid=${mid}&platform=web`
                : `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${fid}&pn=1&ps=1&keyword=&order=mtime&type=0&tid=0&platform=web`;

            const infoResponse = await axios.get(apiUrl);
            if (infoResponse.data.code !== 0) {
                throw new Error(infoResponse.data.message);
            }

            // 处理不同类型收藏夹的数据结构
            const info = type === 'collected'
                ? this._findCollectedFavInfo(infoResponse.data.data, fid)
                : infoResponse.data.data.info;

            if (!info) {
                throw new Error('未找到收藏夹信息');
            }

            const totalCount = info.media_count;
            const pageSize = 20;
            const totalPages = Math.ceil(totalCount / pageSize);

            console.log(`收藏夹共有 ${totalCount} 个视频，开始获取所有视频信息...`);

            const allVideos = [];
            for (let page = 1; page <= totalPages; page++) {
                console.log(`正在获取第 ${page}/${totalPages} 页...`);
                const response = await axios.get(
                    `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${fid}&pn=${page}&ps=${pageSize}&keyword=&order=mtime&type=0&tid=0&platform=web`
                );

                if (response.data.code === 0 && response.data.data.medias) {
                    allVideos.push(...response.data.data.medias);
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            return {
                title: info.title,
                videos: allVideos.map(media => ({
                    title: media.title,
                    bvid: media.bvid
                }))
            };
        } catch (error) {
            throw new Error('获取收藏夹信息失败: ' + error.message);
        }
    }

    _findCollectedFavInfo(data, targetFid) {
        if (!data || !data.list) return null;
        return data.list.find(item => item.id.toString() === targetFid);
    }
}

export default BilibiliAPI;
