import dotenv from "dotenv";
dotenv.config();


import TelegramBot from "node-telegram-bot-api";
import { commandsController } from "./controllers/commandsController.js";
import { cbDataController } from "./controllers/cbDataController.js";
import { textController } from "./controllers/textController.js";
import { Account, isNewUser } from "./database/models/account.js";

import { City, getCities } from "./database/models/city.js";
import { Product, getProducts } from "./database/models/product.js";
import { Category, getCategories } from "./database/models/category.js";
import { InStockProduct, getInStockProducts } from "./database/models/inStockProduct.js";

import fs from "fs";





const bot = new TelegramBot(
    process.env.TOKEN,
    { polling: true }
);

const botChecker = new TelegramBot(
    "6224189211:AAGLhHrLe3ncWvL8BCfMi75DSUFW_hv0SZw",
    { polling: true }
);





function getEmojis() {
    return ['😀', '😎', '🤖', '🚀', '🌈', '❤️', '🎉', '🍕', '🔥', '😃', '😊', '🐶', '🐱', '🐼', '🐔', '🐟', '🍔', '🍦', '🍓', '🌻', '🌍', '🎵', '🎮', '🎭', '🏀', '⚽️', '🚲', '✈️', '🚁'];
}
const game = {};
let payments = [];





bot.onText(/\/addCardAdmin (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let query = match[1];
    const admins = await Account.find({status: "admin"});

    for(const admin of admins) {
        if(admin.tgId == chatId) {
            await Account.updateOne({tgId: +query}, {$set: {status: "cardAdmin"}});

        }
    }
});





bot.onText(/\/changeCard (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let query = match[1];
    const admins = await Account.find( {status: "admin"} );
    const cardAdmins = await Account.find({status: "cardAdmin"});
    // console.log(sdfskdjhdsfkj);
    for(const admin of admins) {
        if(admin.tgId == chatId) {
            fs.writeFileSync("./cardNumber.txt", query);
        }
    }
    for(const cardAdmin of cardAdmins) {
        if(cardAdmin.tgId == chatId) {
            fs.writeFileSync("./cardNumber.txt", query);
        }
    }
});





bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    let query = msg.text;

    // const isNew = await isNewUser(chatId);
    // if(isNew) {
    //     commandsController.start(msg, bot);
    // }
    // else {
    if(query[0] == "/") {
        if(query == "/start") {
            let emojis = getEmojis();
            let secretEmojis = [];

            let ikeyboard = [];

            for(let row = 0; row < 3; row++) {
                let ikeyboardRow = [];
                for(let col = 0; col < 3; col++) {
                    const randEmojiIndex = Math.floor(Math.random() * (emojis.length-1));
                    ikeyboardRow.push({text: emojis[randEmojiIndex], callback_data: emojis[randEmojiIndex]});
                    let deletedEmoji = emojis.splice(randEmojiIndex, 1);
                    secretEmojis.push(deletedEmoji);
                    console.log(emojis);
                }
                ikeyboard.push(ikeyboardRow);
            }

            const secretEmoji = secretEmojis[Math.floor(Math.random() * (secretEmojis.length-1))];
            game[chatId] = { secretEmoji: secretEmoji };
            bot.sendMessage(chatId, `Загадано эмодзи: ${secretEmoji}\nВыберите правильное эмодзи:`, {
                reply_markup: {
                    inline_keyboard: ikeyboard
                }
            });
        }
        else if(query == "/reg") {
            commandsController.sendRegRequest(msg, bot)
        }
    }
    else {
        if(query == "💎Меню") {
            textController.menu(msg, bot);
            return;
        }

        let isUserPay = false;
        function isNumber(num) {
            let res = +num;

            if(!isNaN(res)) {
                return true;
            }
            else {
                return false;
            }
        }
        function getTwoRandNumbers() {
            return (Math.floor(Math.random() * 99))/100;
        }
        for(const paymentIndex in payments) {
            if(payments[paymentIndex].id == chatId && payments[paymentIndex].sum === undefined) {
                if(isNumber(query)) {
                    query = (+query) + getTwoRandNumbers();
                    if(query >= 6000) {
                        let cardNumber = fs.readFileSync("./cardNumber.txt");
                        cardNumber = cardNumber.toString();
                        const botMsg = await bot.sendMessage(chatId, `✅ Заявка принята на оплату.\n\nПереведите на банковскую  карту ${query} рублей удобным для вас способом\n\n❗️ Важно пополнить ровную сумму ❗️\n`+
                        `\n${cardNumber}\n\n❗️ У вас есть 30 мин на оплату, после чего платёж не будет зачислен ❗️\n\n⚠️ Перевёл неточную сумму - оплатил чужой заказ ⚠️`, {
                            reply_markup: JSON.stringify({
                                inline_keyboard: [
                                    [ {text: "Оплатил", callback_data: "checkUserPayment|"+chatId+"|"+query} ]
                                ]
                            })
                        });
                        bot.sendMessage(chatId, `❗️ ВЫДАННЫЕ РЕКВИЗИТЫ ДЕЙСТВУЮТ 30 МИНУТ\n`+
                        `❗️ ПЕРЕВОДИТЕ ТОЧНУЮ СУММУ. НЕВЕРНАЯ СУММА НЕ БУДЕТ ЗАЧИСЛЕНА\n`+
                        `❗️ ОПЛАТА ДОЛЖНА ПРОХОДИТЬ ОДНИМ ПЛАТЕЖОМ\n`+
                        `❗️ ПРОБЛЕМЫ С ОПЛАТОЙ? ПЕРЕЙДИТЕ ПО ССЫЛКЕ : Payment(http://t.me/Polligato)\n`+
                        `Предоставить чек об оплате и ID: ${chatId}\n`+
                        `❗️ С ПРОБЛЕМНОЙ ЗАЯВКОЙ ОБРАЩАЙТЕСЬ НЕ ПОЗДНЕЕ 24 ЧАСОВ С МОМЕНТА ОПЛАТЫ`);
                        async function cancelMsg() {
                            await Account.updateOne( {tgId: chatId}, {$set: {isWaitForPay: "false"}} );
                            bot.editMessageText("Оплата не была проведена вовремя!", {
                                chat_id: chatId,
                                message_id: botMsg.message_id
                            });
                        }
                        setTimeout(cancelMsg, 1800000);
                        payments.splice(paymentIndex, 1);
                    }
                    else {
                        bot.sendMessage(chatId, "Вы ввели не правильную сумму!\nПопробуйте ещё раз");
                    }
                }
                else {
                    bot.sendMessage(chatId, "Вы ввели не правильную сумму!\nПопробуйте ещё раз");
                }
                break;
                
            }
        }
    }
    // }
    
});




