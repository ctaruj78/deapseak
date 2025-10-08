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
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = {
            images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
            documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
            spreadsheets: ['.xls', '.xlsx', '.csv', '.ods'],
            presentations: ['.ppt', '.pptx', '.odp'],
            archives: ['.zip', '.rar', '.7z', '.tar', '.gz'],
            audio: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
            video: ['.mp4', '.avi', '.mkv', '.mov', '.webm', '.flv']
        };
        
        this.initializeDirectories();
    }

    async initializeDirectories() {
        try {
            // Створити основну папку uploads
            await fs.mkdir(this.uploadDir, { recursive: true });
            
            // Створити підпапки за категоріями
            const categories = ['images', 'documents', 'spreadsheets', 'presentations', 'archives', 'audio', 'video', 'other'];
            
            for (const category of categories) {
                await fs.mkdir(path.join(this.uploadDir, category), { recursive: true });
            }
            
            console.log('📁 Файлові директорії ініціалізовано');
        } catch (error) {
            console.error('❌ Помилка ініціалізації директорій:', error);
        }
    }

    generateFileId() {
        return crypto.randomBytes(16).toString('hex');
    }

    getFileCategory(extension) {
        for (const [category, extensions] of Object.entries(this.allowedTypes)) {
            if (extensions.includes(extension.toLowerCase())) {
                return category;
            }
        }
        return 'other';
    }

    validateFile(file, fileName) {
        const errors = [];
        
        // Перевірка розміру
        if (file.length > this.maxFileSize) {
            errors.push(`Файл занадто великий. Максимум ${this.maxFileSize / 1024 / 1024}MB`);
        }
        
        // Перевірка розширення
        const extension = path.extname(fileName).toLowerCase();
        const allAllowedTypes = Object.values(this.allowedTypes).flat();
        
        if (!allAllowedTypes.includes(extension) && extension !== '') {
            errors.push(`Непідтримуваний тип файлу: ${extension}`);
        }
        
        // Перевірка імені файлу
        if (!fileName || fileName.length > 255) {
            errors.push('Некоректне ім\'я файлу');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    async uploadFile(fileBuffer, originalName, userId, chatId = null) {
        try {
            const validation = this.validateFile(fileBuffer, originalName);
            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }

            const fileId = this.generateFileId();
            const extension = path.extname(originalName);
            const category = this.getFileCategory(extension);
            const fileName = `${fileId}${extension}`;
            const filePath = path.join(this.uploadDir, category, fileName);

            // Зберегти файл
            await fs.writeFile(filePath, fileBuffer);

            // Метадані файлу
            const fileMetadata = {
                fileId,
                originalName,
                fileName,
                category,
                extension,
                size: fileBuffer.length,
                uploadedBy: userId,
                chatId,
                uploadDate: new Date().toISOString(),
                path: filePath,
                url: `/api/files/download/${fileId}`,
                mimeType: this.getMimeType(extension)
            };

            // Зберегти метадані (можна в базу даних)
            await this.saveFileMetadata(fileMetadata);

            console.log(`📎 Файл ${originalName} завантажено як ${fileId}`);
            return fileMetadata;

        } catch (error) {
            console.error('❌ Помилка завантаження файлу:', error);
            throw error;
        }
    }

    async downloadFile(fileId) {
        try {
            const metadata = await this.getFileMetadata(fileId);
            if (!metadata) {
                throw new Error('Файл не знайдено');
            }

            const fileBuffer = await fs.readFile(metadata.path);
            return {
                buffer: fileBuffer,
                metadata
            };

        } catch (error) {
            console.error('❌ Помилка завантаження файлу:', error);
            throw error;
        }
    }

    async deleteFile(fileId, userId) {
        try {
            const metadata = await this.getFileMetadata(fileId);
            if (!metadata) {
                throw new Error('Файл не знайдено');
            }

            // Перевірка прав (тільки власник або адмін може видалити)
            if (metadata.uploadedBy !== userId) {
                // TODO: Перевірити роль користувача
                throw new Error('Недостатньо прав для видалення файлу');
            }

            // Видалити файл
            await fs.unlink(metadata.path);
            
            // Видалити метадані
            await this.deleteFileMetadata(fileId);

            console.log(`🗑️ Файл ${fileId} видалено`);
            return true;

        } catch (error) {
            console.error('❌ Помилка видалення файлу:', error);
            throw error;
        }
    }

    async getFilesByChat(chatId) {
        try {
            // TODO: Отримати з бази даних
            // Поки що заглушка
            return [];
        } catch (error) {
            console.error('❌ Помилка отримання файлів чату:', error);
            throw error;
        }
    }

    async getFilesByUser(userId) {
        try {
            // TODO: Отримати з бази даних
            // Поки що заглушка
            return [];
        } catch (error) {
            console.error('❌ Помилка отримання файлів користувача:', error);
            throw error;
        }
    }

    async saveFileMetadata(metadata) {
        try {
            // Зберегти в JSON файл (можна замінити на MongoDB)
            const metadataPath = path.join(this.uploadDir, 'metadata.json');
            
            let existingData = [];
            try {
                const data = await fs.readFile(metadataPath, 'utf8');
                existingData = JSON.parse(data);
            } catch (error) {
                // Файл не існує, створюємо новий
            }

            existingData.push(metadata);
            await fs.writeFile(metadataPath, JSON.stringify(existingData, null, 2));

        } catch (error) {
            console.error('❌ Помилка збереження метаданих:', error);
            throw error;
        }
    }

    async getFileMetadata(fileId) {
        try {
            const metadataPath = path.join(this.uploadDir, 'metadata.json');
            const data = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(data);
            
            return metadata.find(file => file.fileId === fileId);

        } catch (error) {
            console.error('❌ Помилка отримання метаданих:', error);
            return null;
        }
    }

    async deleteFileMetadata(fileId) {
        try {
            const metadataPath = path.join(this.uploadDir, 'metadata.json');
            const data = await fs.readFile(metadataPath, 'utf8');
            let metadata = JSON.parse(data);
            
            metadata = metadata.filter(file => file.fileId !== fileId);
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

        } catch (error) {
            console.error('❌ Помилка видалення метаданих:', error);
            throw error;
        }
    }

    getMimeType(extension) {
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain',
            '.rtf': 'application/rtf',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.csv': 'text/csv',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.zip': 'application/zip',
            '.rar': 'application/x-rar-compressed',
            '.7z': 'application/x-7z-compressed',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska'
        };

        return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
    }

    async getStorageStats() {
        try {
            const metadataPath = path.join(this.uploadDir, 'metadata.json');
            let metadata = [];
            
            try {
                const data = await fs.readFile(metadataPath, 'utf8');
                metadata = JSON.parse(data);
            } catch (error) {
                // Файл не існує
            }

            const stats = {
                totalFiles: metadata.length,
                totalSize: metadata.reduce((sum, file) => sum + file.size, 0),
                categories: {}
            };

            // Статистика по категоріях
            for (const file of metadata) {
                if (!stats.categories[file.category]) {
                    stats.categories[file.category] = {
                        count: 0,
                        size: 0
                    };
                }
                stats.categories[file.category].count++;
                stats.categories[file.category].size += file.size;
            }

            return stats;

        } catch (error) {
            console.error('❌ Помилка отримання статистики:', error);
            throw error;
        }
    }

    async cleanupOldFiles(daysOld = 30) {
        try {
            const metadataPath = path.join(this.uploadDir, 'metadata.json');
            const data = await fs.readFile(metadataPath, 'utf8');
            let metadata = JSON.parse(data);
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const filesToDelete = metadata.filter(file => 
                new Date(file.uploadDate) < cutoffDate
            );

            let deletedCount = 0;
            for (const file of filesToDelete) {
                try {
                    await fs.unlink(file.path);
                    deletedCount++;
                } catch (error) {
                    console.warn(`⚠️ Не вдалося видалити файл ${file.fileId}`);
                }
            }

            // Оновити метадані
            metadata = metadata.filter(file => 
                new Date(file.uploadDate) >= cutoffDate
            );
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

            console.log(`🧹 Очищено ${deletedCount} старих файлів`);
            return deletedCount;

        } catch (error) {
            console.error('❌ Помилка очищення файлів:', error);
            throw error;
        }
    }
}

module.exports = FileSystemManager;