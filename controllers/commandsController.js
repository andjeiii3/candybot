import { Account, isNewUser } from "../database/models/account.js";
import { textController } from "./textController.js";
import { City } from "../database/models/city.js";
import { Product } from "../database/models/product.js";
import { Category } from "../database/models/category.js";




let commandsController = {};





commandsController.start = async (msg, bot) => {
    const chatId = msg.chat.id;
    console.log(msg);

    try {
        const isNew = await isNewUser(chatId);
        if(isNew) {
            await Account.create({
                tgId: chatId,
                status: "default",
                isWaitForPay: "false",
                balance: 0
            });
        }

        await bot.sendMessage(chatId, `👋Добро пожаловать ${msg.chat.username}, в магазин CandyShop™🔥\n\n`+
            `💊 У нас вы сможете безопасно и быстро приобрести качественный европейский стафф\n\n`+
            `💰 Приглашаем к нам на работу\n`+
            `☝️ Быстро растущая компания\n`+
            `🤑 Доход от 10 000$\n`+
            `💸 Стабильная ЗП\n`+
            `👍 Премии + бонусы\n\n`+
            `☁️ Готовые мастер клады\n\n`+
            `🙃 За деталями переходить по кнопке Работа/Заработок 🙃\n\n`+
            `💎ПРИЯТНЫХ ПОКУПОК💎`, {
            reply_markup: {
                resize_keyboard: true,
                keyboard: [
                    [ {text: "💎Меню"} ]
                ]
            }
        })

        textController.menu(msg, bot);
    }
    catch(err) {
        console.log(err.message);
    }
}





commandsController.sendRegRequest = async (msg, bot) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "NoName";
    const userUsername = msg.from.username || "NoUsername";

    const accounts = await Account.find({});

    for(const acc of accounts) {
        if(acc.status == "admin") {
            bot.sendMessage(acc.tgId, `Запрос на регистрацию закладчиком:\n\nId: ${chatId}\nИмя: ${userName}\nUsername: ${userUsername}`, {
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [ {text: "Подтвердить", callback_data: `newRegRequest|${chatId}|${userUsername}|true`} ],
                        [ {text: "Отказать", callback_data: `newRegRequest|${chatId}|${userUsername}|false`} ]
                    ]
                })
            });
        }
    }
}




export { commandsController };