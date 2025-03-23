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

    createWriteStream(fileName) {
        // 修改为使用 path.resolve 确保路径正确
        return fs.createWriteStream(path.resolve(this.baseDir, fileName));
    }

    fileExists(filePath) {
        return fs.existsSync(path.resolve(this.baseDir, filePath));
    }
}

export default FileManager;
