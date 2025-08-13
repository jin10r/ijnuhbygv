# 🚀 Быстрая настройка социальной сети

## 📋 Предварительные требования

- Docker и Docker Compose
- ngrok (для публичного доступа)
- Telegram Bot Token
- Yandex Maps API Key (опционально)

## ⚡ Быстрый старт

### 1. Настройка конфигурации

```bash
# Скопируйте шаблон конфигурации
cp .env.template .env

# Отредактируйте файл .env
nano .env
```

### 2. Заполните .env файл

Замените все `your_*_here` на реальные значения:

```env
# TELEGRAM BOT
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_WEBAPP_URL=https://abc123.ngrok-free.app

# BACKEND API  
REACT_APP_BACKEND_URL=https://abc123.ngrok-free.app
REACT_APP_PRODUCTION_URL=https://abc123.ngrok-free.app

# JWT SECURITY
JWT_SECRET_KEY=your_super_secret_jwt_key_here

# YANDEX MAPS (опционально)
YANDEX_MAPS_API_KEY=your_yandex_api_key_here
```

### 3. Запуск ngrok

```bash
# В отдельном терминале запустите ngrok
ngrok http 80
```

Скопируйте URL из ngrok (например: `https://abc123.ngrok-free.app`) и замените `your-ngrok-url` во всех местах в `.env` файле.

### 4. Запуск приложения

```bash
# Сделайте скрипт исполняемым
chmod +x run.sh

# Запустите приложение
./run.sh
```

## 🔧 Управление

### Остановка сервисов
```bash
docker-compose down
```

### Просмотр логов
```bash
docker-compose logs -f
```

### Пересборка контейнеров
```bash
docker-compose up --build -d
```

## 📱 Доступ к приложению

После успешного запуска:

- **Локально**: http://localhost
- **Через ngrok**: https://your-ngrok-url.ngrok-free.app  
- **Telegram WebApp**: https://your-ngrok-url.ngrok-free.app/webapp

## 🐛 Решение проблем

### Ошибка "Network Error" в профиле

1. Убедитесь, что ngrok запущен
2. Проверьте, что URL в `.env` соответствует ngrok URL
3. Пересоберите контейнеры: `docker-compose up --build -d`

### Контейнеры не запускаются

1. Проверьте логи: `docker-compose logs`
2. Убедитесь, что все порты свободны
3. Перезапустите Docker

### Telegram Bot не отвечает

1. Проверьте правильность TELEGRAM_BOT_TOKEN
2. Убедитесь, что TELEGRAM_WEBAPP_URL указывает на ngrok URL
3. Проверьте настройки webhook в Telegram

## 📁 Структура проекта

```
soc_net/
├── .env                 # Конфигурация (создается из .env.template)
├── .env.template        # Шаблон конфигурации
├── run.sh              # Простой скрипт запуска
├── docker-compose.yml  # Конфигурация Docker
├── backend/            # Backend API (FastAPI)
├── frontend/           # Frontend (React)
└── docker/            # Docker конфигурации
```
