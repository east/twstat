var dns = require("dns");

var protoHeader = new Buffer([0xff,0xff,0xff,0xff,0xff,0xff,]);
var protoInfo = new Buffer([0xff,0xff,0xff,0xff, 0x69, 0x6e, 0x66, 0x33]);
var protoGetInfo = new Buffer([0xff,0xff,0xff,0xff, 0x67, 0x69, 0x65, 0x33]);
var protoGetInfo64 = new Buffer([0xff,0xff,0xff,0xff, 0x66, 0x73, 0x74, 0x64]);
var protoInfo64 = new Buffer([0xff,0xff,0xff,0xff, 0x64, 0x74, 0x73, 0x66]);
var FLAG_PASSWORD = 0x1;

module.exports = {
	getInfo06: getInfo06,
	getInfo64: getInfo64,
	getInfoSmart: getInfoSmart,
	timeout: 2
};

function bufIsEqual(dst, dstOffs, src, srcOffs, length)
{	
	for (var i = 0; i < length; i++)
	{
		if (dst[i+dstOffs] != src[i+srcOffs])
			return false;
	}

	return true;
}

function readCString(buf, offs)
{
	// get length
	var len;
	for (var i = offs; i < buf.length; i++)
	{
		if (buf[i] == 0)
		{
			len = i-offs;
			break;
		}
	}

	if (len == undefined)
		throw Error("null terminator not found");

	var str = buf.toString('utf-8', offs, offs+len);
	return [ str, offs+len+1 ];
}

function getAddrInfo(addr, cb)
{
	var port, address, domain;
	var split = new RegExp(/^(.*):([0-9]{1,5})$/);

	hostPortMatch = addr.match(split);
	var a = addr;
	if (!hostPortMatch)
	{
		// port not specified
		port = 8303; // standard port
	}
	else
	{
		a = hostPortMatch[1];
		port = parseInt(hostPortMatch[2]);
	}

	// identify address/domain
	var ipMatch = a.match(new RegExp(/^[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}$/));

	if (ipMatch)
	{
		// do reverse lookup
		address = a;

		dns.reverse(a, function(err, domains) {
			if (err)
				domain = "<not found>";
			else
				domain = domains[0];

			var addrInfo = {
				address: address,
				domain: domain,
				port: port
			};

			cb(addrInfo);
		});
	}
	else
	{
		// it's a domain, resolve it
		domain = a;

		dns.resolve4(domain, function(err, addresses) {
			if (!err)
			{
				address = addresses[0];

				var addrInfo = {
					address: address,
					domain: domain,
					port: port
				};

				cb(addrInfo);
			}
			else
				cb(null);
		});
	}
}

function unpackInt(buf)
{
	var i = 0;
	var sign = (buf[0]>>6)&1;
	var out = buf[0]&0x3F;

	do {

	if (!(buf[i]&0x80)) break;
	i++;
	out |= (buf[i]&0x7F)<<(6);

	if (!(buf[i]&0x80)) break;
	i++;
	out |= (buf[i]&(0x7F))<<(6+7);


	if (!(buf[i]&0x80)) break;
	i++;
	out |= (buf[i]&(0x7F))<<(6+7+7);


	if (!(buf[i]&0x80)) break;
	i++;
	out |= (buf[i]&(0x7F))<<(6+7+7+7);

	} while(0);

	out ^= -sign;
	return [out, i+1];
}

function getInfoSmart(dgram, addr, cb)
{
	var done = false;

	getInfo06(dgram, addr, function(err, infoObj){
		if (err)
		{
			cb(err, null);
			return;
		}

		var p = new RegExp(/([0-9]{1,2})\/([0-9]{1,2})/);
		var r = infoObj.name.match(p);

		var retNormal = true;

		if (r)
		{
			var maxPl = parseInt(r[2]);

			if (maxPl > 16 && maxPl <= 64)
			{
				retNormal = false;
				// start 64pl request
				getInfo64(dgram, addr, function(err, infoObj2){
					if (done) return;
					done = true;

					if (err)
					{
						//console.log("error parsing 64pl response:", err);
						cb(null, infoObj);
						return; // return old info obj instead
					}

					// got 64pl info, man we are smart :)
					cb(null, infoObj2);
					return;
				});
			}


		}

		if (retNormal)
		{
			cb(null, infoObj);
			return;
		}
	});
}

