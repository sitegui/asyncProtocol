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
		pair.end()
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
					pair.end()
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
}).listen(8002)
