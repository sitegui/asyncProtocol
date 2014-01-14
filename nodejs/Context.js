"use strict"

// Represent a collection of registered calls and exceptions
// Every connection is bind to a context at creation time
function Context() {
	// Store registered entities by their name and id
	this._clientCalls = Object.create(null)
	this._serverCalls = Object.create(null)
	this._exceptions = Object.create(null)
}

module.exports = Context
var expand = require("./expand.js")
var Connection = require("./Connection.js")
var ws = require("nodejs-websocket")
var NetWrapper = require("./NetWrapper.js")
var WSWrapper = require("./WSWrapper.js")

// Register a new type of call that the server can make
// signature have the syntax described in the file expand.js
// callback(args, answer) is optional and will be called when this call is received
// Inside the callback, "this" will refer to the connection that received the call
Context.prototype.registerServerCall = function (signature, callback) {
	var data = expand.expandCallSignature(signature)
	data.callback = callback
	
	if (Math.round(data.id) != data.id || data.id < 1)
		throw new TypeError("id must be a non-zero unsigned integer")
	if (data.name in this._serverCalls)
		throw new Error("Unable to register server call "+data.name+", it has already been registered")
	this._serverCalls[data.name] = data
	this._serverCalls[data.id] = data
}

// Register a new type of call that clients can make
// signature have the syntax described in the file expand.js
// callback(args, answer) is optional and will be called when this call is received
// Inside the callback, "this" will refer to the connection that received the call
Context.prototype.registerClientCall = function (signature, callback) {
	var data = expand.expandCallSignature(signature)
	data.callback = callback
	
	if (Math.round(data.id) != data.id || data.id < 1)
		throw new TypeError("id must be a non-zero unsigned integer")
	if (data.name in this._clientCalls)
		throw new Error("Unable to register client call "+data.name+", it has already been registered")
	this._clientCalls[data.name] = data
	this._clientCalls[data.id] = data
}

// Register a new type of exception
Context.prototype.registerException = function (signature) {
	var data = expand.expandExceptionSignature(signature)
	
	if (Math.round(data.id) != data.id || data.id < 1)
		throw new TypeError("id must be a non-zero unsigned integer")
	if (data.name === "timeout" || data.name === "closed" || data.name in this._exceptions)
		throw new Error("Unable to register exception "+data.name+", it has already been registered")
	this._exceptions[data.name] = data
	this._exceptions[data.id] = data
}

// Wrap a client net socket with the async protocol and bind it to this context
// Return a new Connection object
Context.prototype.wrapSocket = function (socket) {
	return new Connection(new NetWrapper(socket), this, true)
}

// Turn a net server into a async-protocol server
// callback will be added as "asyncConnection" listener
// Whenever a new async connection is made, "asyncConnection(conn)" is emited
// conn is a Connection object
Context.prototype.wrapServer = function (server, callback) {
	var that = this
	if (callback)
		server.on("asyncConnection", callback)
	server.on("connection", function (conn) {
		server.emit("asyncConnection", new Connection(new NetWrapper(conn), that))
	})
}

// Create and return a WebSocket server that accepts async-protocol connections
// options is an object to be passed to net.createServer() or tls.createServer(), with the additional property "secure" (a boolean)
// callback will be added as "asyncConnection" listener
// Whenever a new async connection is made, "asyncConnection(conn)" is emited
// conn is a Connection object
Context.prototype.createWSServer = function (options, callback) {
	var that = this
	if (typeof options === "function") {
		callback = options
		options = {secure: false}
	}
	var server = ws.createServer(options, function (conn) {
		server.emit("asyncConnection", new Connection(new WSWrapper(conn), that))
	})
	if (callback)
		server.on("asyncConnection", callback)
	return server
}
