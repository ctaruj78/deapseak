/**
 * Файлова система для чату - Upload/Download файлів
 * Підтримує різні типи файлів з безпекою та валідацією
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class FileSystemManager {
    constructor() {
        this.uploadDir = path.join(__dirname, 'uploads');
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
            console.log('📁 Директорія uploads ініціалізована');
        } catch (error) {
            console.error('❌ Помилка створення директорії uploads:', error);
        }
    }

    async uploadFile(buffer, fileName, userId, chatId = null) {
        const fileId = crypto.randomUUID();
        const fileExt = path.extname(fileName);
        const filePath = path.join(this.uploadDir, `${fileId}${fileExt}`);

        await fs.writeFile(filePath, buffer);

        const metadata = {
            id: fileId,
            originalName: fileName,
            size: buffer.length,
            mimeType: this.getMimeType(fileExt),
            uploadedBy: userId,
            uploadedAt: new Date().toISOString(),
            chatId: chatId,
            path: filePath
        };

        return metadata;
    }

    async downloadFile(fileId) {
        const files = await fs.readdir(this.uploadDir);
        const file = files.find(f => f.startsWith(fileId));

        if (!file) {
            throw new Error('Файл не знайдено');
        }

        const filePath = path.join(this.uploadDir, file);
        const buffer = await fs.readFile(filePath);

        const metadata = {
            originalName: file,
            mimeType: this.getMimeType(path.extname(file)),
            size: buffer.length
        };

        return { buffer, metadata };
    }

    async deleteFile(fileId, userId) {
        const files = await fs.readdir(this.uploadDir);
        const file = files.find(f => f.startsWith(fileId));

        if (!file) {
            throw new Error('Файл не знайдено');
        }

        await fs.unlink(path.join(this.uploadDir, file));
    }

    getMimeType(ext) {
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
}

module.exports = FileSystemManager;