import chalk from 'chalk';
import figlet from 'figlet';
import Table from 'cli-table3';
import ora from 'ora';

class UIManager {
    constructor() {
        this.spinner = null;
    }

    /**
     * 显示应用标题
     */
    showTitle() {
        console.log(
            chalk.cyan(
                figlet.textSync('BV Downloader', {
                    font: 'Standard',
                    horizontalLayout: 'default',
                    verticalLayout: 'default'
                })
            )
        );
        console.log(chalk.yellow('✨ ==== B站视频下载工具 ==== ✨'));
        console.log(chalk.gray('📌 支持单个视频、合集和收藏夹下载\n'));
    }

    /**
     * 显示提示信息
     * @param {string} message 提示信息
     */
    showPrompt(message) {
        return chalk.green('? ') + chalk.bold(message);
    }

    /**
     * 显示成功信息
     * @param {string} message 成功信息
     */
    showSuccess(message) {
        console.log(chalk.green('✅ ') + message);
    }

    /**
     * 显示错误信息
     * @param {string} message 错误信息
     */
    showError(message) {
        console.log(chalk.red('❌ ') + chalk.red(message));
    }

    /**
     * 显示信息
     * @param {string} message 信息
     */
    showInfo(message) {
        console.log(chalk.blue('ℹ️ ') + message);
    }

    /**
     * 显示警告信息
     * @param {string} message 警告信息
     */
    showWarning(message) {
        console.log(chalk.yellow('⚠️ ') + message);
    }

    /**
     * 显示视频信息表格
     * @param {Object} videoInfo 视频信息
     */
    showVideoInfo(videoInfo) {
        const duration = this.formatDuration(videoInfo.duration);
        
        console.log(chalk.bold.cyan('📺 视频信息'));
        console.log(chalk.white.bold('┌───────────────────────────────────────┐'));
        console.log(chalk.white.bold('│ ') + chalk.bold('标题: ') + chalk.white(videoInfo.title));
        console.log(chalk.white.bold('│ ') + chalk.bold('UP主: ') + chalk.yellow(videoInfo.owner.name));
        console.log(chalk.white.bold('│ ') + chalk.bold('时长: ') + chalk.green(duration));
        console.log(chalk.white.bold('│ ') + chalk.bold('播放量: ') + chalk.magenta(videoInfo.stat.view.toLocaleString()));
        console.log(chalk.white.bold('│ ') + chalk.bold('弹幕数: ') + chalk.blue(videoInfo.stat.danmaku.toLocaleString()));
        console.log(chalk.white.bold('│ ') + chalk.bold('发布日期: ') + chalk.gray(new Date(videoInfo.pubdate * 1000).toLocaleDateString()));
        console.log(chalk.white.bold('└───────────────────────────────────────┘'));
    }

    /**
     * 显示合集信息
     * @param {Object} collectionInfo 合集信息
     */
    showCollectionInfo(collectionInfo) {
        const table = new Table({
            head: [chalk.cyan('序号'), chalk.cyan('标题')],
            colWidths: [10, 70]
        });

        collectionInfo.episodes.forEach((episode, index) => {
            table.push([chalk.green(index + 1), episode.title]);
        });

        console.log(chalk.yellow(`\n合集: ${collectionInfo.title}`));
        console.log(chalk.yellow(`共 ${collectionInfo.episodes.length} 个视频`));
        console.log(table.toString());
    }

    /**
     * 显示收藏夹信息
     * @param {Object} favInfo 收藏夹信息
     */
    showFavInfo(favInfo) {
        const table = new Table({
            head: [chalk.cyan('序号'), chalk.cyan('标题')],
            colWidths: [10, 70]
        });

        favInfo.videos.forEach((video, index) => {
            table.push([chalk.green(index + 1), video.title]);
        });

        console.log(chalk.yellow(`\n收藏夹: ${favInfo.title}`));
        console.log(chalk.yellow(`共 ${favInfo.videos.length} 个视频`));
        console.log(table.toString());
    }

    /**
     * 开始加载动画
     * @param {string} text 加载文本
     */
    startSpinner(text) {
        this.spinner = ora(text).start();
    }

    /**
     * 更新加载动画文本
     * @param {string} text 新的加载文本
     */
    updateSpinner(text) {
        if (this.spinner) {
            this.spinner.text = text;
        }
    }

    /**
     * 停止加载动画（成功）
     * @param {string} text 成功文本
     */
    stopSpinnerSuccess(text) {
        if (this.spinner) {
            this.spinner.succeed(text);
            this.spinner = null;
        }
    }

    /**
     * 停止加载动画（失败）
     * @param {string} text 失败文本
     */
    stopSpinnerFail(text) {
        if (this.spinner) {
            this.spinner.fail(text);
            this.spinner = null;
        }
    }

    /**
     * 格式化时长
     * @param {number} seconds 秒数
     * @returns {string} 格式化后的时长
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}小时${minutes}分钟${secs}秒`;
        } else if (minutes > 0) {
            return `${minutes}分钟${secs}秒`;
        } else {
            return `${secs}秒`;
        }
    }

    /**
     * 显示下载选项菜单
     */
    showDownloadOptions() {
        console.log(chalk.cyan('\n📝 请选择下载模式:'));
        console.log(chalk.green('1. 📥') + ' 下载单个视频');
        console.log(chalk.green('2. 📦') + ' 下载整个合集(如果存在)');
    }

    /**
     * 显示设置选项
     */
    showSettings() {
        console.log(chalk.cyan('\n=== 下载设置 ==='));
    }
}

export default UIManager;