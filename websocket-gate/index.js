var ws = require("../../nodejs-websocket") // https://github.com/sitegui/nodejs-websocket
var net = require("net")
var inflateData = require("../nodejs/inflateData.js")

function nop() {}

// Create the server socket
ws.createServer(function (conn) {
	var pair, cache = new Buffer(0)
	
	// Create the local connection
	pair = net.connect(8001)
	
	// Set error/close listeners
	pair.on("error", nop)
	conn.on("error", nop)
	pair.on("close", function () {
		conn.close()
	})
	conn.on("close", function () {
		pair.close()
	})
	
	// Set websocket listener
	conn.on("binary", function (data) {
		data.on("readable", function () {
			var buffer = data.read()
			if (buffer)
				conn.write(buffer)
		})
	})
	
	// Set local connection listener
	pair.on("readable", function () {
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
				if (!(e instanceof RangeError)) {
					pair.close()
					conn.close()
				}
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
	})
	
	pair.once("connect", function () {
		conn.sendText("connected")
		conn.on("close", function () {
			conn.pair.close()
		})
		conn.on("error", nop)
		conn.on("binary", function () {
		})
	})
}).listen(8002)


