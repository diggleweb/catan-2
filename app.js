var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    path = require('path'),
    fs = require('fs'),
    browserify = require('browserify'),
    baseDir = __dirname + '/public';

var Board = require('./app/board').Board,
    Player = require('./app/player').Player,
    utils = require('./app/utils');


var boards = {};

server.listen(8787);

app.configure(function () {
    var output = fs.createWriteStream(baseDir + '/bundle.js');
    var b = browserify();
    b.add(baseDir + '/js/soc.js');
    b.bundle().pipe(output);
    app.use(app.router);
    app.use(express.static(baseDir));
});

app.get('/', function (req, res) {
    res.sendfile(baseDir + '/index.html');
});

var handleConnection = function (socket) {
    var boardId,
        player;

    socket.on('adduser', function (name) {
        player = new Player(name, socket);
        socket.emit('adduser', player.serialize());
    });

    // add to existing game or create new one.
    socket.on('joinboard', function (boardId) {
        // XXX
        //var board = boards[boardId];
        var board = boards[1];
        if (board) { 
            board.addUser(player);
            socket.emit('joinboard', boardId);
        } else {
            // invalid board Id
        }
    });

    // where should this be handled.
    socket.on('message', function (msg) {
        //var board = boardId && boards[boardId];
        var board = boards[1];
        if (player && board) {
            // Propagate message to players in same game.
            board.notify(msg, player.name);
        }
    });

    socket.on('createboard', function () {
        var board = new Board();
        boardId = board.id;
        // XXX
        //boards[boardId] = board;
        boards[1] = board;
        board.addUser(player);
        socket.emit('joinboard', boardId);
    });

    socket.on('disconnect', function () {
        if (boardId && player) {
            // remove user from board
            // XXX broken because we're mocking board
            //boards[boardId].removeUser(player.id);
        }
    });
};

io.sockets.on('connection', handleConnection);

/*
io.sockets.on('connection', function (socket) {
    var uid,
        name;
    socket.on('adduser', function (data) {
        name = data;
        if (name) {
            uid = utils.createUniqueId();
            console.log('add new user:', name);
            // Not sure if this is good practice to pass in socket.
            board.addUser({playerId: uid, name: name, socket: socket});
        }
    });
    socket.on('message', function (message, callback) {
        console.log('LOG:', name, ':', message);
        // Propagate message to all clients.
        io.sockets.emit('sendchat', {name: name, msg: message});
    });
    socket.on('disconnect', function () {
        if (uid) {
            console.log('LOG: Disconnect by user');
            board.removeUser(uid);
        }
    });
});

board.on('setup', function (boardData) {
    io.sockets.emit('setup', boardData);
});

board.on('ready', function () {
    io.sockets.emit('ready');
});

board.on('notify', function (msg) {
    io.sockets.emit('sendchat', {name: '*** server ***', msg: msg});
});
*/
