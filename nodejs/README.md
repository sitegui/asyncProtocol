# Nodejs asyncProtocol
A nodejs implementation for the asyncProtocol (client+server side and websocket gate for browser client)

# How to use it
Install with `npm install async-protocol` or put all files in a folder called "async-protocol", and:
```javascript
"use strict"

var aP = require("async-protocol")
var net = require("net")

// Create a new async-protocol context
var cntxt = new aP

// Register all possible calls (name, args and return)
cntxt.registerClientCall("#1 add(a: int, b: int) -> result: int", add)
cntxt.registerClientCall("#2 stringInfo(str: string) -> chars[]: (char: string, count: uint), length: uint", stringInfo)
cntxt.registerClientCall("#3 div(n: int, d: int) -> result: float", div)
cntxt.registerException("#1 divByZero")

// Simple add function
function add(data, answer) {
	console.log("[Server]", "call received")
	answer({result: data.a+data.b})
}

// More complex return
function stringInfo(data, answer) {
	var chars = {}, i, c
	for (i=0; i<data.str.length; c = data.str[i++])
		chars[c] = chars[c]+1 || 1
	
	var ans = {length: data.str.length, chars: []}
	for (c in chars)
		ans.chars.push({char: c, count: chars[c]})
	answer(ans)
}

// Async and throw example
function div(data, answer) {
	if (data.d == 0)
		answer(new aP.Exception("divByZero"))
	else
		setTimeout(function () {
			// Answer after a while (simulate a fs or db request)
			answer({result: data.n/data.d})
		}, 3e3)
}

// Create a basic net server
var server = net.createServer().listen(8001)

// Wrap it with the protocol
cntxt.wrapServer(server, function (conn) {
	console.log("[Server]", "new connection")
	conn.once("close", function () {
		console.log("[Server]", "connection closed")
	})
})

// Test the server after 1s
setTimeout(function () {
	console.log("[Client]", "start connection")
	var conn = net.connect(8001, function () {
		console.log("[Client]", "connected")
		
		// Wrap it with the protocol
		conn = cntxt.wrapSocket(conn)
		conn.call("add", {a: 12, b: 13}, function (err, result) {
			console.log("[Client]", "[add]", result)
		})
		conn.call("stringInfo", {str: "Hello World!"}, function (err, result) {
			console.log("[Client]", "[stringInfo]", result)
		})
		conn.call("div", {n: 17, d: 0}, function (err) {
			if (err) {
				console.log("[Client]", "[div]", err)
				conn.close()
			}
		})
	})
}, 1e3)

// Example code to create a server that accepts WebSockets connections (from a browser for example)
cntxt.createWSServer(function (conn) {
	console.log("[WSServer]", "new connection")
	conn.once("close", function () {
		console.log("[WSServer]", "connection closed")
	})
}).listen(8002)
```

# aP
The main object, returned by `require("async-protocol")`

## aP.setMaxBufferLength(bytes)
Set the maximum size the internal Buffer can grow (default: 2MiB)
If at any time it stays bigger than this, the connection will be closed
This is a security measure, to avoid memory attacks

## new aP()
Create a new protocol context. A context is basically the collection of calls that the protocol accepts and answer

## ap.registerServerCall(signature, [callback])
Register a new call that the server can send to a client
`signature` is a string (the syntax is described bellow)
`callback` (optional) will be executed whenever the server sends the registered call. It should accept two arguments:

* `args`: the arguments sent by the server (always match the format given by the call signature)
* `answer`: a callback function that must be called to answer this call. The argument sent to it must match the return format defined by the call signature

Inside the `callback`, `this` refers to the `aP.Connection` object that received the call

## ap.registerClientCall(signature, [callback])
Register a new call that a client can send to the server
`signature` is a string (the syntax is described bellow)
`callback` (optional) will be executed whenever this registered call is received. It should accept two arguments:

* `args`: the arguments sent by the client (always match the format given by the call signature)
* `answer`: a callback function that must be called to answer this call. The argument sent to it must match the return format defined by the call signature

Inside the `callback`, `this` refers to the `aP.Connection` object that received the call

## ap.registerException(signature)
Register a new type of exception
`signature` is a string (the syntax is described bellow)

There are two special exceptions. They always exist but can't be sent the other side (that means they are raised by the local lib code):

* `"timeout"`: raised when a call takes too long to be answered
* `"closed"`: raised when the connection is lost before the call is answered

