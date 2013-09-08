var net = require("net")
var tls = require("tls")
var Connection = require("./Connection.js")
var Data = require("./Data.js")

var CC_SUM = Connection.registerClientCall(1, "ii", "i")
var CC_DIV = Connection.registerClientCall(2, "ii", "f")

var E_ZERO = Connection.registerException(17)

var SC_ORANGE = Connection.registerServerCall(27, "s", "s")

var log = function (qual) {
	return function (data) {
		console.log(qual, data)
	}
}

var log2 = function (qual) {
	return function (data) {
		console.log("Erro("+data+")", qual)
	}
}

var options = {host: "192.168.1.150", port: 8001, rejectUnauthorized: false}

var conn = net.connect(options, function () {
	var i
	conn = new Connection(conn, true)
	
	for (i=0; i<10; i++)
		conn.sendCall(CC_SUM, new Data().addInt(i).addInt(i), log(i), log2(i), 3e3)
	conn.on("close", function () {
		console.log("Closed")
	})
	conn.on("call", function (type, data, answer) {
		if (type == SC_ORANGE)
			answer(data.toUpperCase())
	})
})
