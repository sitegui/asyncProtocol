var ws = require("../../nodejs-websocket") // https://github.com/sitegui/nodejs-websocket
var net = require("net")
var inflateData = require("../nodejs/inflateData.js")

function nop() {}

// Create the server socket
ws.createServer(function (conn) {
	var pair, cache, oppened, close
	
	// Create the local connection
	oppened = false
	pair = net.connect(8001, function () {
		oppened = true
		conn.sendText("connected")
	})
	
	// Set error/close listeners
	close = function () {
		oppened = false
		conn.close()
		pair.end()
	}
	pair.on("error", nop)
	conn.on("error", nop)
	pair.on("close", close)
	conn.on("close", close)
	
	// Set websocket listener
	conn.on("binary", function (data) {
		if (!oppened)
			close()
		else
			data.on("readable", function () {
				var buffer = data.read()
				if (buffer)
					pair.write(buffer)
			})
	})
	
	// Set local connection listener
	cache = new Buffer(0)
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
	})
}).listen(8002)
