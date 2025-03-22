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
        const fullPath = path.join(this.baseDir, dirPath);
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
        return fs.createWriteStream(path.join(this.baseDir, fileName));
    }
}

export default FileManager;
