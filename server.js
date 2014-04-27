var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server);
	
server.listen(5000);
var sockets = {};
	
	
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));

io.configure(function() {
	io.set("transports", ["xhr-polling"]);
	io.set("polling duration", 10);
});

app.get('/', function(req,res) {
	res.render('index');
});

io.sockets.on('connection', function(socket) {
	console.log("New Websocket Connection: " + socket.id);
	sockets[socket.id] = socket;
	socket.on('relay_me', function (message) {
		for(s in sockets) {
				if(sockets[s])
					sockets[s].emit("incoming_message", message);
				else
					console.log("broken socket");
		}
	});
	
	socket.on('disconnect', function() {
		console.log('Removing Socket: ' + socket.id);
		delete sockets[socket.id];
	});

});

