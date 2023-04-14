import dotenv from "dotenv";
dotenv.config();


import { Account } from "./database/models/account.js";
import express from "express";
import "./database/index.js";
import { bot } from "./bot.js";

import hbs from "hbs";
import expressHbs from "express-handlebars";

import { City, getCities } from "./database/models/city.js";
import { Product, getProducts } from "./database/models/product.js";
import { Category, getCategories } from "./database/models/category.js";
import { InStockProduct, getInStockProducts } from "./database/models/inStockProduct.js";

import fs from "fs";
import formidable from "formidable";






const app = express();



app.engine("hbs", expressHbs.engine(
    {
        layoutsDir: "./views/layouts", 
        defaultLayout: "layout",
        extname: "hbs"
    }
))
app.set("view engine", "hbs");
hbs.registerPartials("./views/partials");



app.use(express.static("./static"));


app.get("/", (req, res) => {
    let script = fs.readFileSync("./scripts/adminPanelScript.js", {encoding: "utf8"});
    res.render("admin", {
        title: "Candy Shop Admin Panel",
        script: new hbs.SafeString(script.toString())
    });
});


app.post("/admin", express.json(), async (req, res) => {
    if(req.body.login != "admin" || req.body.password != "12345") {
        res.send("Incorrect");
        return;
    }

    let citiesInfoList = [];
    let categoriesInfoList = [];
    let productsInfoList = [];
    let productsInCitiesInfoList = [];
    let productsPriceInfoList = [];
    let kladmansInfoList = [];
    let kladmans = await Account.find( {status: "kladman"} );
    for(const kladman of kladmans) {
        kladmansInfoList.push({
            id: kladman.tgId,
            name: kladman.nickname || "none"
        });
    }


    let cities = await getCities();
    let categories = await getCategories();
    let products = await getProducts();
    let cityIndex = 1;
    if(cities.length != 0) {
        for(const city of cities) {
            categoriesInfoList = [];
            let categoryIndex = 1;


            let cityCategoriesProducts = [];
            let thisCityCategoriesList = city.categories.split("|");
            const isCategoryInCity = (categoryDataToCheck) =>
            {
                // thisCityCategoriesList
                let res = false;
                for(const thisCityCategory of thisCityCategoriesList) {
                    if(thisCityCategory == categoryDataToCheck) {
                        res = true;
                        break;
                    }
                }
                return res;
            }


            for(const category of categories) {
                productsInfoList = [];
                let productIndex = 1;


                let productDatasToAdd = [];
                if(isCategoryInCity(category.data)) {
                    productDatasToAdd = category.products.split("|");
                }
                const isProductInCategory = (productDataToCheck) =>
                {
                    // thisCityCategoriesList
                    let res = false;
                    for(const thisCategoryProduct of productDatasToAdd) {
                        if(thisCategoryProduct == productDataToCheck) {
                            res = true;
                            break;
                        }
                    }
                    return res;
                }

                
                for(const product of products) {
                    productsInfoList.push({
                        name: product.name,
                        data: product.data,
                        price: product.price,
                        i: productIndex
                    });
                    if(isProductInCategory(product.data)) {
                        cityCategoriesProducts.push({
                            name: product.name,
                            data: product.data,
                            price: product.price,
                        });
                        let productsPricesObject = [];
                        let productsPricesArray = product.price.split("|");
                        for(const pPrice of productsPricesArray) {
                            if(pPrice.split("-")[1] != "null") {
                                productsPricesObject.push( {amount:pPrice.split("-")[0], price: pPrice.split("-")[1]} );    
                            }
                        }
                        productsPriceInfoList.push({
                            name: product.name,
                            data: product.data,
                            prices: productsPricesObject
                        });
                    }
                    productIndex++;
                }

                categoriesInfoList.push({
                    name: category.name,
                    data: category.data,
                    products: productsInfoList,
                    i: categoryIndex
                });
                categoryIndex++;
            }

            citiesInfoList.push({
                name: city.name,
                data: city.data,
                categories: categoriesInfoList,
                i: cityIndex
            });
            productsInCitiesInfoList.push({
                name: city.name,
                data: city.data,
                products: cityCategoriesProducts
            });
            cityIndex++;
        }
    }
    else if(categories.length != 0) {
        categoriesInfoList = [];
        let categoryIndex = 1;

        for(const category of categories) {
            productsInfoList = [];
            let productIndex = 1;
            
            for(const product of products) {
                productsInfoList.push({
                    name: product.name,
                    data: product.data,
                    price: product.price,
                    i: productIndex
                });
                productIndex++;
            }

            categoriesInfoList.push({
                name: category.name,
                data: category.data,
                products: productsInfoList,
                i: categoryIndex
            });
            categoryIndex++;
        }
    }
    else if(products.length != 0) {
        productsInfoList = [];
        let productIndex = 1;
        
        for(const product of products) {
            productsInfoList.push({
                name: product.name,
                data: product.data,
                price: product.price,
                i: productIndex
            });
            productIndex++;
        }
    }

    const productsPriceInfoListTemp = productsPriceInfoList;
    productsPriceInfoList = [];

    for(let tempPiceOfProductIndex = 0; tempPiceOfProductIndex < productsInfoList.length; tempPiceOfProductIndex++) {
        productsPriceInfoList.push(productsPriceInfoListTemp[tempPiceOfProductIndex]);
    }

    res.render("adminPanel", {
        title: "Candy Shop Admin Panel",
        citiesLength: citiesInfoList.length,
        cities: citiesInfoList,
        categoriesLength: categoriesInfoList.length,
        categories: categoriesInfoList,
        productsLength: productsInfoList.length,
        products: productsInfoList,
        productsInCities: productsInCitiesInfoList,
        productsPrices: productsPriceInfoList,
        kladmans: kladmansInfoList
    })
});



