var shortens = [{}];
var count = 0; 

var fs = require('fs');

var cors = require('cors');
var express = require('express');
var crypto = require('crypto');
var server = express();

var serv = require('http').createServer(server)
var io = require('socket.io').listen(serv);

var Evt = require('events').EventEmitter;
var ee = new Evt();

server.use(express.json());
server.use(express.urlencoded());
server.use(express.static( __dirname + 'public'));
server.use(cors());

//*******************************************************************************
//                                        Lista Shortens
//*******************************************************************************
server.get('/recent', lista);

function lista(req, res) {
    var s = fs.ReadStream('public/shortens.txt');
    fs.readFile('public/shortens.txt', function (err, data) {
        if (err) throw err;
        if (data!='{}') {
            shortens = JSON.parse(data);
            var rs = [];
            for (var shorten in shortens){
                rs.push(shortens[shorten]);
            }
        }
        console.log('Lista Registos: ', rs);
        res.send(rs);
    });
}
//*******************************************************************************
//                                        Cria Shorten
//*******************************************************************************
server.post('/', cria);

function cria(req, res) {
    console.log('Cria Shorten');
    var s = fs.ReadStream('public/shortens.txt');                                       //lê DB
    fs.readFile('public/shortens.txt', function (err, data) {
        if (err) throw err;
        shortens = JSON.parse(data);
        
        var url = req.body.url;
        var hash = crypto.createHash('sha1').update(url).digest('base64').replace(/[=+/]/g, '').slice(0, 6);
        
        if (!shortens[hash]) {
            console.log('Novo link');
            shortens[hash] = {id: hash, url: url, count: count};
            console.log(shortens[hash]);
            var reg = JSON.stringify(shortens);
            
            fs.writeFile('public/shortens.txt', reg, function (err) {                       //escreve DB
                if (err) throw err;
                console.log('Registo Adicionado');
            });
        }
        else {
            console.log(shortens[hash].id, ' - ', shortens[hash].url);
            console.log('link ja shortado');
        }
        ee.emit('addShorten', shortens[hash]);
        res.send(shortens[hash].id);    
        });
}
//*******************************************************************************
//                                        Redirect
//*******************************************************************************
server.get('/:shrt', red);
function red(req, res) {
    var shrt = req.params['shrt'];                                                  //le parametro
    var s = fs.ReadStream('public/shortens.txt');
    fs.readFile('public/shortens.txt', function (err, data) {              //lê DB
        if (err) throw err;
        shortens = JSON.parse(data);                                            //parse para JSON
        var registo = shortens[shrt];
        res.redirect('http://' + registo.url);
	shortens[shrt].count++;
        var regs = JSON.stringify(shortens);                                     //JSON para String
        fs.writeFile('public/shortens.txt', regs, function (err) {           //escreve DB
                if (err) throw err;
                console.log('Redirect feito');
        });
    });
}

//*******************************************************************************
//                                        Sockect IO
//*******************************************************************************

io.sockets.on('connection', function (socket) {
    ee.addListener('addShorten', registaEvt);
    socket.on('disconnect', function () {
        ee.removeListener('addShorten', registaEvt);
    });
    function registaEvt (hash){
        console.log('Regista Evento :  ' )
        socket.emit('alt', {hash: hash});
    }   
    socket.emit('conn', { estado: 'Conectado' });
    console.log('Conectado socket ');
});



serv.listen(8000);