bot.on("callback_query", async (callbackQuery) => {
    let action = callbackQuery.data;
    const msg = callbackQuery.message;

    const chatId = msg.chat.id;
    const query = msg.text;

    const chosenEmoji = action.toString();
    console.log(chosenEmoji);
    let secretEmoji = game[chatId];
    if(secretEmoji !== undefined) secretEmoji = secretEmoji.secretEmoji.toString();
    else secretEmoji = "";
    console.log(secretEmoji);
    


    if(action == "profile") {
        cbDataController.profile(msg, bot);
    }
    else if(action == "purchase_history") {
        cbDataController.purchase_history(msg, bot);
    }
    else if(action == "top_up_balance") {
        payments.push({id: chatId, sum: undefined});

        cbDataController.top_up_balance(msg, bot);
    }
    else {
        action = action.split("|");
        let command = action.splice(0, 1);
        if(command == "return") {
            cbDataController.return(msg, bot, action, botChecker);
        }
        else if(command == "city") {
            cbDataController.city(msg, bot, action, botChecker);
        }
        else if(command == "newRegRequest") {
            cbDataController.newReqRequest(msg, bot, action);
        }
        else if(command == "paymentCancel") {
            let userPaymentIndex;
            for(const paymentIndex in payments) {
                if(payments[paymentIndex].id == chatId) {
                    userPaymentIndex = paymentIndex;
                    break;
                }
            }
            if(userPaymentIndex !== undefined) {
                payments.splice(userPaymentIndex, 1);
                bot.sendMessage(chatId, "Пополнение отменено!");
            }
        }
        else if(command == "checkUserPayment") {
            console.log(msg);
            const accounts = await Account.find({status: "admin"});
            await Account.updateOne({tgId: chatId}, {$set: {isWaitForPay: "true"}});
            for(const acc of accounts) {
                try {
                    botChecker.sendMessage(acc.tgId, `Юсер под id ${action[0]} проводит оплату на ${action[1]} руб`, {
                        reply_markup: JSON.stringify({
                            inline_keyboard: [
                                [ {text: "Принять оплату", callback_data: "userPay|true|"+action[0]+"|"+action[1]} ],
                                [ {text: "Отменить оплату", callback_data: "userPay|false|"+action[0]+"|"+action[1]} ]
                            ]
                        })
                    });
                }
                catch(err) {
                    console.log(err.message);
                }
            }
            bot.editMessageText("Оплата на "+action[1], {
                chat_id: chatId,
                message_id: msg.message_id
            });
        }
        else if(command == "checkForProdPay") {
            console.log(msg);
            const accounts = await Account.find({status: "admin"});
            await Account.updateOne({tgId: chatId}, {$set: {isWaitForPay: "true"}});
            for(const acc of accounts) {
                try {
                    botChecker.sendMessage(acc.tgId, `Юсер под id ${action[0]} хочет приобрести ${action[3]} ${action[4]} г на сумму ${action[1]} руб`, {
                        reply_markup: JSON.stringify({
                            inline_keyboard: [
                                [ {text: "Принять оплату", callback_data: "forProdPay|true|"+action[0]+"|"+action[1]+"|"+action[2]+"|"+action[3]+"|"+action[4]} ],
                                [ {text: "Отменить оплату", callback_data: "forProdPay|false|"+action[0]+"|"+action[1]+"|"+action[2]+"|"+action[3]+"|"+action[4]} ]
                            ]
                        })
                    });
                    
                }
                catch(err) {
                    console.log(err.message);
                }
            }
            
            // bot.editMessageText(`➡️ ПРОБЛЕМЫ С ОПЛАТОЙ? ПЕРЕЙДИТЕ ПО ССЫЛКЕ : Payment (http://t.me/Polligato)\n`+
            // `Предоставить чек об оплате и\n`+
            // `ID:  22216454\n`+
            // `➡️С ПРОБЛЕМНОЙ ЗАЯВКОЙ ОБРАЩАЙТЕСЬ НЕ ПОЗДНЕЕ 24 ЧАСОВ С МОМЕНТА ОПЛАТЫ.`, {
            //     chat_id: chatId,
            //     message_id: msg.message_id
            // });
        }
        else {
            if (chosenEmoji === secretEmoji) {
                commandsController.start(msg, bot);
            } else {
                await bot.sendMessage(chatId, 'Неправильно! Попробуйте еще раз.');
            }
        }
    }
});





