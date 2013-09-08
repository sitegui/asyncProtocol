var net = require("net")
var Connection = require("./Connection.js")
var Data = require("./Data.js")

var CC_U = Connection.registerClientCall(1, "u", "u")
var CC_I = Connection.registerClientCall(2, "i", "i")
var CC_F = Connection.registerClientCall(3, "f", "f")
var CC_T = Connection.registerClientCall(4, "t", "t")
var CC_S = Connection.registerClientCall(5, "s", "s")
var CC_A = Connection.registerClientCall(6, "(i)", "i")

function oncall(type, data, answer) {
	switch (type) {
		case CC_U:
			return answer(new Data().addUint(data))
		case CC_I:
			return answer(new Data().addInt(data))
		case CC_F:
			return answer(new Data().addFloat(data))
		case CC_T:
			return answer(new Data().addToken(data))
		case CC_S:
			return answer(new Data().addString(data))
		case CC_A:
			return answer(new Data().addInt(data.reduce(function (a, b) {return a+b})))
	}
}

var server = net.createServer(function (conn) {
	conn = new Connection(conn)
	conn.on("call", oncall)
})

server.listen(8001)
