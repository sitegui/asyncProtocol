# JavaScript asyncProtocol
A JavaScript implementation for the asyncProtocol in the browser

# How to use it
Include the file aP.js then Data.js, DataArray.js, DataBuffer.js, Exception.js, inflateData.js, inflateFormat.js, Token.js in any order
```javascript
var CC_ADD = aP.registerClientCall(1, "ii", "i")

var conn = new aP("ws://localhost:8002")

conn.onopen = function () {
	console.log("Connection oppened")
	conn.sendCall(CC_ADD, new aP.Data().addInt(12).addInt(13), function (data) {
		console.log("12+13="+data)
		conn.close()
	})
}

conn.onclose = function () {
	console.log("Connection closed")
}
```

# aP
The main object, created by aP.js

## new aP(socket, [isClient])

## aP.registerServerCall(id, [argsFormat, [returnFormat]])

## aP.registerClientCall(id, [argsFormat, [returnFormat]])

## aP.registerException(id, [argsFormat])

## ready

## sendCall(type, [data, [onreturn, [onexception, [timeout]]]])

## close()

## Event: "open()"

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
