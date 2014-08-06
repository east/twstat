var dgram = require('./dgramhndl.js');
var twsrv = require('./twsrv.js');
var master = require('./twmaster.js');

var reqInterval = 10; // ms delay between requests

module.exports = {
	fetchServers: fetchServers
};

function fetchServers(cb) {

	var dh = new dgram.DgramHandler();

	var addrs;
	var curIndex = 0;
	var servers = [];
	var failed = [];

	master.fetchServers(dh, function(list) {
		addrs = list;
		getSrvInfo();
	});

	var _finish = function() {
		dh.destroy(); // meh
		cb(servers);
	}

	var getSrvInfo = function() {
		if (curIndex == addrs.length) {
			// all requests have been sent
			// wait a bit for responses and finish
			setTimeout(function(){
				_finish();	
			}, 10000);
			return; // done
		}
		
		var addr = addrs[curIndex];
		var addrStr = addr.ip[0]+"."+addr.ip[1]+"."+addr.ip[2]+"."+addr.ip[3]+":"+addr.port;

		//console.log("get info from", addrStr);
		
		twsrv.getInfoSmart(dh, addrStr, function(status, info) {
			if (info == undefined) {
				failed.push(addrStr);
				return;
			}
			
			servers.push(info);
		});

		// next
		curIndex++;
		setTimeout(getSrvInfo, reqInterval);
	}
}
