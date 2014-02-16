"use strict"

// Wraps a websocket to give a simpler interface to Connection objects
// This object has two listeners (inside them, "this" refers to the wrapper object):
// onmessage(message: Buffer)
// onclose()
// And two methods:
// close()
// send(metadata: Buffer, data: Buffer)
function WSWrapper(socket) {
	var that = this
	this._socket = socket
	
	// Handle connection close
	socket.once("close", function () {
		that.onclose.call(that)
		that.onmessage = null
		that.onclose = null
	})
	
	// Ignore errors
	socket.on("error", function () {})
	
	// Collect each binary frame and dispatch onmessage
	socket.on("binary", function (stream) {
		var message
		stream.on("readable", function () {
			var data = stream.read()
			if (!data) return
			message = message ? Buffer.concat([message, data], message.length+data.length) : data
		})
		stream.once("end", function () {
			if (that.onmessage)
				that.onmessage.call(that, message)
		})
	})
}

module.exports = WSWrapper

WSWrapper.prototype.close = function () {
	this._socket.close()
}

WSWrapper.prototype.send = function (metadata, data) {
	var stream = this._socket.beginBinary()
	if (stream) {
		stream.write(metadata)
		stream.end(data)
	}
}
