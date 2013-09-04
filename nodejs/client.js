var net = require("net")
var Connection = require("./Connection.js")
var Data = require("./Data.js")

var CC_SUM = Connection.registerClientCall(1, "iiu", "i")
var E_ZERO = Connection.registerException(1)

var conn = net.createConnection(8001, function () {
	var data
	
	conn = new Connection(conn, true)
	
	data = new Data
	data.addInt(12)
	data.addInt(12)
	data.addUint(5e3)
	
	conn.sendCall(CC_SUM, data, function (data) {
		console.log(1, data)
	}, function (type, data) {
		console.error(type, data)
	}, 2e3)
	conn.on("close", function () {
		console.log("Closed")
	})
})
