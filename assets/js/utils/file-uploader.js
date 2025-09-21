class FileUploader {
    constructor() {
        this.queues = new Map();
        this.activeUploads = new Map();
        this.init();
    }

    async init() {
        this.setupDragAndDrop();
        this.initChunkingSystem();
        this.setupProgressTracking();
        this.initFileValidation();
        this.setupErrorHandling();
    }

    async uploadFile(file, options = {}) {
        try {
            this.validateFile(file, options);
            
            const uploadId = this.generateUploadId(file);
            this.initializeUpload(uploadId, file, options);

            if (options.chunked && file.size > options.chunkSize) {
                return await this.uploadChunked(file, uploadId, options);
            } else {
                return await this.uploadSingle(file, uploadId, options);
            }

        } catch (error) {
            this.handleUploadError(error, file, options);
            throw error;
        }
    }

    async uploadChunked(file, uploadId, options) {
        const chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB
        const totalChunks = Math.ceil(file.size / chunkSize);
        const chunks = [];

        for (let i = 0; i < totalChunks; i++) {
            const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
            chunks.push(this.uploadChunk(chunk, i, uploadId, options));
        }

        const results = await Promise.allSettled(chunks);
        return await this.finalizeChunkedUpload(results, uploadId, options);
    }

    async uploadChunk(chunk, index, uploadId, options) {
        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('chunkIndex', index);
        formData.append('uploadId', uploadId);
        formData.append('totalChunks', options.totalChunks);

        const response = await fetch(options.url, {
            method: 'POST',
            body: formData,
            headers: options.headers,
            onUploadProgress: (progress) => {
                this.updateChunkProgress(uploadId, index, progress);
            }
        });

        if (!response.ok) {
            throw new Error(`Chunk upload failed: ${response.statusText}`);
        }

        return await response.json();
    }

    // Advanced features
    async resumeUpload(uploadId) {
        const state = await this.getUploadState(uploadId);
        if (!state) {
            throw new Error('Upload state not found');
        }

        const remainingChunks = state.chunks.filter(chunk => !chunk.completed);
        return await this.uploadChunks(remainingChunks, uploadId, state.options);
    }

    async pauseUpload(uploadId) {
        this.activeUploads.get(uploadId)?.abort();
        this.activeUploads.delete(uploadId);
        
        const state = this.getCurrentState(uploadId);
        await this.saveUploadState(uploadId, state);
        
        return state;
    }

    setupParallelUploads(maxParallel = 3) {
        this.parallelQueue = new ParallelQueue(maxParallel);
        this.parallelUploads = new Set();
    }

    async addToParallelQueue(file, options) {
        return this.parallelQueue.add(() => this.uploadFile(file, options));
    }

    // File processing
    async processFile(file, processors, options = {}) {
        let processedFile = file;
        
        for (const processor of processors) {
            processedFile = await processor(processedFile, options);
            
            if (options.onProgress) {
                options.onProgress({
                    stage: processor.name,
                    progress: 100,
                    file: processedFile
                });
            }
        }

        return processedFile;
    }

    async createFilePreview(file, options = {}) {
        const preview = {
            type: this.getPreviewType(file.type),
            url: null,
            dimensions: null,
            metadata: {}
        };

        switch (preview.type) {
            case 'image':
                return await this.createImagePreview(file, options);
            case 'video':
                return await this.createVideoPreview(file, options);
            case 'document':
                return await this.createDocumentPreview(file, options);
            case 'audio':
                return await this.createAudioPreview(file, options);
            default:
                return preview;
        }
    }

    async createImagePreview(file, options) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate dimensions
                const maxSize = options.maxSize || 300;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve({
                        type: 'image',
                        url: URL.createObjectURL(blob),
                        dimensions: { width, height },
                        originalSize: file.size,
                        previewSize: blob.size
                    });
                }, 'image/jpeg', 0.8);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    // Security features
    setupSecurity() {
        this.security = {
            virusScan: true,
            malwareCheck: true,
            contentValidation: true,
            sizeLimits: true
        };

        this.initVirusScanner();
        this.setupContentAnalysis();
    }

    async scanForViruses(file) {
        if (!this.security.virusScan) return { clean: true };

        // This would integrate with a virus scanning service
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    clean: Math.random() > 0.01, // 99% chance of being clean
                    threats: [],
                    scannedAt: new Date().toISOString()
                });
            }, 1000);
        });
    }

    async validateContent(file, rules) {
        const violations = [];
        
        // File type validation
        if (rules.allowedTypes && !rules.allowedTypes.includes(file.type)) {
            violations.push('FILE_TYPE_NOT_ALLOWED');
        }

        // File size validation
        if (rules.maxSize && file.size > rules.maxSize) {
            violations.push('FILE_SIZE_EXCEEDED');
        }

        // Content validation
        if (rules.contentRules) {
            const contentIssues = await this.checkContentRules(file, rules.contentRules);
            violations.push(...contentIssues);
        }

        return violations;
    }

    // Progress tracking
    setupProgressTracking() {
        this.progressCallbacks = new Map();
        this.uploadStates = new Map();
    }

    updateProgress(uploadId, progress, data = {}) {
        const callback = this.progressCallbacks.get(uploadId);
        if (callback) {
            callback({
                uploadId,
                progress,
                loaded: data.loaded,
                total: data.total,
                speed: this.calculateSpeed(uploadId, data),
                estimated: this.calculateETA(uploadId, data)
            });
        }

        this.updateUploadState(uploadId, { progress, ...data });
    }

    calculateSpeed(uploadId, data) {
        const state = this.uploadStates.get(uploadId);
        if (!state || !state.startTime) return 0;

        const elapsed = (Date.now() - state.startTime) / 1000; // seconds
        return data.loaded / elapsed; // bytes per second
    }

    // Error handling and retry
    setupErrorHandling() {
        this.retryConfig = {
            maxRetries: 3,
            retryDelay: 1000,
            backoffFactor: 2
        };

        this.errorCallbacks = new Map();
    }

    async withRetry(operation, config = {}) {
        const maxRetries = config.maxRetries || this.retryConfig.maxRetries;
        const retryDelay = config.retryDelay || this.retryConfig.retryDelay;
        const backoffFactor = config.backoffFactor || this.retryConfig.backoffFactor;

        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) break;
                
                const delay = retryDelay * Math.pow(backoffFactor, attempt - 1);
                await this.delay(delay);
            }
        }

        throw lastError;
    }

    // Utility methods
    generateUploadId(file) {
        return `${file.name}_${file.size}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    validateFile(file, options) {
        if (options.maxSize && file.size > options.maxSize) {
            throw new Error(`File size exceeds limit: ${file.size} > ${options.maxSize}`);
        }

        if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
            throw new Error(`File type not allowed: ${file.type}`);
        }

        if (options.requiredProperties) {
            for (const [prop, validator] of Object.entries(options.requiredProperties)) {
                if (!validator(file[prop])) {
                    throw new Error(`File property validation failed: ${prop}`);
                }
            }
        }
    }

    getPreviewType(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
        return 'other';
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}