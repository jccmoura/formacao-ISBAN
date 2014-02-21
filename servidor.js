var shortens = [];
var count = 0; 

var fs = require('fs');

var express = require('express');
var crypto = require('crypto');
var server = express();


server.use(express.json());
server.use(express.urlencoded());
server.use(express.static( __dirname + 'public'));

//*******************************************************************************
//                                        Lista Shortens
//*******************************************************************************
server.get('/recent', lista);

function lista(req, res) {
    var s = fs.ReadStream('public/shortens.txt');
    fs.readFile('public/shortens.txt', function (err, data) {
        if (err) throw err;
        shortens = JSON.parse(data);
        console.log(shortens);
        res.send(shortens);
    });
}
//*******************************************************************************
//                                        Cria Shorten
//*******************************************************************************
server.post('/', cria);

function cria(req, res) {
    console.log('cria');
    var s = fs.ReadStream('public/shortens.txt');
    fs.readFile('public/shortens.txt', function (err, data) {
        if (err) throw err;
        shortens = JSON.parse(data);
        console.log(shortens);
       
        var url = req.body.url;
        var hash = crypto.createHash('sha1').update(url).digest('base64').replace(/[=+/]/g, '').slice(0, 6);
        
        if (!shortens[hash]) {
            console.log('Novo link');
            shortens[hash] = {id: hash, url: url, count: count};
            console.log(shortens[hash]);
            var reg = JSON.stringify(shortens);
            
            console.log(reg);
            fs.writeFile('public/shortens.txt', reg, function (err) {
                if (err) throw err;
                console.log('Registo Adicionado');
            });
        }
        else {
            console.log(shortens[hash].id, ' - ', shortens[hash].url);
            console.log('link ja shortado');
        }
        });
}

server.listen(8000);