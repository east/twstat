/*
	this tool watches keeps an up to date
	list of teeworlds servers.
*/

var express = require("express");
var app = express();
var twlist = require('./twlist.js');

var curList = [];
// delay between list refresh
var interval = 60000;

// searchInfo - [{name: '', clan: ''}, {...}]
function findPlayers(searchInfo) {
	var list = {
		servers: [],
		players: [],
	};

	for (var i = 0; i < curList.length; i++) {
		var srv = curList[i];
		for (var p = 0; p < srv.players.length; p++) {
			var equal = false;
	
			// match player with all search expressions
			for (var g = 0; g < searchInfo.length; g++) {
				var namePass = false;
				var clanPass = false;
				if (!searchInfo[g].name || srv.players[p].name == searchInfo[g].name) {
					namePass = true;
				}

				if (!searchInfo[g].clan || srv.players[p].clan == searchInfo[g].clan) {
					clanPass = true;
				}

				if (clanPass && namePass)
				{
					equal = true;
					break;
				}
			}
			
			if (equal) {
				// add server to list
				var sIndex = list.servers.indexOf(srv);
				if (sIndex == -1) {
					// add new
					list.servers.push(srv);
					sIndex = list.servers.length-1;
				}

				list.players.push({
					srvId: sIndex,
					pl: srv.players[p]
				});
			}
		}
	}

	return list;
}

function getServer(ip, port) {
	for (var i = 0; i < curList.length; i++) {
		var srv = curList[i];
		if (srv.address == ip && srv.port == port)
			return srv;
	}

	return null;
}

function update() {
	console.log("fetch servers...");

	twlist.fetchServers(function(servers) {
		console.log("done, servers:", servers.length);
		curList = servers;

		setTimeout(update, interval);
	});
}


// ajax
//CORS middleware
function allowCrossDomain(req, res) {
	res.header('Access-Control-Allow-Origin', "*");
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
}

app.get("/get/:plname/:plclan/", function(req, res) {
	res.header("Content-Type", "application/json");
	allowCrossDomain(req, res);

	var name = req.params.plname == "matchall" ? "" : req.params.plname;
	var clan = req.params.plclan == "matchall" ? "" : req.params.plclan;

	var obj = {};
	var body;

	if (!(name || clan))
		obj.error = "Invalid request";
	else {
		var plInfo = findPlayers([{name: name, clan: clan}]);

		if (!plInfo.players.length)
			obj.error = "Player not found"
		else {
			var pls = plInfo.players;
			obj.players = [];	
			for (var i = 0; i < pls.length; i++)	 {
				obj.players.push({
					name: pls[i].pl.name,
					clan: pls[i].pl.clan,
					srvId: pls[i].srvId,
				});		
			}

			// add servers
			obj.servers = [];
			for (var i = 0; i < plInfo.servers.length; i++) {
				var srv = plInfo.servers[i];
				obj.servers.push({
					name: srv.name,
					map: srv.map,
					gametype: srv.gametype,
					numPlayers: srv.numClients, 
					maxPlayers: srv.maxClients,
					addr: srv.address+":"+srv.port,
				});	
			}
		}
	}

	res.status(200).send(JSON.stringify(obj));
});

app.get("/server/:ip/:port/", function(req, res) {
	res.header("Content-Type", "application/json");
	allowCrossDomain(req, res);

	var ip = req.params.ip;
	var port = req.params.port;

	var obj = {};
	var body;

	if (!ip && !port)
		obj.error = "Invalid request";
	else {
		var srv = getServer(ip, port);

		if (!srv) {
			obj.error = "Server not found";
		} else {
			obj = srv;
		}
	}

	res.status(200).send(JSON.stringify(obj));
});

app.get("/get/qzclan", function(req, res) {
	res.header("Content-Type", "application/json");
	allowCrossDomain(req, res);
	
	var obj = {};
	var body;


	var plInfo = findPlayers([{clan: "'qZ"}, {clan: "QuintessenZ"}, {name: "'qZ |BlaGK|›", clan: "enjoy!"}]);

	if (!plInfo.players.length)
		obj.error = "Player not found"
	else {
		var pls = plInfo.players;
		obj.players = [];	
		for (var i = 0; i < pls.length; i++)	 {
			obj.players.push({
				name: pls[i].pl.name,
				clan: pls[i].pl.clan,
				srvId: pls[i].srvId,
			});		
		}

		// add servers
		obj.servers = [];
		for (var i = 0; i < plInfo.servers.length; i++) {
			var srv = plInfo.servers[i];
			obj.servers.push({
				name: srv.name,
				map: srv.map,
				gametype: srv.gametype,
				numPlayers: srv.numClients, 
				maxPlayers: srv.maxClients,
				addr: srv.address+":"+srv.port,
			});	
		}
	}

	res.status(200).send(JSON.stringify(obj));
});

update();

app.listen(8888);
