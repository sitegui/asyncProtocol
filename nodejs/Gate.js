// Creates a gate wrapping a websocket connection
// options is an object to be passed to net.createServer() or tls.createServer(), with the additional property "secure" (a boolean)
// createPair is a function to create the connection to the asyncProtocol server and return it
// Example: function () {return net.connect(8001)}
function Gate(options, createPair) {
	if (typeof options == "function") {
		createPair = options
		options = {secure: false}
	}
	this.createPair = createPair
	return ws.createServer(options, this._getOnconnection())
}

module.exports = Gate
var ws = require("nodejs-websocket")
var inflateData = require("./inflateData.js")

function nop() {}

// Returns a listener to treat a new connection
Gate.prototype._getOnconnection = function () {
	var that = this
	return function (conn) {
		var pair, oppened, close
	
		// Create the local connection
		oppened = {value: false}
		pair = that.createPair()
		pair.on("connect", function () {
			oppened.value = true
			conn.sendText("connected")
		})
	
		// Set error/close listeners
		close = function () {
			oppened.value = false
			conn.close()
			pair.end()
		}
		pair.on("error", nop)
		conn.on("error", nop)
		pair.on("close", function () {
			conn.close()
			oppened.value = false
		})
		conn.on("close", function () {
			pair.end()
		})
	
		// Set websocket listener
		conn.on("binary", that._getOnbinary(oppened, close, pair))
	
		// Set local connection listener
		pair.on("readable", that._getOnreadable(pair, close, conn))
	}
}

// Returns a listener to binary event in the websocket-client end-point
Gate.prototype._getOnbinary = function (oppened, close, pair) {
	return function (data) {
		if (!oppened.value)
			close()
		else
			data.on("readable", function () {
				var buffer = data.read()
				if (buffer)
					pair.write(buffer)
			})
	}
}

// Returns a listener to readable event in the asyncProtocol-server end-point
Gate.prototype._getOnreadable = function (pair, close, conn) {
	var cache = new Buffer(0)
	return function () {
		var buffer, byteLength, offset, message

		// Store the data
		buffer = pair.read()
		if (!buffer)
			return
		cache = Buffer.concat([cache, buffer], cache.length+buffer.length)

		// Try to read messages
		while (true) {
			byteLength = []
			try {
				offset = inflateData.readUint(cache, 0, byteLength)
			} catch (e) {
				// We need to wait for more data
				if (!(e instanceof RangeError))
					close()
				break
			}
			byteLength = byteLength[0]
			if (cache.length >= offset+byteLength) {
				message = cache.slice(offset, offset+byteLength)
				cache = cache.slice(offset+byteLength)
				conn.sendBinary(message)
			} else
				break
		}
	}
}