app.post("/admin/changeCity", express.json(), async (req, res) => {
    console.log(req.body);
    let updatedCity;
    try {
        if(req.body.categories.length == 0) {
            updatedCity = await City.updateOne({data: req.body.data}, {$set: { name: req.body.name }});
        }
        else {
            updatedCity = await City.updateOne({data: req.body.data}, {$set: { name: req.body.name, categories: req.body.categories.join("|") }});
        }
        console.log(updatedCity);
    }
    catch(err) {
        console.log(err.messsage);
    }

    res.sendStatus(200);
});

app.post("/admin/addCity", express.json(), async (req, res) => {
    console.log(req.body);

    try {
        if(req.body.categories.length != 0 && req.body.name != "") {
            let newCity = await City.create({
                name: req.body.name,
                data: req.body.data,
                categories: req.body.categories.join("|")
            });
        }
    }
    catch(err) {
        console.log(err.messsage);
    }

    res.sendStatus(200);
});

app.post("/admin/delCity", express.json(), async (req, res) => {
    console.log(req.body);

    try {
        await City.deleteOne({data: req.body.data});
    }
    catch(err) {
        console.log(err.messsage);
    }

    res.sendStatus(200);
});




app.post("/admin/changeCategory", express.json(), async (req, res) => {
    console.log(req.body);
    try {
        await Category.updateOne({data: req.body.data}, {$set: { name: req.body.name, products: req.body.products }});
    }
    catch(err) {
        console.log(err.messsage);
    }

    res.sendStatus(200);
});

app.post("/admin/addCategory", express.json(), async (req, res) => {
    console.log(req.body);

    try {
        if(req.body.products.length != 0 && req.body.name != "") {
            let newCategory = await Category.create({
                name: req.body.name,
                data: req.body.data,
                products: req.body.products.join("|")
            });
        }
    }
    catch(err) {
        console.log(err.messsage);
    }

    res.sendStatus(200);
});

app.post("/admin/delCategory", express.json(), async (req, res) => {
    console.log(req.body);

    try {
        await Category.deleteOne({data: req.body.data});
    }
    catch(err) {
        console.log(err.messsage);
    }

    res.sendStatus(200);
});




app.post("/admin/changeProduct", express.json(), async (req, res) => {
    console.log(req.body);
    try {
        await Product.updateOne({data: req.body.data}, {$set: { name: req.body.name, price: req.body.price }});
    }
    catch(err) {
        console.log(err.messsage);
    }

    res.sendStatus(200);
});

app.post("/admin/addProduct", express.json(), async (req, res) => {
    console.log(req.body);

    try {
        if(req.body.price != 0 && req.body.name != "") {
            let newProduct = await Product.create({
                name: req.body.name,
                data: req.body.data,
                price: req.body.price
            });
        }
    }
    catch(err) {
        console.log(err.messsage);
    }

    res.sendStatus(200);
});

