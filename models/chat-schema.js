const mongoose = require('mongoose');

/**
 * Схема повідомлень чату
 */
const chatMessageSchema = new mongoose.Schema({
    // Текст повідомлення
    text: {
        type: String,
        required: function() {
            return !this.attachments || this.attachments.length === 0;
        },
        maxlength: 2000,
        trim: true
    },
    
    // Відправник повідомлення
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Отримувач (для приватних повідомлень)
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            return this.type === 'direct';
        }
    },
    
    // ID чату/каналу
    chatId: {
        type: String,
        required: true,
        index: true
    },
    
    // Тип повідомлення
    type: {
        type: String,
        enum: ['direct', 'channel', 'system'],
        required: true,
        default: 'direct'
    },
    
    // Прикріплені файли
    attachments: [{
        name: String,
        url: String,
        type: String, // image, document, video, audio
        size: Number,
        mimeType: String
    }],
    
    // Час відправлення
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    // Редагування повідомлення
    edited: {
        type: Boolean,
        default: false
    },
    
    editedAt: {
        type: Date
    },
    
    // Видалення повідомлення
    deleted: {
        type: Boolean,
        default: false
    },
    
    deletedAt: {
        type: Date
    },
    
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Список користувачів, які прочитали повідомлення
    readBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Реакції на повідомлення
    reactions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        emoji: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Відповідь на інше повідомлення
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatMessage'
    },
    
    // Пересланое повідомлення
    forwarded: {
        type: Boolean,
        default: false
    },
    
    forwardedFrom: {
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatMessage'
        },
        chatId: String,
        originalSender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    
    // Пріоритет повідомлення
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    
    // Системні дані
    systemData: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true,
    collection: 'chat_messages'
});

/**
 * Схема каналів чату
 */
const chatChannelSchema = new mongoose.Schema({
    // Назва каналу
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
        unique: true
    },
    
    // Опис каналу
    description: {
        type: String,
        maxlength: 200,
        trim: true
    },
    
    // Тип каналу
    type: {
        type: String,
        enum: ['public', 'private', 'direct'],
        required: true,
        default: 'public'
    },
    
    // Учасники каналу
    members: [{
        type: String // role або userId
    }],
    
    // Адміністратори каналу
    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // Створювач каналу
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Дата створення
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    // Остання активність
    lastActivity: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    // Останнє повідомлення
    lastMessage: {
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatMessage'
        },
        text: String,
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        timestamp: Date
    },
    
    // Налаштування каналу
    settings: {
        // Дозволити всім писати
        allowAllToWrite: {
            type: Boolean,
            default: true
        },
        
        // Дозволити прикріплення файлів
        allowAttachments: {
            type: Boolean,
            default: true
        },
        
        // Автоматичне видалення старих повідомлень (дні)
        autoDeleteDays: {
            type: Number,
            default: 0 // 0 = не видаляти
        },
        
        // Сповіщення для всіх учасників
        notificationsEnabled: {
            type: Boolean,
            default: true
        }
    },
    
    // Іконка каналу
    icon: {
        type: String
    },
    
    // Колір каналу
    color: {
        type: String,
        default: '#007bff'
    },
    
    // Архівований канал
    archived: {
        type: Boolean,
        default: false
    },
    
    archivedAt: {
        type: Date
    },
    
    archivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    collection: 'chat_channels'
});

/**
 * Схема статусу набору тексту
 */
const typingStatusSchema = new mongoose.Schema({
    // Користувач, який набирає
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // ID чату
    chatId: {
        type: String,
        required: true
    },
    
    // Тип чату
    type: {
        type: String,
        enum: ['direct', 'channel'],
        required: true
    },
    
    // Час початку набору
    startedAt: {
        type: Date,
        default: Date.now,
        expires: 10 // автоматичне видалення через 10 секунд
    }
}, {
    collection: 'typing_status'
});

/**
 * Схема онлайн статусу користувачів
 */
const userOnlineStatusSchema = new mongoose.Schema({
    // Користувач
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    
    // Статус
    status: {
        type: String,
        enum: ['online', 'away', 'busy', 'offline'],
        default: 'offline'
    },
    
    // Останнє з'єднання
    lastSeen: {
        type: Date,
        default: Date.now
    },
    
    // Поточна активність
    currentActivity: {
        type: String,
        maxlength: 100
    },
    
    // ID сесії WebSocket
    socketId: {
        type: String
    },
    
    // Пристрій
    device: {
        type: String,
        enum: ['web', 'mobile', 'desktop', 'tablet'],
        default: 'web'
    },
    
    // Браузер/додаток
    userAgent: {
        type: String
    }
}, {
    timestamps: true,
    collection: 'user_online_status'
});

/**
 * Схема налаштувань чату користувача
 */
const userChatSettingsSchema = new mongoose.Schema({
    // Користувач
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    
    // Налаштування сповіщень
    notifications: {
        // Увімкнути звукові сповіщення
        sound: {
            type: Boolean,
            default: true
        },
        
        // Показувати сповіщення робочого стола
        desktop: {
            type: Boolean,
            default: true
        },
        
        // Сповіщення для приватних повідомлень
        directMessages: {
            type: Boolean,
            default: true
        },
        
        // Сповіщення для каналів
        channels: {
            type: Boolean,
            default: true
        },
        
        // Не турбувати (години)
        doNotDisturbFrom: {
            type: String // "22:00"
        },
        
        doNotDisturbTo: {
            type: String // "08:00"
        }
    },
    
    // Налаштування теми
    theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto'
    },
    
    // Розмір шрифту
    fontSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
    },
    
    // Автозавантаження медіа
    autoLoadMedia: {
        images: {
            type: Boolean,
            default: true
        },
        videos: {
            type: Boolean,
            default: false
        },
        documents: {
            type: Boolean,
            default: false
        }
    },
    
    // Улюблені канали
    favoriteChannels: [{
        type: String
    }],
    
    // Приховані чати
    hiddenChats: [{
        chatId: String,
        type: {
            type: String,
            enum: ['direct', 'channel']
        }
    }],
    
    // Останні емоджі
    recentEmojis: [{
        emoji: String,
        count: {
            type: Number,
            default: 1
        },
        lastUsed: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true,
    collection: 'user_chat_settings'
});

// Індекси для оптимізації запитів
chatMessageSchema.index({ chatId: 1, timestamp: -1 });
chatMessageSchema.index({ from: 1, to: 1, timestamp: -1 });
chatMessageSchema.index({ text: 'text' }); // Текстовий пошук
chatMessageSchema.index({ 'readBy.userId': 1 });

chatChannelSchema.index({ members: 1 });
chatChannelSchema.index({ type: 1, archived: 1 });
chatChannelSchema.index({ lastActivity: -1 });

typingStatusSchema.index({ chatId: 1, type: 1 });
userOnlineStatusSchema.index({ status: 1, lastSeen: -1 });

// Створення моделей
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const ChatChannel = mongoose.model('ChatChannel', chatChannelSchema);
const TypingStatus = mongoose.model('TypingStatus', typingStatusSchema);
const UserOnlineStatus = mongoose.model('UserOnlineStatus', userOnlineStatusSchema);
const UserChatSettings = mongoose.model('UserChatSettings', userChatSettingsSchema);

module.exports = {
    ChatMessage,
    ChatChannel,
    TypingStatus,
    UserOnlineStatus,
    UserChatSettings,
    chatMessageSchema,
    chatChannelSchema,
    typingStatusSchema,
    userOnlineStatusSchema,
    userChatSettingsSchema
};