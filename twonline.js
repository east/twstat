/*
	this tool watches keeps an up to date
	list of teeworlds servers.
*/

var twlist = require('./twlist.js');

var curList = [];
// delay between list refresh
var interval = 60000;

function findPlayers(name, clan) {
	var pls = [];

	for (var i = 0; i < curList.length; i++) {
		var srv = curList[i];
		for (var p = 0; p < srv.players.length; p++) {
			var equal = true;
			
			if (name && srv.players[p].name != name) {
				equal = false;
			}

			if (clan && srv.players[p].clan != clan) {
				equal = false;
			}

			if (equal) {
				pls.push({
					srv: srv,
					pl: srv.players[p]
				});
			}
		}
	}

	// not found
	return pls;
}

/*function lel() {
	var info = findPlayers(null, "'qZ");

	for (var i = 0; i < info.length; i++) {
		console.log(info[i].pl.name, info[i].pl.clan);
	}

	setTimeout(lel, 1000);
}
lel();*/

function update() {
	console.log("fetch servers...");

	twlist.fetchServers(function(servers) {
		console.log("done, servers:", servers.length);
		curList = servers;

		setTimeout(update, interval);
	});
}

update();

