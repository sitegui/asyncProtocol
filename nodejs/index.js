var Data = require("./Data.js")
var inflateFormat = require("./inflateFormat.js")
var inflateData = require("./inflateData.js")
var Connection = require("./Connection.js")
var net = require("net")

var CC_SUM = Connection.registerClientCall(1, "ii", "i")
var CC_MUL = Connection.registerClientCall(2, "ii", "i")

var SC_CONCAT = Connection.registerServerCall(3, "ss", "s")
var SC_AVG = Connection.registerServerCall(4, "(u)", "f")

var E_ZERO_EL = Connection.registerException(5, "")

var server = net.createServer(function (conn) {
	conn = new Connection(conn, false)
	conn.on("call", function (type, data, answer) {
		console.log("SERVER-SIDE", type, data)
		if (type == CC_SUM)
			answer(new Data().addInt(data[0]+data[1]))
	})
	conn.on("close", function () {
		console.log("CLOSED (SERVER)")
		conn = null
	})
}).listen(8001)
server.unref()

var client = net.createConnection({host: "127.0.0.1", port: 8001})
client.on("connect", function () {
	client = new Connection(client, true)
	client.on("call", function (type, data, answer) {
		console.log("CLIENT-SIDE", type, data, answer)
	})
	client.sendCall(CC_SUM, new Data().addInt(2).addInt(3), function (data) {
		console.log("Server returned ", data)
		client.close()
	})
	client.on("close", function () {
		console.log("CLOSED (CLIENT)")
		client = null
	})
})