function getInfo64(dgram, addr, cb)
{
	// parse address
	getAddrInfo(addr, function(addrInfo) {
		// send request
		var req = new Buffer(15, 'ascii');

		protoHeader.copy(req);
		protoGetInfo64.copy(req, protoHeader.length);
		req[14] = 0; // token

		var done = false;

		var _finish = function() {
			done = true;
			dgram.close(addrInfo.address, addrInfo.port);
		}

		setTimeout(function() {
			if (!done) {
				// timeout
				_finish();
				cb("timeout", null);
			}
		}, module.exports.timeout*1000);

		var packetId = 0; // for player offset verification
		var infoObj = {
			players: [], // needs to be predefined
		};


		dgram.sendto(addrInfo.address, addrInfo.port, req, function(msg) {
			// check header
			var valid = bufIsEqual(msg, 0, protoHeader, 0, protoHeader.length) && bufIsEqual(msg, 6, protoInfo64, 0, protoInfo64.length);

			if (!valid)
			{
				_finish();
				cb("invalid header", null);
				return;
			}

			infoObj.address = addrInfo.address;
			infoObj.domain = addrInfo.domain;
			infoObj.port = addrInfo.port;
		
			try {
				var r = ["", 14];
		
				r = readCString(msg, r[1]); // token
				infoObj.token = parseInt(r[0]);

				r = readCString(msg, r[1]); // version
				infoObj.version = r[0];

				r = readCString(msg, r[1]); // server name
				infoObj.name = r[0];

				r = readCString(msg, r[1]); // map name
				infoObj.map = r[0];
		
				r = readCString(msg, r[1]); // gametype
				infoObj.gametype = r[0];

				r = readCString(msg, r[1]); // flags
				infoObj.flags = parseInt(r[0]);

				if (infoObj.flags&FLAG_PASSWORD)
					infoObj.password = true;
				else
					infoObj.password = false;

				r = readCString(msg, r[1]); // num players
				infoObj.numPlayers = parseInt(r[0]);
				r = readCString(msg, r[1]); // max players
				infoObj.maxPlayers = parseInt(r[0]);

				r = readCString(msg, r[1]); // num clients
				infoObj.numClients = parseInt(r[0]);
				r = readCString(msg, r[1]); // max clients
				infoObj.maxClients = parseInt(r[0]);

				// binary integer in cstring protocol, of course
				var tmpBuf = new Buffer(4);
				msg.copy(tmpBuf, 0, r[1], r[1]+4);

				var r2 = unpackInt(tmpBuf);
				var Offs = r2[0];
				r[1] += r2[1];

				if (Offs != packetId*24)
					//TODO: get this out
					throw "Invalid player offset: "+Offs+" should be "+packetId*24;
				packetId++;

				// players
				var maxPl = Math.min(infoObj.numClients - Offs, 24);
				for (var i = 0; i < maxPl; i++)
				{
					var pl = {};

					r = readCString(msg, r[1]); // player name
					pl.name = r[0];
					r = readCString(msg, r[1]); // player clan
					pl.clan = r[0];

					r = readCString(msg, r[1]); // country
					pl.country = parseInt(r[0]);
					r = readCString(msg, r[1]); // score
					pl.score = parseInt(r[0]);
					r = readCString(msg, r[1]); // is player
					pl.isPlayer = parseInt(r[0]) == 1 ? true : false;

					infoObj.players.push(pl);
				}
			} catch(e) {
				_finish();
				cb(e, null);
				return;
			}

			if (infoObj.players.length == infoObj.numClients)
			{
				// collected all player information
				_finish();
				cb(null, infoObj);
			}
		});
	});
}

function getInfo06(dgram, addr, cb)
{
	// parse address
	getAddrInfo(addr, function(addrInfo) {

	if (!addrInfo)
	{
		cb("address error", null);
		return;
	}

	// send request
	var req = new Buffer(15, 'ascii');

	protoHeader.copy(req);
	protoGetInfo.copy(req, protoHeader.length);
	req[14] = 0; // token

	var done = false;

	var _finish = function() {
		done = true;
		dgram.close(addrInfo.address, addrInfo.port);
	}

	setTimeout(function() {
		if (!done) {
			// timeout
			_finish();
			cb("timeout", null);
		}
	}, module.exports.timeout*1000);

	dgram.sendto(addrInfo.address, addrInfo.port, req, function(msg) {
		// got response
		done = true;
		// check header
		var valid = bufIsEqual(msg, 0, protoHeader, 0, protoHeader.length) && bufIsEqual(msg, 6, protoInfo, 0, protoInfo.length);

		if (!valid)
		{
			_finish();
			cb("invalid header", null);
			return;
		}

		var infoObj = {
			address: addrInfo.address,
			domain: addrInfo.domain,
			port: addrInfo.port
		};
		
		try {
			var r = ["", 14];
		
			r = readCString(msg, r[1]); // token
			infoObj.token = parseInt(r[0]);

			r = readCString(msg, r[1]); // version
			infoObj.version = r[0];

			r = readCString(msg, r[1]); // server name
			infoObj.name = r[0];

			r = readCString(msg, r[1]); // map name
			infoObj.map = r[0];
		
			r = readCString(msg, r[1]); // gametype
			infoObj.gametype = r[0];

			r = readCString(msg, r[1]); // flags
			infoObj.flags = parseInt(r[0]);

			if (infoObj.flags&FLAG_PASSWORD)
				infoObj.password = true;
			else
				infoObj.password = false;

			r = readCString(msg, r[1]); // num players
			infoObj.numPlayers = parseInt(r[0]);
			r = readCString(msg, r[1]); // max players
			infoObj.maxPlayers = parseInt(r[0]);

			r = readCString(msg, r[1]); // num clients
			infoObj.numClients = parseInt(r[0]);
			r = readCString(msg, r[1]); // max clients
			infoObj.maxClients = parseInt(r[0]);
	
			infoObj.players = [];

			// players
			for (var i = 0; i < infoObj.numClients; i++)
			{
				var pl = {};

				r = readCString(msg, r[1]); // player name
				pl.name = r[0];
				r = readCString(msg, r[1]); // player clan
				pl.clan = r[0];

				r = readCString(msg, r[1]); // country
				pl.country = parseInt(r[0]);
				r = readCString(msg, r[1]); // score
				pl.score = parseInt(r[0]);
				r = readCString(msg, r[1]); // is player
				pl.isPlayer = parseInt(r[0]) == 1 ? true : false;

				infoObj.players.push(pl);
			}
		} catch(e) {
			_finish();
			cb(e, null);
			return;
		}
	
		_finish();
		cb(null, infoObj);
	});
	});
}
