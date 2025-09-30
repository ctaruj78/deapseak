

const express = require("express");
const { connectDB, getDB } = require("./db");

const app = express();
const PORT = 3001;

app.use(express.json());


// Читання даних ліфтів з MongoDB
app.get("/api/lifts", async (req, res) => {
    try {
        await connectDB();
        const db = getDB();
        const lifts = await db.collection("lifts").find({}).toArray();
        res.json(lifts);
    } catch (error) {
        console.error("Помилка читання даних з MongoDB:", error);
        res.status(500).json({ error: "Не вдалося завантажити дані" });
    }
});

// Додавання/оновлення ліфта
app.post("/api/lifts", async (req, res) => {
    try {
        await connectDB();
        const db = getDB();
        const lift = req.body;
        if (lift._id) {
            // Оновлення
            const { _id, ...update } = lift;
            await db.collection("lifts").updateOne({ _id }, { $set: update });
            res.json({ success: true, updated: true });
        } else {
            // Додавання
            const result = await db.collection("lifts").insertOne(lift);
            res.json({ success: true, id: result.insertedId });
        }
    } catch (error) {
        console.error("Помилка збереження даних у MongoDB:", error);
        res.status(500).json({ error: "Не вдалося зберегти дані" });
    }
});

app.listen(PORT, () => {
    console.log(`API сервер запущено на http://localhost:${PORT}`);
});
