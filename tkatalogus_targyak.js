(async()=>{
var parser = require("node-html-parser");
var axios = require("axios");

var url = "https://tankonyvkatalogus.hu"

var res = await axios.get(url)
res = res.data;

var root = parser.parse(res);

function getIDs(type){
var select = root.getElementById("SearchForm_school" + type)

var outputObject = {}
select.childNodes.forEach((e,i)=>{
if(e._rawText == "\n") return;

var id = e.rawAttrs.replace('value="', '').replace('"', "");
var name = e.childNodes[0]._rawText;
if(name.startsWith("-")) return;

//2224 nyelvtan+irodalom
outputObject[name] = id;
});
return outputObject;
}

var targyak = getIDs("Subject");
var osztalyok = getIDs("Year");

console.log(JSON.stringify({osztalyok, targyak}, null, 4))
})()
