var dgram = require('./dgramhndl.js');
var tw = require('./twsrv.js');
var master = require('./twmaster.js');
var twlist = require('./twlist.js');

twlist.fetchServers(function(servers) {
	console.log("got servers:", servers.length);

	var allPlayers = [];

	for (i in servers) {
		var srv = servers[i];
		var pls = srv.players;

		for (p in pls) {
			allPlayers.push(pls[p]);
		}
	}

	console.log("players:", allPlayers.length);
});

//var dh = new dgram.DgramHandler();

/*tw.getInfoSmart(dh, "190.114.253.157:7203", function(err, obj) {
	if (err)
		console.log("failed", err);
	else
		console.log(obj);
});*/

/*master.fetchServers(dh, function(list) {
	console.log("got servers", list.length);
});*/
