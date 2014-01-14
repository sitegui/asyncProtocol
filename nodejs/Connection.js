"use strict"

// Wrap a given socket connection with the asyncProtocol
// socket is a wrapped socket (either NetWrapper or WSWrapper)
// context is a Context object that will emit events for calls received by this connection
// isClient is a bool that indicates if this is the client-side (true) or server-side (false)
// Events: close()
function Connection(socket, context, isClient) {
	// Store the underlying socket
	this._socket = socket
	this._isClient = Boolean(isClient)
	this._context = context
	
	// Store incoming data
	this._cache = new Buffer(0)
	
	// Store the last received and sent auto-increment ids
	this._lastReceivedID = 0
	this._lastSentID = 0
	
	// List of calls waiting for an answer
	// Each element is an array: [callInfo, callback, interval]
	this._calls = []
	
	// Set listeners for socket events
	this._socket.that = this
	this._socket.onmessage = this._onmessage
	this._socket.onclose = this._onclose
	
	// True if the connection has been closed
	this._closed = false
}

// Export and require everything
module.exports = Connection
var events = require("events")
var util = require("util")
var inflateData = require("./inflateData.js")
var Data = require("./Data.js")
var Exception = require("./Exception.js")
var deflateData = require("./deflateData.js")
util.inherits(Connection, events.EventEmitter)

// Returns if the connection has closed
Object.defineProperty(Connection.prototype, "closed", {get: function () {
	return this._closed
}})

// Send a call to the other side
// type is the call-type id (int)
// data is the argument data (optional, must match the format registered in the context)
// callback(err, data) is a callback (optional)
// timeout is the maximum time this endpoint will wait for a return/exception (optional, default: 60e3)
// Inside the callbacks, this will be the Connection object
Connection.prototype.call = function (name, data, callback, timeout) {
	var registeredCalls, meta, interval, call
	
	// Validates the data
	if (this._closed)
		throw new Error("The connection has already been closed")
	registeredCalls = this._isClient ? this._context._clientCalls : this._context._serverCalls
	call = registeredCalls[name]
	if (!call)
		throw new Error("Invalid call "+name)
	data = deflateData(data, call.args)
	
	// Creates the protocol meta-data
	data = data.toBuffer()
	meta = (new Data).addUint(call.id).addUint(++this._lastSentID).toBuffer()
	
	// Send the message
	this._socket.send(meta, data)
	
	// Set timeout
	timeout = timeout===undefined ? 60e3 : timeout
	if (timeout)
		interval = setTimeout(this._getTimeoutCallback(), timeout)
	
	// Save info about the sent call
	// [callData, callback, interval]
	this._calls[this._lastSentID] = [call, callback, interval]
}

// Close the connection (don't wait for more data)
Connection.prototype.close = function () {
	this._socket.close()
}

// Returns a callback to treat the timeout
Connection.prototype._getTimeoutCallback = function () {
	var that = this, id = this._lastSentID
	return function () {
		var call = that._calls[id]
		delete that._calls[id]
		if (call && call[1])
			call[1].call(that, new Exception("timeout", null), null)
	}
}

// Inform the connection has been closed (send "closed" exception to every pending call)
Connection.prototype._onclose = function () {
	var i, call, calls, that
	
	// Clear everything
	that = this.that
	calls = that._calls
	that._calls = {}
	that._closed = true
	that.emit("close")
	
	for (i in calls)
		// Foreach openned call, dispatch the error exception
		if (calls.hasOwnProperty(i)) {
			call = calls[i]
			if (call[2])
				clearTimeout(call[2])
			if (call[1])
				call[1].call(that, new Exception("closed", null), null)
		}
}

