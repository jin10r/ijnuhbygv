import asyncio
import logging
import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Bot token from environment
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
WEB_APP_URL = os.getenv('WEB_APP_URL', 'https://your-app-domain.com')

if not BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN environment variable is required")

# Initialize bot and dispatcher
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def start_command(message: types.Message):
    """Handle /start command"""
    user = message.from_user
    
    # Create Web App button
    web_app = WebAppInfo(url=WEB_APP_URL)
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🏠 Открыть приложение",
                    web_app=web_app
                )
            ],
            [
                InlineKeyboardButton(
                    text="ℹ️ О приложении",
                    callback_data="about"
                )
            ]
        ]
    )
    
    welcome_text = f"""
🏠 <b>Добро пожаловать в поиск соседей по квартире!</b>

Привет, {user.first_name}! 👋

Наше приложение поможет вам:
• 🗺️ Найти квартиры в вашем районе
• 👥 Познакомиться с потенциальными соседами
• 💕 Найти совпадения по интересам и бюджету
• ❤️ Сохранить понравившиеся объявления

<b>Как это работает:</b>
1. Создайте профиль с вашими предпочтениями
2. Ищите квартиры на карте в нужном районе
3. Знакомьтесь с другими арендаторами
4. Обменивайтесь контактами при взаимных лайках

Нажмите кнопку ниже, чтобы начать! 👇
    """
    
    await message.answer(
        welcome_text,
        reply_markup=keyboard,
        parse_mode="HTML"
    )

@dp.callback_query(lambda c: c.data == "about")
async def about_callback(callback_query: types.CallbackQuery):
    """Handle about button"""
    about_text = """
<b>📱 О приложении "Поиск соседей"</b>

<b>🎯 Цель:</b>
Помочь людям найти квартиру и надежных соседей в Москве

<b>✨ Основные функции:</b>
• Интерактивная карта с объявлениями
• Система лайков и матчинга
• Фильтрация по бюджету и локации
• Безопасное знакомство через Telegram

<b>🔒 Безопасность:</b>
• Контакты открываются только при взаимных лайках
• Все данные защищены
• Модерация профилей

<b>🆓 Полностью бесплатно!</b>

Удачи в поиске идеального жилья! 🏠
    """
    
    # Return to main menu button
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🏠 Открыть приложение",
                    web_app=WebAppInfo(url=WEB_APP_URL)
                )
            ],
            [
                InlineKeyboardButton(
                    text="◀️ Назад",
                    callback_data="back_to_start"
                )
            ]
        ]
    )
    
    await callback_query.message.edit_text(
        about_text,
        reply_markup=keyboard,
        parse_mode="HTML"
    )

@dp.callback_query(lambda c: c.data == "back_to_start")
async def back_to_start_callback(callback_query: types.CallbackQuery):
    """Handle back to start button"""
    user = callback_query.from_user
    
    web_app = WebAppInfo(url=WEB_APP_URL)
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🏠 Открыть приложение",
                    web_app=web_app
                )
            ],
            [
                InlineKeyboardButton(
                    text="ℹ️ О приложении",
                    callback_data="about"
                )
            ]
        ]
    )
    
    welcome_text = f"""
🏠 <b>Добро пожаловать в поиск соседей по квартире!</b>

Привет, {user.first_name}! 👋

Наше приложение поможет вам:
• 🗺️ Найти квартиры в вашем районе
• 👥 Познакомиться с потенциальными соседями
• 💕 Найти совпадения по интересам и бюджету
• ❤️ Сохранить понравившиеся объявления

<b>Как это работает:</b>
1. Создайте профиль с вашими предпочтениями
2. Ищите квартиры на карте в нужном районе
3. Знакомьтесь с другими арендаторами
4. Обменивайтесь контактами при взаимных лайках

Нажмите кнопку ниже, чтобы начать! 👇
    """
    
    await callback_query.message.edit_text(
        welcome_text,
        reply_markup=keyboard,
        parse_mode="HTML"
    )

@dp.message()
async def handle_other_messages(message: types.Message):
    """Handle any other messages"""
    web_app = WebAppInfo(url=WEB_APP_URL)
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🏠 Открыть приложение",
                    web_app=web_app
                )
            ]
        ]
    )
    
    await message.answer(
        "Для использования всех функций откройте Web App 👆",
        reply_markup=keyboard
    )

async def main():
    """Main function to run the bot"""
    logger.info("Starting Telegram Bot...")
    
    try:
        # Start polling
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"Error in bot: {e}")
    finally:
        await bot.session.close()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")