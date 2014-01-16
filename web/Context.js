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
Context.prototype.registerClientCall = function (signature) {
	var data = expand.expandCallSignature(signature)
	
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

// Create a WebSocket connection with the given url
// Return a new Connection object
Context.prototype.connect = function (url) {
	return new Connection(new WebSocket(url), this)
}
