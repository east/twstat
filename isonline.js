#!/usr/bin/node

var http = require('http');

if (process.argv.length != 3)
{
	console.log("Usage:", process.argv[1], "<name>");
	process.exit(1);
}

var options = {
  host: 'ebeur.eastbit.net',
  port: 8888,
  path: "/get/"+process.argv[2]+"/matchall"
};

callback = function(response) {
  var str = '';

  response.on('data', function (chunk) {
    str += chunk;
  });

  response.on('end', function () {
	var obj = JSON.parse(str)
	if (obj.error)
		console.log("Player not online")
	else
	{
    	console.log(obj.players[0]);
		console.log();
	
		console.log("Servers:")

		for (var i = 0; i < obj.servers.length; i++)
		{
			console.log(obj.servers[i]);
		}
	}
  });
}

http.request(options, callback).end();
