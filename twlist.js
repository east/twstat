var dgram = require('./dgramhndl.js');
var twsrv = require('./twsrv.js');
var master = require('./twmaster.js');

var reqInterval = 6; // ms delay between requests
var waitAfter = 6000; // ms to wait after all requests sent

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
		console.log("kbytes send/recv", dh.bytesSend/1024, dh.bytesRecv/1024);
		dh.destroy(); // meh
		cb(servers);
	}

	var getSrvInfo = function() {
		if (curIndex == addrs.length) {
			// all requests have been sent
			// wait a bit for responses and finish
			setTimeout(function(){
				_finish();	
			}, waitAfter);
			return; // done
		}
		
		var addr = addrs[curIndex];
		var addrStr = addr.ip[0]+"."+addr.ip[1]+"."+addr.ip[2]+"."+addr.ip[3]+":"+addr.port;

		console.log("get info from", "["+curIndex+"/"+addrs.length+"]", addrStr);
		
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
