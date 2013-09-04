var net = require("net")
var Connection = require("./Connection.js")
var Data = require("./Data.js")
var Exception = require("./Exception.js")

var CC_SUM = Connection.registerClientCall(1, "iiu", "i")
var E_ZERO = Connection.registerException(1)

var server = net.createServer(function (conn) {
	conn = new Connection(conn, false)
	conn.on("call", function (type, data, answer) {
		var data2
		if (type == CC_SUM) {
			data2 = new Data
			if (data[0]+data[1]) {
				data2.addInt(data[0]+data[1])
			} else
				answer(new Exception(E_ZERO))
		}
	})
}).listen(8001)
