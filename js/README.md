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

## new aP(url)
Creates a new asyncProtocol connection with the given `url` (same syntax from `new WebSocket`).

## aP.registerServerCall(id, [argsFormat, [returnFormat]])
Registers a valid call that the server can send to clients.
`id` is a non-zero integer that identifies the call type and it will be returned, so you can use the syntax `var SC_FOO = aP.registerServerCall(7)` to save the id into a constant.
`argsFormat` is a string representing the type of arguments sent by the server (default: "").
`returnFormat` is a string representing the type of arguments returned by the client (default: "").

Examples of format string are:
* "u": an unsigned integer
* "ii": two integers
* "s(i)": a string and an array of integers
* "u(i(i))": an unsigned integer and an array. Every element of this array is an int and an int-array

The types accepted by the protocol are: uint (u), int (i), float (f), token (t) and string (s).
In an array every element has the same format.

## aP.registerClientCall(id, [argsFormat, [returnFormat]])
Same idea from `aP.registerClientCall`, except it register a valid call that clients can send to the server.

## aP.registerException(id, [argsFormat])
Register a valid exception. Every call (server-originated or client-originated) can return this exception.
`id` is a non-zero integer that identifies the exception type and it will be returned, so you can save it into a constant.
`argsFormat` is the format of the data carried by the exception (default: "")

## ready
A boolean to tell if the connection is ready to accept calls.
Any attempt to send a call with a closed connection will throw an exception.
Any attempt to answer a call from a closed connection will be silently ignored.

## sendCall(type, [data, [onreturn, [onexception, [timeout]]]])
Send a call request to the other side.
`type` is the call id (previously registered with `aP.registerClientCall`).

`data` is a `aP.Data` object, a `aP.DataArray` object, string or null (default: null).
It must match the registered format for the arguments call.

`onreturn` is a callback that will be called when the given call is answered by the other side (default: null).
It will be passed the a `data` argument, that contains the data return by the other side.
This `data` has already been extracted from the protocol formats, so uint, int and float turn into number.
See examples of accessing the values inside it:
* "u": `data`: number
* "ii": `data[0]`: number, `data[1]`: number
* "s(i)": `data[0]`: string, `data[1]`: Array, `data[1][n]`: number
* "u(i(i))": `data[0]`: number, `data[1]`: Array, `data[1][n]`: Array, `data[1][n][0]`: number, `data[1][n][1]`: Array, `data[1][n][1][m]`: number

`onexception` is a callback that will be called when the given call is answered with an exception by the other side (default: null).
It will be passed two arguments: `type` (the exception id) and `data` (same idea from onreturn above).
Aside from the registered exceptions, two other exceptions exists by default (with a null data):
* timeout-exception (type=0): the call has been expired. If the answer is received after the timeout, it will be ignored and the connection will be dropped.
* close-exception (type=-1): the connection has been closed before the call could be answered

`timeout` is the maximum time (in ms) the protocol will wait for a response, 0 means no timeout (default: 60e3).

## close()
Close the connection. All pending calls will receive a close-exception (type=-1).

## Event: "open()"
Dispatched when the connection is established with the async-server behind the websocket gate.

## Event: "call(type, data, answer)"
Dispatched when the connection receives a valid call from the other side.
`type` is the call type id.
`data` contains the data sent by the other side (see the description for `onreturn` parameter for `sendCall` above).

`answer` is a callback that must be called to answer this call. The call doesn't need to be answered right away, since the protocol is asynchronous, so the code is free to read from files, connect to databases, etc.
`answer` receives one argument. It call be the return data (same idea from `data` argument for `sendCall`) or an `aP.Exception` object.

## Event: "close()"
Dispatched when the connection is closed, for any reason.

# aP.Data
Encode data (write-only) in the protocol format and is used to send data with `sendCall` or with `answer` callback on "call" event.
Every method return the object itself, so you can use this syntax: `var data = new aP.Data().addInt(12).addInt(13)`.

## new aP.Data()
Creates a new data bundle (initialy empty).

## addUint(u)
Adds an unsigned integer (0 <= u < 2^53).

## addInt(i)
Adds a signed integer (-2^53 < u < 2^53).

## addFloat(f)
Adds a float (single-presicion) value.

## addToken(t)
Adds a `aP.Token` object.

## addString(s)
Adds a string to the bundle.

## addDataArray(a)
Adds a `aP.DataArray`.

## addData(data)
Appends a `aP.Data` to this one

## addUintArray(array)
Appends a array of unsigned integers.

## addIntArray(array)
Appends a array of signed integers.

## addFloatArray(array)
Appends a array of floats.

## addTokenArray(array)
Appends a array of `aP.Token`.

## addStringArray(array)
Appends a array of strings.

# aP.DataArray
Represents an array (write-only) in the sense of the protocol. Each element is a `aP.Data` object.

## new aP.DataArray(format)
Creates a new array with the given `format` string for every element (see `aP.registerServerCall` for more about format strings).

## addData(data)
Appends a new element into the array.

# aP.Exception
Represents an exception, that will be sent as an answer to a call (see "call" event).

## new aP.Exception(type, [data])
Creates a new exception with the given `type` id and `data` (default: null).

# aP.Token
Represents a token of 16 bytes

## new aP.Token([base])
Creates a new token from the base (another token). Default: random token

## isEqual(token)
Returns if the token is equal to another one
