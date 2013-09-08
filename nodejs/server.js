var net = require("net")
var Connection = require("./Connection.js")
var Data = require("./Data.js")

var CC_SUM = Connection.registerClientCall(1, "ii", "i")
var CC_DIV = Connection.registerClientCall(2, "ii", "f")

var server = net.createServer(function (conn) {
	conn = new Connection(conn, false)
	conn.on("call", function (type, data, answer) {
		console.log("Chamada "+type)
		setTimeout(function () {
			console.log("Executei "+type)
			if (type == CC_SUM)
				answer(new Data().addInt(data[0]+data[1]))
			else if (type == CC_DIV)
				answer(new Data().addFloat(data[0]/data[1]))
		}, Math.random()*5e3)
	})
}).listen(8001)
