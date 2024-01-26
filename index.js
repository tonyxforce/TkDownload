var axios = require("axios");
var prompt = require("prompt-sync")();
try{
var db = require("./db.json");
}catch{
require("./tkatalogus_targyak.js")
}
var levenshtein = require('fast-levenshtein');
var fs = require("fs");
require('console-png').attachTo(console);
const resizeImg = require('resize-image-buffer');
const Jimp= require("jimp");
var path = require("path");
const express = require("express");
var http = require("https")
var src = "";
var app = express();

//app.set(express.static("./public"));
app.get("/", (req, res)=>{
res.send(fs.readFileSync("./index.html").toString().replace("%s", src))
});


(async()=>{
var parser = await import("node-html-parser");

var targy = prompt("tantargy nev?: ") || ""
var osztaly = prompt("évfolyam?: ")*1 || ""

if(!targy) return console.log("gec")

//console.log(targy, osztaly)

var { targyak } = db;
var targyakArr = Object.keys(targyak)

//targyakArr.push("nyelvtan")

var extendedTargyakArr = targyakArr;
extendedTargyakArr.push("nyelvtan");
extendedTargyakArr.push("matek");


function getNearest(haystack, needle, returnAll = false){
    //console.log(needle)
    needle = needle.toLowerCase();
    haystack.sort((a, b)=>{
        return levenshtein.get(a.toLowerCase(), needle) - levenshtein.get(b.toLowerCase(), needle)
    });

    return returnAll ? haystack : haystack[0];
}


var foundTargy = getNearest(extendedTargyakArr, targy);


foundTargy = foundTargy
.replace("irodalom", "magyar nyelv és irodalom")
.replace("nyelvtan", "magyar nyelv és irodalom")
.replace("matek", "matematika")

//console.log(foundTargy)

var iskolaTipus = "";
var osztalyID = db.osztalyok[osztaly + ". évfolyam"] || ""; // TODO
var tantargyID = db.targyak[foundTargy]; //TODO
var termekID = ""; //  TODO
var natID = "Nat 2020";
var url = `https://www.tankonyvkatalogus.hu/site/kiadvanyok?SearchForm[schoolType]=${iskolaTipus}&SearchForm[schoolYear]=${osztalyID}&SearchForm[schoolSubject]=${tantargyID}&SearchForm[author]=&SearchForm[productId]=${termekID}&SearchForm[title]=&SearchForm[nat]=${natID}&yt0=`

var encodedURI = encodeURI(url)
var res = "";

var cacheName = `cache/${iskolaTipus}${osztalyID}${tantargyID}${termekID}`

if(fs.existsSync(cacheName)){
    console.log("getting from cache...")
    res = fs.readFileSync(cacheName);
}else{
    res = await axios.get(encodedURI);
    res = res.data
}

fs.writeFileSync(cacheName, res)


var root = parser.parse(res)

var tkImgs = root.querySelectorAll("a div.column div.card div.card-header img.thumbnail")

var konyvek = {};
var nevek = [];
var IDk = [];

tkImgs.forEach((e, i)=>{

let foundTermekID = e._rawAttrs.src.split("/images/cover/")[1].split(".jpg")[0]
let tkName = e._rawAttrs.alt.split(" boritó kép")[0];
    nevek.push(tkName);
    IDk.push(foundTermekID);
    konyvek[foundTermekID] = tkName;

})

foundTargy = getNearest(extendedTargyakArr, targy);
foundTargy = foundTargy
.replace("nyelvtan", "magyar nyelv")

nevek.reverse();

var selected = "";
var fontosTKk;

function printTKk(clear = true, count = 4, options = false){
    fontosTKk = getNearest(nevek, foundTargy, 1)
    .slice(0, count);


    if(clear)
        console.clear();

    if(options)
        console.log(`Írhatsz "m"-et több könyv
megjelenítéséhez, vagy "p"-t a borító
megtekintéséhez`)

    fontosTKk.forEach((e,i)=>{
        let foundTermekID = IDk[i];
        let tkName = konyvek[foundTermekID];
        console.log(`${i}) [${foundTermekID}] ${tkName}`);
    })
}

var shownCount = 4;
var afterShow = false;

printTKk(undefined, undefined, true);
while(selected === ""){

//    printTKk(false);
    var kiadvanyID = prompt("Melyik legyen?" + (afterShow ? "(s a könyvek megjelenítéséhez)" : "") + "[0]: ") || "";
    afterShow = false;
    selected = kiadvanyID
    kiadvanyID = kiadvanyID * 1 || 0

    if(kiadvanyID < 0 || kiadvanyID > (fontosTKk.length - 1)){
        selected = "";
        console.log("nem jo gec")
    }else
    if(selected == "p"){
        selected = "";
        printTKk(true, shownCount, false);
        var peekID = prompt("melyiket szerretnéd megnézni?: ")

	const response = await cacheManage("https://www.tankonyvkatalogus.hu/images/cover/%s.jpg", IDk[peekID], "cache", { responseType: 'arraybuffer'})
//        const response = await axios.get("https://www.tankonyvkatalogus.hu/images/cover/" + IDk[peekID] + ".jpg",  { responseType: 'arraybuffer' })
        var buffer = Buffer.from(response.data, "binary");

        const image2 = await resizeImg(buffer, {
            width: process.stdout.columns,
        });
        var filename = "cache/img"

        fs.writeFileSync(filename + ".jpg", image2)
        var image = await readSync(filename + ".jpg");
        await image.writeAsync(filename + ".png")
        console.clear()
        buffer = fs.readFileSync(filename + ".png")
        console.png(buffer);
        afterShow = true;
	await delay(1000);
        fs.unlinkSync(filename + ".jpg");
        fs.unlinkSync(filename + ".png")
    } else if (selected == "m") {
        selected = "";
        shownCount += 4
        printTKk(true, shownCount, true);
    } else if (selected == "s") {
        selected = "";
        printTKk(true, shownCount, true);
    } else {
        selected = "a";
    }
}; //end while


console.log(IDk[kiadvanyID])
if(fs.existsSync("out.pdf")){
    fs.unlinkSync("out.pdf");
}

src = "https://www.tankonyvkatalogus.hu/pdf/" + IDk[kiadvanyID]  + "__teljes.pdf"

app.listen(3000, ()=>{
var url = 'http://localhost:3000/';
var start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
require('child_process').exec(start + ' ' + url);
})

//process.exit();
})(); //end async

function readSync(path){
    return new Promise((res, rej)=>{
        Jimp.read(path, (err, data)=>{
	    if(err) rej(err);
	    res(data);
        })
    })
}

async function get(url, args, tries = 0){
tries++;
console.log(tries)
try{
return await axios.get(url, args)
}catch{
await delay(1500);
return await get(url, args, tries)
}
}
async function cacheManage(url, replace, folder, extraArgs){
    var file = `${folder}/${replace}`
    if(fs.existsSync(file)){
	console.log("getting from cache...");
        return {data: fs.readFileSync(file)};
    }
    url = url.replace("%s", replace);
    var res = await get(url, extraArgs);
    fs.writeFileSync(file, res.data)
    return res
}


function delay(t){
return new Promise(r=>setTimeout(r,t));
}
