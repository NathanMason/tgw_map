require('dotenv').config({path: __dirname+'/.env'});
var express = require('express');
var cors = require('cors');
var swig = require('swig');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var morgan = require('morgan');
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session')

app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({secret: 'some secrety secret'}))
app.use(express.static(path.join(__dirname, '/app')));
app.use('/bower_components', express.static(__dirname + '/bower_components'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));
var corsOptions = {
  origin: [],
  credentials: true
};
app.use(cors(corsOptions));

var config = {
  port: process.env.PORT || 3020
};

app.engine('html', swig.renderFile)
app.set('views', path.join(__dirname, '/app/'));
app.set('view engine', 'html');

io.on('connection', function(socket){
  console.log('a user connected');
});

app.get('/*', function(req, res, next) {
  if (/.js|.html|.css|templates|js|scripts/.test(req.path) || req.xhr) {
  return next({ status: 404, message: 'Not Found' });
  } else {
     return res.render('index');
  }
});

http.listen(config.port, config.host);
