"use strict"

// Wraps a net socket to give a simpler interface to Connection objects
// This object has two listeners (inside them, "this" refers to the wrapper object):
// onmessage(message: Buffer)
// onclose()
// And two methods:
// close()
// send(metadata: Buffer, data: Buffer)
function NetWrapper(socket) {
	var that = this
	this._socket = socket
	
	socket.once("finish", function () {
		if (that.onclose)
			that.onclose.call(that)
		that.ondata = null
		that.onclose = null
	})
	
	socket.once("close", function () {
		if (that.onclose)
			that.onclose.call(that)
		that.ondata = null
		that.onclose = null
	})
	
	// Ignore errors
	socket.on("error", function () {})
	
	var cache = new Buffer(0)
	socket.on("readable", function () {
		var data = socket.read(), state, length, message
		if (!data) return
		cache = Buffer.concat([cache, data], cache.length+data.length)
		
		// Try to read messages
		while (true) {
			state = {buffer: cache, offset: 0}
			try {
				length = inflateData.readUint(state)
			} catch (e) {
				// We need to wait for more data
				if (!(e instanceof RangeError))
					that.close()
				break
			}
			if (cache.length >= state.offset+length) {
				message = cache.slice(state.offset, state.offset+length)
				cache = cache.slice(state.offset+length)
				that.onmessage.call(that, message)
			} else
				break
		}
		if (cache.length > Context._maxBufferLength)
			// Buffer overflow
			that._socket.destroy()
	})
}

module.exports = NetWrapper
var Data = require("./Data.js")
var inflateData = require("./inflateData.js")
var Context = require("./Context.js")

NetWrapper.prototype.close = function () {
	this._socket.end()
}

NetWrapper.prototype.send = function (metadata, data) {
	var length = new Data().addUint(metadata.length+data.length).toBuffer()
	this._socket.write(length)
	this._socket.write(metadata)
	this._socket.write(data)
}
