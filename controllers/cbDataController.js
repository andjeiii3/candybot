import { Account, isNewUser } from "../database/models/account.js";
import { City, getCities } from "../database/models/city.js";
import { menu_keyboard } from "./textController.js";
import { Product } from "../database/models/product.js";
import { Category, getCategoryProducts } from "../database/models/category.js";
import { InStockProduct, getInStockProducts } from "../database/models/inStockProduct.js";

import fs from "fs";



let cbDataController = {};




cbDataController.returnToMenu = async (msg, bot, action) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    const menuKeyboard = menu_keyboard();

    await bot.editMessageText((await menuKeyboard).menu_text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            resize_keyboard: true,
            inline_keyboard: (await menuKeyboard).inline_keyboard
        }
    });
}





cbDataController.profile = async (msg, bot) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    try {
        let acc = await Account.findOne({tgId: chatId});

        const accInfo = `👤 Ваш профиль:\n\n` +
        `💰 Баланс: ${Math.round(acc.balance)} руб\n`;

        await bot.editMessageText(accInfo, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [ { text: "◀Назад", callback_data: "return|returnToMenu" } ]
                ],
            }
        });
    }
    catch(err) {
        console.log(err.message);
    }
}





cbDataController.purchase_history = async (msg, bot) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    await bot.editMessageText("История покупок ещё не добавлена!", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [
                [ { text: "◀Назад", callback_data: "return|returnToMenu" } ]
            ],
        }
    });
}





cbDataController.top_up_balance = async (msg, bot) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    await bot.editMessageText("Введите сумму пополнения от 6000 руб:", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [
                [ { text: "Отмена", callback_data: "paymentCancel|"+chatId } ]
            ]
        }
    });
}




cbDataController.newReqRequest = async (msg, bot, action) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    console.log(action);
    const answer = action[2];
    const userName = action[1];
    const userId = action[0];

    if(answer == "true") {
        await Account.updateOne({tgId: userId}, {$set: { status: "kladman", nickname: userName}} );
        bot.editMessageText("Юсер под id " + userId + " был успешно зарегестрирован!", {
            chat_id: chatId,
            message_id: messageId
        });
        bot.sendMessage(userId, "Вы были зарегестрированы как закладчик!");
    }
    else {
        bot.editMessageText("Юсер под id " + userId + " не был зарегестрирован!", {
            chat_id: chatId,
            message_id: messageId
        });
        bot.sendMessage(userId, "Вам было отказано в регистрации!");
    }
}









cbDataController.city = async (msg, bot, action) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    if(action.length > 1) {
        cbDataController.category(msg, bot, action);
        return;
    }

    const cities = await getCities();
    const cityData = action[0];

    for(const city of cities) {
        if(city.data == cityData) {
            let ikeyboard = [];


            for(let category of city.categories.split("|")) {
                let categoryInfo;
                try {
                    categoryInfo = await Category.findOne({data: category});
                }
                catch(err) {
                    console.log(err.message);
                }
                
                if(categoryInfo != undefined) {
                    ikeyboard.push([{ text: categoryInfo.name, callback_data: `city|${cityData}|${categoryInfo.data}` }]);
                }
            }

            ikeyboard.push([ { text: "◀Назад", callback_data: "return|returnToMenu" } ]);

            await bot.editMessageText(`${city.name}\n`, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: ikeyboard
                }
            });

            break;
        }
    }
}





cbDataController.category = async (msg, bot, action) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    if(action.length > 2) {
        cbDataController.product(msg, bot, action);
        return;
    }

    const cityData = action[0];
    const categoryData = action[1];
    const products = await getCategoryProducts(categoryData);
    let cityName;
    let categoryName;
    try {
        cityName = await City.findOne({data:cityData});
        categoryName = await Category.findOne({data:categoryData});
    }
    catch {
        cityName = "-";
        categoryName = "-";
    }
    
    let ikeyboard = [];


    for(const product of products) {
        let productInfo;

        try {
            productInfo = await Product.findOne( {data: product} );
        }
        catch(err) {
            console.log(err.message);
        }

        if(productInfo != undefined) {
            ikeyboard.push([{ text: productInfo.name, callback_data: `city|${cityData}|${categoryData}|${productInfo.data}` }]);
        }
    }


    ikeyboard.push([ { text: "◀Назад", callback_data: "return|"+`city|${cityData}` } ]);

    await bot.editMessageText(`${cityName.name}\n${categoryName.name}:`, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: ikeyboard
        }
    });
}





