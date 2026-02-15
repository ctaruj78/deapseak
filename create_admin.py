#!/usr/bin/env python3
import pymongo
import bcrypt
import json
from datetime import datetime

# З'єднання з MongoDB
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["deapseak"]

# Перевірити чи існує адмін
admin_exists = db.users.find_one({"$or": [
    {"email": "info@festlift.pt"},
    {"username": "admin"}
]})

if not admin_exists:
    # Створити хеш пароля
    password = "admin123"
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    # Створити адмін користувача
    admin_user = {
        "username": "admin",
        "email": "info@festlift.pt",
        "password": hashed.decode('utf-8'),
        "role": "admin", 
        "fullName": "Системний Адміністратор",
        "createdAt": datetime.now(),
        "isActive": True
    }
    
    result = db.users.insert_one(admin_user)
    print(f"✅ Створено адмін користувача: {result.inserted_id}")
else:
    print("ℹ️ Адмін користувач уже існує")

# Перевірити загальну кількість користувачів
users_count = db.users.count_documents({})
print(f"📊 Всього користувачів у системі: {users_count}")

client.close()