# JavaScript asyncProtocol
A JavaScript implementation for the asyncProtocol in the browser

# How to use it
Include all these files: Connection.js, Data.js, DataArray.js, DataBuffer.js, Exception.js, inflateData.js, inflateFormat.js, Token.js
```javascript
var CC_ADD = Connection.registerClientCall(1, "ii", "i")

var conn = new Connection("ws://localhost/8002")

conn.onopen = function () {
	console.log("Connection oppened")
	conn.sendCall(CC_ADD, new Data().addInt(12).addInt(13), function (data) {
		console.log("12+13="+data)
		conn.close()
	})
}

conn.onclose = function () {
	console.log("Connection closed")
}
```

# Connection

## new Connection(socket, [isClient])

## Connection.registerServerCall(id, [argsFormat, [returnFormat]])

## Connection.registerClientCall(id, [argsFormat, [returnFormat]])

## Connection.registerException(id, [argsFormat])

## ready

## sendCall(type, [data, [onreturn, [onexception, [timeout]]]])

## close()

## Event: "open()"

## Event: "call(type, data, answer)"

## Event: "close()"

# Data

## new Data()

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

# DataArray

## new DataArray(format)

## addData()

# Exception

## new Exception(type, [data])

# Token

## new Token([base])

## isEqual(token)