cbDataController.product = async (msg, bot, action) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    if(action.length > 3) {
        cbDataController.buy(msg, bot, action);
        return;
    }


    const cityData = action[0];
    const categoryData = action[1];
    const productData = action[2];


    let ikeyboard = [];
    let aboutProductMessageText;


    let productInfo;
    const productPrices = {};
    try {
        productInfo = await Product.findOne({data: productData});
        
        for(const prodP of productInfo.price.split("|")) {
            if(prodP.split("-")[1] == "null") continue;
            // productPrices.push(prodP.split("-")[0]+" г - " + (prodP.split("-")[1] * 110 / 100));
            productPrices[prodP.split("-")[0]] = prodP.split("-")[1] * 109.5 / 100;
        }
        console.log(productPrices);
        // aboutProductMessageText = `Название:\n${productInfo.name}\n\nЦена:\n${productPrices.join(" руб\n")} руб`;
        aboutProductMessageText = `${productInfo.name}`;
    }
    catch(err) {
        console.log(err.message);
    }

    const thisInStockProducts = await InStockProduct.find({data: productData, city: cityData});

    const thisInStockProductAmounts = [];

    if(thisInStockProducts.length != 0) {
        for(const thisInStockProduct of thisInStockProducts) {
            const thisInStockProductAmount = thisInStockProduct.amount;
            let isInAmounts = false;
            for(const ispa of thisInStockProductAmounts) {
                if(ispa == thisInStockProductAmount) {
                    isInAmounts = true;
                    break;
                }
            }
            if(!isInAmounts) {
                ikeyboard.push([ { text: thisInStockProductAmount+"г - "+productPrices[thisInStockProductAmount]+" руб", callback_data: "city|"+action.join("|")+"|buy|"+thisInStockProductAmount } ]);
                thisInStockProductAmounts.push(thisInStockProductAmount);
            }
        }
    }
    else {
        ikeyboard.push([ {text: "Сейчас нет в наличии!", callback_data: "-"} ]);
    }

    ikeyboard.push([ { text: "◀Назад", callback_data: "return|"+`city|${cityData}|${categoryData}` } ]);


    await bot.editMessageText(aboutProductMessageText, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: ikeyboard
        }
    });
}





