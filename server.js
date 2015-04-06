'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');

var cache = {};

function send404(res) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.write('Error 404: resource not found.');
    res.end();
}

function sendFile(res, filePath, fileContents){
    res.writeHead(200, { 'content-type': mime.lookup(path.basename(filePath)) });
    res.end(fileContents);
}

function serveStatic(res, cache, absPath){
    if (cache[absPath]) {
        sendFile(res, absPath, cache[absPath]);
    }
    else {
        fs.exists(absPath, function (exists) {
            if (exists) {
                fs.readFile(absPath, function (err, data) {
                    if (err) {
                        send404(response);
                    }
                    else {
                        cache[absPath] = data;
                        sendFile(res, absPath, data);
                    }
                });
            }
            else {
                send404(res);
            }
        });
    }
}

var port = process.env.port || 1337;
var server = http.createServer(function (req, res) {
    var filePath = false;
    if (req.url == '/') {
        filePath = 'client/index.html';
    }
    else {
        filePath = 'client' + req.url;
    }
    var absPath = './' + filePath;
    serveStatic(res, cache, absPath);

});
server.listen(port);


var chatServer = require('./lib/chat_server');
chatServer.listen(server);