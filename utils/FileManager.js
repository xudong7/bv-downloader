import fs from 'fs';
import path from 'path';

class FileManager {
    constructor(baseDir = '.') {
        this.baseDir = baseDir;
    }

    setBaseDir(dir) {
        this.baseDir = dir;
        return this;
    }

    async ensureDir(dirPath) {
        // 修改为使用 path.resolve 确保路径正确
        const fullPath = path.resolve(this.baseDir, dirPath);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }

    sanitizeFileName(fileName) {
        return fileName
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, ' ')
            .trim();
    }

    createWriteStream(filePath) {
        // 检查是否为绝对路径，如果是则直接使用，否则相对于baseDir解析
        if (path.isAbsolute(filePath)) {
            return fs.createWriteStream(filePath);
        } else {
            return fs.createWriteStream(path.resolve(this.baseDir, filePath));
        }
    }

    fileExists(filePath) {
        // 检查是否为绝对路径，如果是则直接使用，否则相对于baseDir解析
        if (path.isAbsolute(filePath)) {
            return fs.existsSync(filePath);
        } else {
            return fs.existsSync(path.resolve(this.baseDir, filePath));
        }
    }
}

export default FileManager;
