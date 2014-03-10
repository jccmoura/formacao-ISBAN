var shortens = [{}];
var count = 0;
var acess = { 'mauricio@isban.pt' :  '1234', 'alfredo@isban.pt' : '1234'};

var MAX_SESSION_SECONDS = 60 * 60 * 2;

var HMAC_KEY = 'A';
var HMAC_ALG = 'sha1';
//var HMAC_KEY = process.env.KEY;


var fs = require('fs');

var assert = require('assert');
var cors = require('cors');
var express = require('express');
var crypto = require('crypto');
var server = express();

assert(HMAC_KEY, 'KEY is not defined!');

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
    
    var token = req.header('X-Auth-Token');
    
   
    if (! token ) {
        console.log('Erro autenticação 1')
      return res.send(401, 'bad auth');
    }
    var val = validToken(token);
    console.log('Resultado validate: ', val, validate.toString());
    
    if (!val) {
      console.log('Erro autenticação 2')
      return res.send(401, 'bad auth');
    }

    
    console.log('Cria Shorten');
    var s = fs.ReadStream('public/shortens.txt');                                       //lê DB
    fs.readFile('public/shortens.txt', function (err, data) {
        if (err) throw err;
        shortens = JSON.parse(data);
        
        var dirtyUrl = req.body.url;
        var url = dirtyUrl.replace(/(<([^>]+)>)/ig, '');
        var hash = crypto.createHash('sha1').update(url).digest('base64').replace(/[=+/]/g, '').slice(0, 6);
        console.log('Valor URL : ', url);
        
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
        ee.emit('addShorten', shortens);
        res.send(shortens[hash].id);    
        });
}


function validToken(token) {
  console.log('Entra validate');
  var obj;
  try {
    obj = JSON.parse(token);
  } catch(ex) {
    return false;
  }

  if (Math.floor(Date.now()/1000) - obj.ts > MAX_SESSION_SECONDS)
    return false;

  return obj.sign === generateSign(obj.email, obj.ts);
}

function generateSign(email, ts) {
  var sign = crypto.createHmac(HMAC_ALG, HMAC_KEY).update(email+':'+ts).digest('base64');
  return sign;
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
            var rs = [];
            for (var shorten in shortens){
                rs.push(shortens[shorten]);
            }
            ee.emit('addShorten', rs);
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
        socket.emit('alt', hash);                                                                               //emite lista para browsers
    }   
    socket.emit('conn', { estado: 'Conectado' });
    console.log('Conectado socket ');
});

//**********************************************************************************
//                                                  Log In
//**********************************************************************************
server.post('/login', function(req, res) {
  
  console.log('Pedido autenticaçao', req.body);
  var email = req.body.email;
  var password = req.body.password;
  console.log('Pedido autenticaçao', email, password);

  if (!email || !password)
    return res.send(400, 'bad request');

  var valid = validate(email, password);

  if (! valid)
    return res.send(401, 'bad auth');

  res.send(generateToken(email));
});

function validate(email, password) {
  if (!acess[email]) 
    return false;
  else
    return acess[email] === password;
}

function generateToken(email) {
  var now = Math.floor(Date.now() / 1000);

  var sign = crypto.createHmac(HMAC_ALG, HMAC_KEY).update(email+':'+now).digest('base64');

  return JSON.stringify({ ts: now, email: email, sign: sign });
}

//**************************************************************************

serv.listen(8000);