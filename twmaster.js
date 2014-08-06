var dns = require("dns");

module.exports = {
	fetchServers: fetchServers
};

var srvPort = 8300;
var masters = [
	"master1.teeworlds.com",
	"master2.teeworlds.com",
	"master3.teeworlds.com",
	"master4.teeworlds.com"
];

var masterAddrs = [];

var protoHeader = new Buffer([0xff,0xff,0xff,0xff,0xff,0xff,]);
var protoGetList = new Buffer([0xff, 0xff, 0xff, 0xff, 0x72, 0x65, 0x71, 0x32]);

function getServerList(dgram, addr, port, cb) {
	var done = false;
	var req = new Buffer(14, 'ascii');
	var servers = [];

	var _finish = function() {
		done = true;
		dgram.close(addr, port);
	}

	protoHeader.copy(req);
	protoGetList.copy(req, protoHeader.length);

	dgram.sendto(addr, port, req, function(msg) {
		var isLast = false;

		if (msg.length < 14) {
			console.log("invalid packet length");
			return;
		}

		var data = msg.slice(14);

		if (data.length%18 != 0) {
			console.log("packet not aligned to 18");
			return;
		}

		var numServers = data.length / 18;
		if (numServers < 75)
			isLast = true;

		for (var i = 0; i < numServers; i++) {
			var offs = i*18;
			// ipv4 -> ipv6 mapping
			// last four octets
			var ip = [
				data.readUInt8(offs+12),
				data.readUInt8(offs+13),
				data.readUInt8(offs+14),
				data.readUInt8(offs+15)
			];

			var port = data.readUInt16BE(offs+16);

			servers.push({
				ip: ip,
				port: port,
			});
		}

		if (isLast)
		{
			_finish();
			cb(servers);
		}
	});


	setTimeout(function() {
		if (done)
			return; // forever alone callback

		// didn't get response in time, cancel
		_finish();
		cb(servers, "timeout");
	}, 1000);
}

function fetchServers(dgram, cb) {

	var dnsResps = 0;
	var mResps = 0;
	var serverList = [];

	var _finishDns = function() {
		if (dnsResps == 4) {
			for (var i = 0; i < masterAddrs.length; i++)
				_getServers(masterAddrs[i]);
		}
	}

	// lookup masters
	dns.resolve4(masters[0], function(err, addresses) {
		if (addresses) {
			masterAddrs[0] = addresses[0];
		}
		dnsResps++;
		_finishDns();
	});
	dns.resolve4(masters[1], function(err, addresses) {
		if (addresses) {
			masterAddrs[1] = addresses[0];
		}
		dnsResps++;
		_finishDns();
	});
	dns.resolve4(masters[2], function(err, addresses) {
		if (addresses) {
			masterAddrs[2] = addresses[0];
		}
		dnsResps++;
		_finishDns();
	});
	dns.resolve4(masters[3], function(err, addresses) {
		if (addresses) {
			masterAddrs[3] = addresses[0];
		}
		dnsResps++;
		_finishDns();
	});

	var _finish = function() {
		if (mResps == masterAddrs.length) {
			// all requests finished
			cb(serverList); // done
		}
	}

	var _getServers = function(addr) {
		getServerList(dgram, addr, srvPort, function(srvs) {
			//console.log("master1", srvs.length, "servers");
			serverList = serverList.concat(srvs);
			mResps++;
			_finish();
		});
	}
}

