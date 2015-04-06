'use strict';

var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function (server) {
    io = socketio.listen(server);
    io.set('log level', 1);
    io.sockets.on('connection', function (socket) {
        guestNumber = assignGuestNumber(socket, guestNumber, nickNames, namesUsed);
        joinRoom(socket, 'Lobby');
 
        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);
        socket.on('rooms', function () {
            socket.emit('rooms', io.sockets.rooms);
        });

        handleClientDisconnection(socket, nickNames, namesUsed);
    });
}

function assignGuestNumber(socket, guestNumber, nickNames, namesUsed){
    console.log("assignGuestNumber");
    var name = 'Guest' + guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    namesUsed.push(name);
    return guestNumber + 1;
}

function joinRoom(socket, room){
    console.log("joinRoom");
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', { room: room });
    socket.broadcast.to(room).emit('message', {
        text: nickNames[socket.id] + ' has joined ' + room + '.'
    });

    var socketidsInRoom = io.nsps['/'].adapter.rooms[room];
    var usersInRoomSummary = 'Users currently in ' + room + ': ';
    for (var socketId in socketidsInRoom) {
        if (socketId != socket.id) {
            usersInRoomSummary += nickNames[socketId] + ', ';
        }
    }
    usersInRoomSummary += '.';
    socket.emit('message', { text: usersInRoomSummary });
}

function handleMessageBroadcasting(socket, nickNames){
    console.log("handleMessageBroadcasting");
    socket.on('message', function (message) {
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ": " + message.text
        });
    });
}
function handleNameChangeAttempts(socket, nickNames, namesUsed){
    console.log("handleNameChangeAttempts");
    socket.on('nameAttempt', function (name) {
        if (name.indexOf('Guest') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot beging with "Guest".'
            });
        }
        else {
            if (namesUsed.indexOf(name) == -1) {
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];
                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousName + ' is now known as ' + name + '.'
                });
            }
            else {
                socket.emit('nameResult', {
                    success: false,
                    message: 'That name is already in use.'
                });
            }
        }
    });
}
function handleRoomJoining(socket){
    console.log("handleRoomJoining");
    socket.on('join', function (room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

function handleClientDisconnection(socket, nickNames, namesUsed){
    console.log("handleClientDisconnection");
    socket.on('disconnect', function () {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}
