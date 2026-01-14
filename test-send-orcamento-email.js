const mongoose = require('mongoose');

(async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/deapseak');
        console.log('✅ MongoDB підключено');
        
        const Orcamento = mongoose.model('Orcamento', new mongoose.Schema({}, { strict: false }));
        const orcamento = await Orcamento.findOne().sort({ createdAt: -1 });
        
        if (!orcamento) {
            console.log('❌ Орçаменто не знайдено');
            process.exit(1);
        }
        
        console.log('📧 Знайдено орçаменто:', orcamento.numero);
        console.log('   ID:', orcamento._id);
        console.log('   Cliente:', orcamento.cliente?.nome);
        
        // Потрібен справжній JWT токен
        console.log('\n⚠️  Для тесту потрібен справжній JWT токен з localStorage');
        console.log('   Відкрийте браузер, увійдіть в систему, та спробуйте відправити email з інтерфейсу');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Помилка:', error.message);
        process.exit(1);
    }
})();