## ap.wrapSocket(socket)
Wrap a *client* net socket with the async protocol and bind it to this context
Return a new `aP.Connection` object

## ap.wrapServer(server, [callback])
Turn a net *server* into a async-protocol server
`callback` will be added as "asyncConnection" listener
Whenever a new async connection is accepted, `"asyncConnection(conn)"` is emited (`conn` is a `aP.Connection` object)

## ap.createWSServer([options], [callback])
Create and return a WebSocket server that accepts async-protocol connections
`options` is an object to be passed to net.createServer() or tls.createServer(), with the additional property `"secure"` (a boolean)
`callback` will be added as "asyncConnection" listener
Whenever a new async connection is made, `"asyncConnection(conn)"` is emited (`conn` is a `aP.Connection` object)

# aP.Token
Represent a token of 16 bytes. Can be used as a general id, even as a unique id

## new aP.Token([base])
Create a new token from the `base`. If omited, create a pseudo-random token
`base` can be a 16-byte Buffer, another Token or a hex-encoded 32-byte string

## token.isEqual(obj)
Return whether this token is equal to the token represented by the given object (another Token, a 16-byte Buffer or a hex-encoded 32-char string)

## token.toString()
Return the Token as a hex-encoded 32-char string

# aP.Exception
Represent a exceptional return, like an error. Any call can be answered with an exception that has been registered in the same context as the call.

## new aP.Exception(name, [data])
Create a new exception object. `name` is a string and `data` must match the registered format.

The main use is to answer a call with an exception, for example:

For example:
```javascript
cntxt.registerClientCall("#17 setAge(value: int)", function (args, answer) {
	if (args.value < 18)
		answer(new aP.Exception("invalidAge", {value: args.age}))
	else {
		doChangeAge(args.value)
		answer()
	}
})
cntxt.registerException("#9 invalidAge(value: int)")
```

## exception.name
A `string`. Usage example:
```javascript
conn.call("setAge", {value: 17}, function (err) {
	if (err && err.name === "invalidAge")
		displayAgeError()
})
```

## exception.data
The data carried by the exception object (must match the format registered in the context)

# aP.Connection
Represent a async-protocol connection.

You never create this object directly, instead they are returned by `ap.wrapSocket`, given by the first argument of `"asyncConnection"` events and by `this` in calls callback.

## connection.call(name, [data, [callback, [timeout]]])
Send a call to the other side.
`name` (string) is the call name, as registered in the connection context
`data` (optional) must match the registered args format
`callback` (optional) is a function with the format `function (err, result)`. In case of error, `err` is a `aP.Exception` object and `result` will be null. Otherwise, `err` will be null and `result` will bring the call return (following the format registered). The callback is executed only once.
`timeout` (optional, default:60e3) is the maximum time (in ms) you want to wait for the call to be answered. Zero means never timeout. When the this time is reached, the callback will be executed with the execption "timeout". If the answer is received after the timeout, the connection will be dropped.

If the connection is lost before the answer is received or the timeout, callback will be executed with the exception "closed"

## connection.close()
End this connection

## connection.closed
Return whether the connection hasn't been closed yet

## Event: "close()"
Dispatched when the connection is closed, for any reason

# Signature syntax

## Call signature
General structure:
> \#{id} {name}({args}) -> {returns}

* `{id}` is a decimal, positive number (>0). It is used as the under the hood identifier and must be the same in both the client and server side
* `{name}` is the call identifier (must be unique among the calls from the same context and side)
* `{args}` follow the syntax described bellow (in Format syntax). If the call takes no input, it can be omited: `#{id} {name} -> {returns}`
* `{returns}` follow the syntax described bellow (in Format syntax). If the call makes no output, it can be omited: `#{id} {name}({args})`

Examples:

* "#17 getSum(a: int, b: int) -> sum:int"
* "#2 createUser(name: string, email: string, password: Buffer)"
* "#5 getFolders -> folders[]:(name: string, ownerName: string, ownerId: uint)"
* "#7 setTags(postId: int, tags[]:string)"

## Exception signature
General structure:
> \#{id} {name}({args})

See Call signature above for details. `{name}` must not be "timeout" nor "closed"

## Format syntax
General structure:
> {field}, {field}, ...

`{field}` has three variations:

* a scalar field: `{name}:{type}`
* a vector field (every element is simply a scalar): `{name}[]:{type}`
* a array field (every element has the same, but complex, type): `{name}[]:({field})`

`{type}` must be one of "uint", "int", "float", "string", "token", "Buffer" or "boolean"