cbDataController.buy = async (msg, bot, action) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    console.log(action);

    try {
        let city = await City.findOne({data: action[0]});
        let product = await Product.findOne({data: action[2]});

        let amount = +action[action.length-1];
        

        let user = await Account.findOne({tgId: chatId});
        
        
        const productPrices = {};
        for(const prodP of product.price.split("|")) {
            productPrices[prodP.split("-")[0]] = prodP.split("-")[1];
        }
        function getTwoRandNumbers() {
            return (Math.floor(Math.random() * 99))/100;
        }
        let productPrice = +productPrices[amount.toString()];
        productPrice = productPrice * 109.5 / 100 + getTwoRandNumbers();

        let isSuccessfully = false;
        let newBalance;
        if(user.balance >= productPrice) {
            newBalance = user.balance - productPrice;
            isSuccessfully = true;
        }
        let ikeyboard = [];
        
        let orderInfoMessage = "-";
        try{
            if(isSuccessfully) {
                let treasure;
                let treasures = await getInStockProducts();

                for(const tr of treasures) {
                    if(tr.amount == amount && tr.data == product.data && tr.city == city.data) {
                        treasure = tr;
                        break;
                    } 
                }
                if(treasure !== undefined) {
                    const treasureDirFiles = fs.readdirSync(`./photos/${treasure.city}/${treasure._id.toString()}`, { withFileTypes: true });

                    if(treasureDirFiles.length > 0) {
                        for(const treasureDirFile of treasureDirFiles) {
                            const treasureDirPhoto = fs.readFileSync(`./photos/${treasure.city}/${treasure._id.toString()}/${treasureDirFile.name}`);
                            await bot.sendPhoto(chatId, treasureDirPhoto);
                        }
                        let deletedInStock = await InStockProduct.deleteOne({_id: treasure._id});
                        await Account.updateOne({tgId: chatId}, {$set: { balance: Math.round(newBalance) }});
                        orderInfoMessage = `Ваш заказ:\n\n`+
                        `Город: ${city.name}\n`+
                        `Товар: ${product.name}\n`+
                        `Количество: ${amount}г\n`+
                        `Цена: ${productPrice} руб\n\n`+
                        `Вы успешно приобрели даный товар, остаток на вашем счёте - ${Math.round(newBalance)} руб`;
                        fs.rmSync(`./photos/${treasure.city}/${treasure._id.toString()}/`, { recursive: true, force: true });
                        await bot.sendMessage(chatId, `Доп. информация про ваш заказ: ${treasure.additionalInfo}`);
                        // await bot.sendMessage(treasure.kladmanId, "Один из ваших кладов был приобретён!");
                    }
                }
                else {
                    orderInfoMessage = `Ваш заказ:\n\n`+
                    `Город: ${city.name}\n`+
                    `Товар: ${product.name}\n`+
                    `Количество: ${amount}г\n`+
                    `Цена: ${productPrice} руб\n\n`+
                    `Такого товара нету в наличии!`;
                }
            }
            else {
                orderInfoMessage = `Ваш заказ:\n\n`+
                `Город: ${city.name}\n`+
                `Товар: ${product.name}\n`+
                `Количество: ${amount}г\n`+
                `Цена: ${productPrice} руб\n\n`+
                `На вашем счету не хватило денег, баланс - ${Math.round(user.balance)} руб`;
                
                // const botMsg = await bot.sendMessage(chatId, `➡️Заявка на оплату.\nПереведите на банковскую  карту ${productPrice} рублей удобным для вас способом. \nВажно пополнить ровную сумму.\n`+
                // `Номер карты - 2200700763972634\n‼️ у вас есть 30 мин на оплату, после чего платёж не будет зачислен\n‼️ перевёл неточную сумму - оплатил чужой заказ`, {
                //     reply_markup: JSON.stringify({
                //         inline_keyboard: [
                //             [ {text: "Оплатил", callback_data: "checkForProdPay|"+chatId+"|"+productPrice+"|"+action[0]+"|"+action[2]+"|"+action[4]} ]
                //         ]
                //     })
                // });
                let cardNumber = fs.readFileSync("./cardNumber.txt");
                cardNumber = cardNumber.toString();
                const botMsg = await bot.sendMessage(chatId, `✅ Заявка принята на оплату.\n\nПереведите на банковскую  карту ${productPrice} рублей удобным для вас способом\n\n❗️ Важно пополнить ровную сумму ❗️\n`+
                `\n${cardNumber}\n\n❗️ У вас есть 30 мин на оплату, после чего платёж не будет зачислен ❗️\n\n⚠️ Перевёл неточную сумму - оплатил чужой заказ ⚠️`, {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [ {text: "Оплатил", callback_data: "checkForProdPay|"+chatId+"|"+productPrice+"|"+action[0]+"|"+action[2]+"|"+action[4]} ]
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
            }
        }
        catch(err) {
            console.log(err.message);
            orderInfoMessage = `Ваш заказ:\n\n`+
            `Город: ${city.name}\n`+
            `Товар: ${product.name}\n`+
            `Количество: ${amount}г\n`+
            `Цена: ${productPrice} руб\n\n`+
            `Ошибка в обработке заказа. Приносим свои извинения!`;
        }

        
        ikeyboard.push([ { text: "◀В главное меню", callback_data: "return|returnToMenu" } ]);

        await bot.editMessageText(orderInfoMessage, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: ikeyboard
            }
        });
    }
    catch(err) {
        console.log(err.message);
    }
}





cbDataController.return = async (msg, bot, action) => {
    let params = action[0];
    action.splice(0, 1);
    cbDataController[params](msg, bot, action);
}





export { cbDataController };