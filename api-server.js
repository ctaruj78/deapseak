
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3001;

app.use(express.json());

// Читання даних ліфтів
app.get("/api/lifts", (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, "data", "lifts.json"), "utf8");
        res.json(JSON.parse(data));
    } catch (error) {
        console.error("Помилка читання даних:", error);
        res.status(500).json({ error: "Не вдалося завантажити дані" });
    }
});

// Збереження даних ліфтів
app.post("/api/lifts", (req, res) => {
    try {
        const lifts = req.body;
        fs.writeFileSync(path.join(__dirname, "data", "lifts.json"), JSON.stringify(lifts, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error("Помилка збереження даних:", error);
        res.status(500).json({ error: "Не вдалося зберегти дані" });
    }
});

app.listen(PORT, () => {
    console.log(`API сервер запущено на http://localhost:${PORT}`);
});