// Process the incoming message (a Buffer)
Connection.prototype._onmessage = function (message) {
	var type, callID, that = this.that
	
	// Extracts the message type and sequence id
	var state = {buffer: message, offset: 0}
	try {
		type = inflateData.readUint(state)
		callID = inflateData.readUint(state)
	} catch (e) {
		that._protocolError()
	}
	
	if (type)
		// A call from the other side
		that._processCall(callID, type, message.slice(state.offset))
	else {
		try {
			type = inflateData.readUint(state)
		} catch (e) {
			that._protocolError()
		}
		if (type)
			// An exception from the other side
			that._processException(callID, type, message.slice(state.offset))
		else
			// A return from the other side
			that._processReturn(callID, message.slice(state.offset))
	}
}

// Process an incoming call
Connection.prototype._processCall = function (callID, type, dataBuffer) {
	var that = this
	
	// Check the sequence ID
	if (callID != ++this._lastReceivedID) {
		this._protocolError()
		return
	}
	
	// Get call definition
	var callInfo = this._isClient ? this._context._serverCalls[type] : this._context._clientCalls[type]
	if (!callInfo) {
		this._protocolError()
		return
	}
	
	// Read the incoming data
	var args
	try {
		args = inflateData(dataBuffer, callInfo.args)
	} catch (e) {
		// Invalid format
		this._protocolError()
		return
	}
	
	// Create the answer callback
	// obj can be an Exception or a Data (or convertable to Data) in the call-return format
	// If the connection has already been closed, returns false (true otherwise)
	var answered = false
	var answer = function (obj) {
		var exceptionInfo
		if (answered)
			throw new Error("Answer already sent")
		if (that._closed)
			return false
		if (obj instanceof Exception) {
			exceptionInfo = that._context._exceptions[obj.name]
			if (!exceptionInfo)
				throw new Error("Invalid exception "+obj.name)
			that._sendAnswer(callID, exceptionInfo.id, deflateData(obj.data, exceptionInfo.args))
		} else
			that._sendAnswer(callID, 0, deflateData(obj, callInfo.outArgs))
		answered = true
		return true
	}
	
	if (!callInfo.callback)
		throw new Error("Callback for "+callInfo.name+" not registered")
	callInfo.callback.call(this, args, answer)
}

// Process a return
Connection.prototype._processReturn = function (callID, dataBuffer) {
	var callInfo, data
	
	callInfo = this._calls[callID]
	delete this._calls[callID]
	if (!callInfo) {
		// Received a timeouted (or invalid) answer
		this._protocolError()
		return
	}
	
	// Read the incoming data
	try {
		data = inflateData(dataBuffer, callInfo[0].outArgs)
	} catch (e) {
		// Invalid format
		this._protocolError()
		return
	}
	
	// Clear the timeout
	if (callInfo[2])
		clearTimeout(callInfo[2])
	
	// Call the callback
	if (callInfo[1])
		callInfo[1].call(this, null, data)
}

// Process a returned exception
Connection.prototype._processException = function (callID, type, dataBuffer) {
	var callInfo, args, exceptionInfo
	
	callInfo = this._calls[callID]
	delete this._calls[callID]
	if (!callInfo) {
		// Received a timeouted (or invalid) answer
		this._protocolError()
		return
	}
	
	// Get exception definition
	exceptionInfo = this._context._exceptions[type]
	if (!exceptionInfo) {
		this._protocolError()
		return
	}
	
	// Read the incoming data
	try {
		args = inflateData(dataBuffer, exceptionInfo.args)
	} catch (e) {
		// Invalid format
		this._protocolError()
		return
	}
	
	// Clear the timeout
	if (callInfo[2])
		clearTimeout(callInfo[2])
	
	// Call the callback
	if (callInfo[1])
		callInfo[1].call(this, new Exception(exceptionInfo.name, args), null)
}

// Treats a protocol error (close the connection)
Connection.prototype._protocolError = function () {
	this._socket.destroy()
}

// Sends an answer (return or exception)
Connection.prototype._sendAnswer = function (callID, exceptionType, data) {
	var meta
	
	// Creates the buffers
	data = data.toBuffer()
	meta = (new Data).addUint(0).addUint(callID).addUint(exceptionType).toBuffer()
	
	// Send the message
	this._socket.send(meta, data)
}