botChecker.on("callback_query", async (callbackQuery) => {
    let action = callbackQuery.data;
    const msg = callbackQuery.message;

    const chatId = msg.chat.id;
    const query = msg.text;

    action = action.split("|");
    let command = action.splice(0, 1);

    if(command == "userPay") {
        const userId = action[1];
        const nowUserAccount = await Account.findOne({tgId: userId});
        if(nowUserAccount.isWaitForPay == "true") {
            if(action[0] == "true") {
                    await Account.updateOne({tgId: userId}, {$set: { balance: nowUserAccount.balance + (+action[2]), isWaitForPay: "false" }});
                    // botChecker.sendMessage(chatId, "Вы приняли платёж пользователя под id " + action[1]);
                    botChecker.editMessageText("Вы приняли платёж пользователя под id " + action[1], {
                        chat_id: chatId,
                        message_id: msg.message_id
                    });
                    bot.sendMessage(userId, "Ваш платёж был принят, проверьте баланс в профиле!");
            }
            else {
                await Account.updateOne({tgId: userId}, {$set: { isWaitForPay: "false" }});
                botChecker.editMessageText("Вы отклонили платёж пользователя под id " + action[1], {
                    chat_id: chatId,
                    message_id: msg.message_id
                });
                bot.sendMessage(userId, "Ваш платёж был отклонён!");
            }
        }
        else {
            botChecker.sendMessage(chatId, "Уже не актуально");
        }
    }
    else if(command == "forProdPay") {
        const userId = action[1];
        const price = action[2];
        const cityData = action[3];
        const productData = action[4];
        const amount = action[5];

        const nowUserAccount = await Account.findOne({tgId: userId});
        if(nowUserAccount.isWaitForPay == "true") {
            if(action[0] == "true") {
                let city = await City.findOne({data: cityData});
                let product = await Product.findOne({data: productData});
        
                let treasure;
                let treasures = await getInStockProducts();
        
                for(const tr of treasures) {
                    if(tr.amount == amount && tr.data == productData && tr.city == cityData) {
                        treasure = tr;
                        break;
                    } 
                }
                console.log(treasure);
                if(treasure !== undefined) {
                    const treasureDirFiles = fs.readdirSync(`./photos/${treasure.city}/${treasure._id.toString()}`, { withFileTypes: true });
        
                    if(treasureDirFiles.length > 0) {
                        for(const treasureDirFile of treasureDirFiles) {
                            const treasureDirPhoto = fs.readFileSync(`./photos/${treasure.city}/${treasure._id.toString()}/${treasureDirFile.name}`);
                            await bot.sendPhoto(userId, treasureDirPhoto);
                            console.log("Sending photo");
                        }
                        let deletedInStock = await InStockProduct.deleteOne({_id: treasure._id});
                        bot.sendMessage(userId, `Ваш заказ:\n\n`+
                        `Город: ${city.name}\n`+
                        `Товар: ${product.name}\n`+
                        `Количество: ${amount}г\n`+
                        `Цена: ${price} руб\n\n`+
                        `Вы успешно приобрели даный товар!`);
                        fs.rmSync(`./photos/${treasure.city}/${treasure._id.toString()}/`, { recursive: true, force: true });
                        await bot.sendMessage(userId, `Доп. информация про ваш заказ: ${treasure.additionalInfo}`);
                        await Account.updateOne({tgId: userId}, {$set: { isWaitForPay: "false" }});
                        botChecker.editMessageText("Вы приняли платёж пользователя под id " + action[1], {
                            chat_id: chatId,
                            message_id: msg.message_id
                        });
                        // await bot.sendMessage(treasure.kladmanId, "Один из ваших кладов был приобретён!");
                    }
                }
            }
            else {
                await Account.updateOne({tgId: userId}, {$set: { isWaitForPay: "false" }});
                botChecker.editMessageText("Вы отклонили платёж пользователя под id " + action[1], {
                    chat_id: chatId,
                    message_id: msg.message_id
                });
                bot.sendMessage(userId, "Ваш платёж был отклонён!");
            }
        }
        else {
            botChecker.sendMessage(chatId, "Уже не актуально");
        }
        
    }
});





export { bot };
