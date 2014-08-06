var dgram = require("dgram");

module.exports = {
	DgramHandler: DgramHandler
};

function DgramHandler() {
	var self = this;
	this.socket = dgram.createSocket("udp4");
	this.handlers = [];
	this.bytesRecv = 0;
	this.bytesSend = 0;

	var socket = this.socket;

	socket.on("message", function(msg, rInfo) {
		self._onMsg(msg, rInfo);	
	});

	socket.on("error", function(err) {
		console.log("dgramhandler error", err);	
	});
}

DgramHandler.prototype.destroy = function() {
	this.socket.close();
}

DgramHandler.prototype.reset = function() {
	// remove all handlers
	this.handlers = [];
}

DgramHandler.prototype.sendto = function(addr, port, data, cb) {
	this.handlers.push({addr: addr, port: port, cb: cb});
	this.bytesSend += data.length;
	this.socket.send(data, 0, data.length, port, addr);
}

DgramHandler.prototype.close = function(addr, port) {
	var h = this._getHandler({address: addr, port: port});

	if (h != -1) {
		var handler = this.handlers[h];
		// remove handler from list
		this.handlers.splice(h, 1);
	} else {
		console.log("dgram close() on invalid handle");
	}
}

DgramHandler.prototype._getHandler = function(rInfo) {
	for (var i = 0; i < this.handlers.length; i++) {
		var h = this.handlers[i];
		if (h.addr == rInfo.address && h.port == rInfo.port) {
			return i;		
		}
	}

	return -1;
}

DgramHandler.prototype._onMsg = function(msg, rInfo) {
	this.bytesRecv += msg.length;
	var h = this._getHandler(rInfo);

	if (h == -1) {
		console.log("got packet with invalid source");
		return;
	}

	var handler = this.handlers[h];

	handler.cb(msg);
}
