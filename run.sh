#!/bin/bash

# ===========================================
# ПРОСТОЙ ЗАПУСК СОЦИАЛЬНОЙ СЕТИ
# ===========================================

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}ЗАПУСК СОЦИАЛЬНОЙ СЕТИ${NC}"
echo -e "${GREEN}============================================${NC}"

# Проверка .env файла
if [ ! -f .env ]; then
    echo -e "${RED}Ошибка: Файл .env не найден!${NC}"
    echo -e "${YELLOW}Скопируйте .env.template в .env и заполните все поля:${NC}"
    echo "cp .env.template .env"
    echo "nano .env"
    exit 1
fi

# Проверка REACT_APP_BACKEND_URL
source .env
if [ -z "$REACT_APP_BACKEND_URL" ] || [ "$REACT_APP_BACKEND_URL" = "https://your-ngrok-url.ngrok-free.app" ]; then
    echo -e "${RED}Ошибка: REACT_APP_BACKEND_URL не настроен!${NC}"
    echo -e "${YELLOW}Запустите ngrok и обновите .env файл:${NC}"
    echo "1. ngrok http 80"
    echo "2. Скопируйте URL из ngrok"
    echo "3. Замените 'your-ngrok-url' в .env файле"
    exit 1
fi

echo -e "${GREEN}✓ Конфигурация найдена${NC}"
echo -e "${GREEN}✓ Backend URL: $REACT_APP_BACKEND_URL${NC}"

# Остановка старых контейнеров
echo -e "${YELLOW}Остановка старых контейнеров...${NC}"
docker-compose down 2>/dev/null || true

# Запуск сервисов
echo -e "${GREEN}Запуск сервисов...${NC}"
docker-compose up --build -d

# Ожидание запуска MongoDB
echo -e "${YELLOW}Ожидание готовности MongoDB...${NC}"
for i in {1..30}; do
  if docker-compose exec mongodb mongo --eval "db.stats()" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ MongoDB готова${NC}"
    break
  fi
  echo -e "${YELLOW}Подождите... Попытка $i/30${NC}"
  sleep 2
done

# Генерация тестовых данных
echo -e "${YELLOW}Генерация тестовых данных (1000 пользователей + 1000 объявлений)...${NC}"
# Удаляем существующие данные и создаем новые
docker-compose exec -T backend python generate_test_data.py --force || echo -e "${RED}❌ Ошибка при генерации тестовых данных${NC}"

# Проверка статуса
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}СТАТУС СЕРВИСОВ${NC}"
echo -e "${GREEN}============================================${NC}"
docker-compose ps

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}ГОТОВО!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Приложение доступно по адресу:${NC}"
echo -e "${GREEN}🌐 Локально: http://localhost${NC}"
echo -e "${GREEN}🌐 Через ngrok: $REACT_APP_BACKEND_URL${NC}"
echo -e "${GREEN}📱 Telegram WebApp: $REACT_APP_BACKEND_URL/webapp${NC}"
echo -e "${GREEN}============================================${NC}"
