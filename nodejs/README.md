# Nodejs asyncProtocol
A nodejs implementation for the asyncProtocol

# How to use it
Install with `npm install nodejs-websocket` or put all files in a folder called "nodejs-websocket", and:
```javascript
var aP = require("async-protocol")
var net = require("net")

var CC_ADD = aP.registerClientCall(1, "ii", "i")

// Sum server at port 8001: a, b -> a+b
net.createServer(function (conn) {
	console.log("Server: new connection")
	conn = new aP(conn)
	conn.on("call", function (type, data, answer) {
		console.log("Server: call received")
		if (type == CC_ADD)
			answer(new aP.Data().addInt(data[0]+data[1]))
	})
	conn.on("close", function () {
		console.log("Server: connection closed")
	})
}).listen(8001)

// Test the server after 1s
setTimeout(function () {
	console.log("Client: start test")
	var conn = net.connect(8001, function () {
		console.log("Client: connected")
		conn = new aP(conn, true)
		conn.sendCall(CC_ADD, new aP.Data().addInt(12).addInt(13), function (data) {
			console.log("Client: received", data)
			conn.close()
		})
	})
}, 1e3)

// WebSocket gate (let browser communicate with the async-server using port 8002)
new aP.Gate(function () {
	console.log("Gate: new connection from browser")
	return net.connect(8001)
}).listen(8002)
```

# aP
The main object, returned by `require("async-protocol")`

## new aP(socket, [isClient])

## aP.registerServerCall(id, [argsFormat, [returnFormat]])

## aP.registerClientCall(id, [argsFormat, [returnFormat]])

## aP.registerException(id, [argsFormat])

## closed

## sendCall(type, [data, [onreturn, [onexception, [timeout]]]])

## close()

## Event: "call(type, data, answer)"

## Event: "close()"

# aP.Data

## new aP.Data()

## addUint(u)

## addInt(i)

## addFloat(f)

## addToken(t)

## addString(s)

## addDataArray(a)

## addData(data)

## addUintArray(array)

## addIntArray(array)

## addFloatArray(array)

## addTokenArray(array)

## addStringArray(array)

# aP.DataArray

## new aP.DataArray(format)

## addData()

# aP.Exception

## new aP.Exception(type, [data])

# aP.Token

## new aP.Token([base])

## isEqual(token)

# aP.Gate

## new aP.Gate([options], createPair)
