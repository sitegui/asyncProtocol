"use strict"

var aP = require("./index.js")
var net = require("net")

var E_DIV_ZERO = aP.registerException(1)

var CC_ADD = aP.registerClientCall(1, "ii", "i")
var CC_DIV = aP.registerClientCall(2, "uu", "f", [E_DIV_ZERO])
var CC_CONCAT = aP.registerClientCall(3, "(s)", "s")

net.createServer(function (conn) {
	console.log("New connection")
	conn = new aP(conn)
	conn.on("call", function (type, data, answer) {
		console.log("New call", data[0])
		switch (type) {
		case CC_ADD:
			answer(new aP.Data().addInt(data[0]+data[1]))
			break
		case CC_DIV:
			setTimeout(function () {
				if (data[1] == 0)
					answer(new aP.Exception(E_DIV_ZERO))
				else
					answer(new aP.Data().addFloat(data[0]/data[1]))
			}, Math.random()*200)
			break
		case CC_CONCAT:
			answer(data.join(" + "))
			break
		}
	})
	conn.on("close", function () {
		console.log("Connection closed")
	})
}).listen(8001)

aP.createGate(function () {
	console.log("New connection from browser")
	return net.connect(8001)
}).listen(8002)
