// Оновлення статусу заявки
app.put("/api/assignments/:id/status", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const { status, notes } = req.body;
        
        // Валідація статусів
        const validStatuses = ['new', 'assigned', 'in-progress', 'completed', 'cancelled', 'on-hold'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Невалідний статус"
            });
        }
        
        // Отримання поточної заявки для перевірки прав
        const assignment = await db.get('SELECT * FROM assignments WHERE id = ?', [req.params.id]);
        
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Заявку не знайдено"
            });
        }
        
        // Оновлення статусу
        await db.run(
            'UPDATE assignments SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, notes || assignment.notes, req.params.id]
        );
        
        res.json({
            success: true,
            message: "Статус заявки оновлено"
        });
    } catch (error) {
        console.error('Помилка оновлення статусу:', error);
        res.status(500).json({
            success: false,
            message: "Помилка сервера"
        });
    }
});
