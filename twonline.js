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

function update() {
	console.log("fetch servers...");

	twlist.fetchServers(function(servers) {
		console.log("done, servers:", servers.length);
		curList = servers;

		setTimeout(update, interval);
	});
}


// ajax
app.get("/get/:plname/:plclan/", function(req, res) {
	res.header("Content-Type", "application/json");

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

app.get("/get/qzclan", function(req, res) {
	res.header("Content-Type", "application/json");

	var obj = {};
	var body;


	var plInfo = findPlayers([{clan: "'qZ"}, {name: "'qZ |BlaGK|›", clan: "enjoy!"}]);

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
