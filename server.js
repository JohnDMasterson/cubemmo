var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server);
	
var port = process.env.PORT || 3000;
server.listen(port);

var sockets = {};

var cubes = {};
	
	
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

	io.sockets.sockets[socket.id].emit("give_id", socket.id);


	socket.on('give_position', function (client) {
		console.log(socket.id + " moved to " + client.pos);
		cubes[client.id] = client.pos;
		for(s in sockets) {
				if(sockets[s])
					sockets[s].emit("update_position", client);
				else
					console.log("broken socket");
		}
	});
	
	socket.on('disconnect', function() {
		console.log('Removing Socket: ' + socket.id);
		delete sockets[socket.id];
		delete cubes[socket.id];
		for(s in sockets) {
				if(sockets[s])
					sockets[s].emit("delete_cube", socket.id);
				else
					console.log("broken socket");
		}

	});

});