app.post("/admin/delProduct", express.json(), async (req, res) => {
    console.log(req.body);

    try {
        await Product.deleteOne({data: req.body.data});
    }
    catch(err) {
        console.log(err.messsage);
    }

    res.sendStatus(200);
});




app.post("/admin/uploads", async (req, res) => {
    new formidable.IncomingForm({
        multiples: true,
        uploadDir: "./uploads"
    }).parse(req, async (err, fields, files) => {

        const productData = fields["product"+fields.place];
        
        const newInStockProduct = await InStockProduct.create({
            data: fields["product"+fields.place],
            amount: fields["amount"+productData],
            kladmanId: +fields.kladmans,
            city: fields.place,
            additionalInfo: fields.additionalDescription
        });
        const treasureDirName = newInStockProduct._id.toString();
        
        if (!fs.existsSync(`./photos`)) {
            fs.mkdirSync(`./photos`);
        }
        if (!fs.existsSync(`./photos/${fields.place}`)) {
            fs.mkdirSync(`./photos/${fields.place}`);
        }

        if(files.treasurePhotos.length === undefined) {
            if(files.treasurePhotos.size != 0) {
                if (!fs.existsSync(`./photos/${fields.place}/${treasureDirName}`)) {
                    fs.mkdirSync(`./photos/${fields.place}/${treasureDirName}`);
                }
                fs.readdir("./uploads", (err, photos) => {
                    for(const photoName of photos) {
                        console.log(photoName);
                        if(photoName == files.treasurePhotos.newFilename) {
                            const photo = fs.readFileSync(`./uploads/${photoName}`);
                            fs.writeFileSync(`./photos/${fields.place}/${treasureDirName}/${treasureDirName}1.png`, photo);
                            fs.unlink(`./uploads/${photoName}`, (err) => {
                                if(err) console.log(err);
                            });
                        }
                    }
                });
                const tgAccs = await Account.find({});
                const city = await City.findOne({data: fields.place});
                const product = await Product.findOne({data: fields["product"+fields.place]});
                for(const tgAcc of tgAccs) {
                    try {
                        await bot.sendMessage(tgAcc.tgId, `Новый товар в городе ${city.name}:\nНазвание: ${product.name}\nКол-во: ${fields["amount"+productData]} г`);
                    }
                    catch(err) {
                        console.log(err.messsage);
                    }
                }
            }
            else {
                fs.readdir("./uploads", (err, photos) => {
                    for(const photoName of photos) {
                        if(photoName == files.treasurePhotos.newFilename) {
                            fs.unlink(`./uploads/${photoName}`, (err) => {
                                if(err) console.log(err);
                            });
                        }
                    }
                });
                await InStockProduct.deleteOne({data: fields["product"+fields.place]});
            }
        }
        else {
            if(!fs.existsSync(`./photos/${fields.place}/${treasureDirName}`)) {
                fs.mkdirSync(`./photos/${fields.place}/${treasureDirName}`);
            }
            let photoNumber = 1;
            for(const treasurePhoto of files.treasurePhotos) {
                const photo = fs.readFileSync(`./uploads/${treasurePhoto.newFilename}`);
                fs.writeFileSync(`./photos/${fields.place}/${treasureDirName}/${treasureDirName}${photoNumber}.png`, photo);
                fs.unlink(`./uploads/${treasurePhoto.newFilename}`, (err) => {
                    if(err) console.log(err);
                });
                
                photoNumber++;
            }
            const tgAccs = await Account.find({});
            const city = await City.findOne({data: fields.place});
            const product = await Product.findOne({data: fields["product"+fields.place]});
            for(const tgAcc of tgAccs) {
                try {
                    await bot.sendMessage(tgAcc.tgId, `Новый товар в городе ${city.name}:\nНазвание: ${product.name}\nКол-во: ${fields["amount"+productData]} г`);
                }
                catch(err) {
                    console.log(err.messsage);
                }
            }
        }
        // res.sendStatus(200);

        res.redirect("/");
    });
});


app.listen(8080, (err) => {
    if(err) console.log(err.messsage);
    else console.log("Server started! On port: 8181");
});

