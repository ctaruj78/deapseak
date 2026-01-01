const { AppError } = require('../middleware/errorHandler');

/**
 * Надіслати email (поки що лог, потім додамо nodemailer)
 */
exports.sendEmail = async (req, res, next) => {
    try {
        const { to, subject, html } = req.body;

        // Валідація
        if (!to || !subject || !html) {
            throw new AppError('Не вказано обов\'язкові поля: to, subject, html', 400);
        }

        // Валідація email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            throw new AppError('Невірний формат email', 400);
        }

        console.log('📧 =============== EMAIL SENDING REQUEST ===============');
        console.log('📬 To:', to);
        console.log('📋 Subject:', subject);
        console.log('📄 HTML length:', html.length, 'chars');
        console.log('🕐 Timestamp:', new Date().toISOString());
        console.log('👤 Requested by:', req.user?.email || 'unknown');
        console.log('======================================================');

        // TODO: Інтеграція з nodemailer
        // Поки що логуємо email (для тестування без налаштованого SMTP)
        // 
        // const nodemailer = require('nodemailer');
        // const transporter = nodemailer.createTransport({
        //     host: process.env.SMTP_HOST,
        //     port: process.env.SMTP_PORT,
        //     secure: true,
        //     auth: {
        //         user: process.env.SMTP_USER,
        //         pass: process.env.SMTP_PASS
        //     }
        // });
        // 
        // await transporter.sendMail({
        //     from: process.env.SMTP_FROM || 'noreply@festlift.pt',
        //     to: to,
        //     subject: subject,
        //     html: html
        // });

        // Симулюємо успішну відправку
        res.json({
            success: true,
            message: 'Email успішно надіслано',
            data: {
                to,
                subject,
                sentAt: new Date().toISOString()
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Надіслати тимчасовий пароль користувачу
 */
exports.sendPasswordEmail = async (req, res, next) => {
    try {
        const { email, password, appUrl } = req.body;

        if (!email || !password) {
            throw new AppError('Не вказано email або пароль', 400);
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                    .credentials { background: white; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0; }
                    .password { font-size: 24px; font-weight: bold; color: #007bff; letter-spacing: 2px; }
                    .button { display: inline-block; padding: 15px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; color: #6c757d; font-size: 12px; margin-top: 30px; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔑 Ласкаво просимо до LiftMaster Pro!</h1>
                        <p>Система управління ліфтами від FestLift</p>
                    </div>
                    <div class="content">
                        <h2>Вітаємо!</h2>
                        <p>Для вас створено обліковий запис в системі <strong>LiftMaster Pro</strong>.</p>
                        
                        <div class="credentials">
                            <h3>📧 Ваші дані для входу:</h3>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Тимчасовий пароль:</strong></p>
                            <p class="password">${password}</p>
                        </div>
                        
                        <div class="warning">
                            <strong>⚠️ ВАЖЛИВО:</strong> Після першого входу обов'язково змініть пароль на власний!
                        </div>
                        
                        <h3>📝 Інструкція для входу:</h3>
                        <ol>
                            <li>Перейдіть за посиланням нижче</li>
                            <li>Введіть ваш email: <strong>${email}</strong></li>
                            <li>Введіть тимчасовий пароль (скопіюйте вище)</li>
                            <li>Після входу перейдіть в налаштування та змініть пароль</li>
                        </ol>
                        
                        <div style="text-align: center;">
                            <a href="${appUrl || 'https://liftmaster.festlift.pt/pages/auth/login.html'}" class="button">🚀 Увійти до системи</a>
                        </div>
                        
                        <div class="footer">
                            <p>📞 Технічна підтримка: <strong>+351 961 777 666</strong></p>
                            <p>📧 Email: <a href="mailto:suporte@festlift.pt">suporte@festlift.pt</a></p>
                            <p>&copy; 2024-2026 FestLift Portugal. Внутрішня розробка для клієнтів.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Використати загальний метод надсилання
        req.body = {
            to: email,
            subject: 'Ваш доступ до LiftMaster Pro - Тимчасовий пароль',
            html: html
        };

        return exports.sendEmail(req, res, next);

    } catch (error) {
        next(error);
    }
};
