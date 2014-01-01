"use strict"

// Wrap a given socket connection with the asyncProtocol
// isClient is a bool that indicates if this is the client-side (true) or server-side (false)
// Events: call(type, data, answer), close()
function Connection(socket, isClient) {
	// Store the underlying socket
	this.socket = socket
	this.isClient = Boolean(isClient)
	
	// Store incoming data
	this._cache = new Buffer(0)
	
	// Store the last received and sent auto-increment ids
	this._lastReceivedID = 0
	this._lastSentID = 0
	
	// List of calls waiting for an answer
	// Each element is an array: [callInfo, onreturn, onexception, interval]
	this._calls = []
	
	// Set listeners for socket events
	this.socket.that = this
	this.socket.on("readable", this._onreadable)
	this.socket.on("error", this._onerror)
	this.socket.on("close", this._onclose)
	
	// True if the connection has been closed
	this._closed = false
}

// Export and require everything
module.exports = Connection
var events = require("events")
var util = require("util")
var inflateData = require("./inflateData.js")
var inflateFormat = require("./inflateFormat.js")
var Data = require("./Data.js")
var Exception = require("./Exception.js")
util.inherits(Connection, events.EventEmitter)

// Register a new type of call that the server can make
Connection.registerServerCall = function (id, argsFormat, returnFormat, exceptions) {
	if (Math.round(id) != id || id < 1)
		throw new TypeError("id must be a non-zero unsigned integer")
	if (id in Connection._registeredServerCalls)
		throw new Error("Unable to register server call "+id+", it has already been registered")
	exceptions = exceptions || []
	Connection._registeredServerCalls[id] = [inflateFormat(argsFormat), inflateFormat(returnFormat), exceptions]
	return id
}

// Register a new type of call that clients can make
Connection.registerClientCall = function (id, argsFormat, returnFormat, exceptions) {
	if (Math.round(id) != id || id < 1)
		throw new TypeError("id must be a non-zero unsigned integer")
	if (id in Connection._registeredClientCalls)
		throw new Error("Unable to register client call "+id+", it has already been registered")
	exceptions = exceptions || []
	Connection._registeredClientCalls[id] = [inflateFormat(argsFormat), inflateFormat(returnFormat), exceptions]
	return id
}

// Register a new type of exception
Connection.registerException = function (id, dataFormat) {
	if (Math.round(id) != id || id < 1)
		throw new TypeError("id must be a non-zero unsigned integer")
	if (id in Connection._registeredExceptions)
		throw new Error("Unable to register exception "+id+", it has already been registered")
	Connection._registeredExceptions[id] = inflateFormat(dataFormat)
	return id
}

// Returns if the connection has closed
Object.defineProperty(Connection.prototype, "closed", {get: function () {
	return this._closed
}})

// Send a call to the other side
// type is the call-type id (int)
// data is the argument data (optional, must be a Data, DataArray or string. Must match the format registered with Connection.registerServerCall or Connection.registerClientCall)
// onreturn(data) is a callback (optional)
// onexception(type, data) is a callback (optional)
// timeout is the maximum time this endpoint will wait for a return/exception (optional, default: 60e3)
// Inside the callbacks, this will be the Connection object
Connection.prototype.sendCall = function (type, data, onreturn, onexception, timeout) {
	var registeredCalls, meta, length, interval, call
	
	// Validates the data
	if (this._closed)
		throw new Error("The connection has already been closed")
	registeredCalls = this.isClient ? Connection._registeredClientCalls : Connection._registeredServerCalls
	call = registeredCalls[type]
	if (!call)
		throw new Error("Invalid call type "+type)
	data = Data.toData(data)
	if (data.format != call[0].formatString)
		throw new Error("Invalid data type '"+data.format+"' for call "+type)
	
	// Creates the protocol meta-data
	data = data.toBuffer()
	meta = (new Data).addUint(type).addUint(++this._lastSentID).toBuffer()
	length = (new Data).addUint(meta.length+data.length).toBuffer()
	
	// Send the message
	this.socket.write(length)
	this.socket.write(meta)
	this.socket.write(data)
	
	// Set timeout
	timeout = timeout===undefined ? 60e3 : timeout
	if (timeout)
		interval = setTimeout(this._getTimeoutCallback(), timeout)
	
	// Save info about the sent call
	// [expectedReturnFormat, onreturn, onexception, interval]
	this._calls[this._lastSentID] = [call, onreturn, onexception, interval]
}

// Close the connection (don't wait for more data)
Connection.prototype.close = function () {
	this.socket.destroy()
}

// Registered calls
// Each element is an array: [inflatedArgsFormat, inflatedReturnFormat, exceptions]
Connection._registeredServerCalls = {}
Connection._registeredClientCalls = {}

// Registered exceptions
// Each element is an inflated format object
Connection._registeredExceptions = {}

// Returns a callback to treat the timeout
Connection.prototype._getTimeoutCallback = function () {
	var that = this, id = this._lastSentID
	return function () {
		var call = that._calls[id]
		delete that._calls[id]
		if (call) {
			if (call[3])
				clearTimeout(call[3])
			if (call[2])
				call[2].call(that, 0, null)
		}
	}
}

// Fetch more data and try to extract a message
Connection.prototype._onreadable = function () {
	var buffer, byteLength, offset, message, that
	
	// Store the data
	that = this.that
	buffer = that.socket.read()
	if (!buffer)
		return
	that._cache = Buffer.concat([that._cache, buffer], that._cache.length+buffer.length)
	
	// Try to read messages
	while (true) {
		byteLength = []
		try {
			offset = inflateData.readUint(that._cache, 0, byteLength)
		} catch (e) {
			// We need to wait for more data
			if (!(e instanceof RangeError))
				that._protocolError()
			break
		}
		byteLength = byteLength[0]
		if (that._cache.length >= offset+byteLength) {
			message = that._cache.slice(offset, offset+byteLength)
			that._cache = that._cache.slice(offset+byteLength)
			that._processMessage(message)
		} else
			break
	}
}

// Let the connection be closed
Connection.prototype._onerror = function () {}

// Inform the connection has been closed (send -1 exception to every pending call)
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
			if (call[3])
				clearTimeout(call[3])
			if (call[2])
				call[2].call(that, -1, null)
		}
}

// Process the incoming message (a Buffer)
Connection.prototype._processMessage = function (message) {
	var aux, type, callID, offset
	
	// Extracts the message type and sequence id
	try {
		aux = []
		offset = inflateData.readUint(message, 0, aux)
		offset = inflateData.readUint(message, offset, aux)
		type = aux[0]
		callID = aux[1]
	} catch (e) {
		this._protocolError()
	}
	
	if (type)
		// A call from the other side
		this._processCall(callID, type, message.slice(offset))
	else {
		try {
			offset = inflateData.readUint(message, offset, aux)
			type = aux[2]
		} catch (e) {
			this._protocolError()
		}
		if (type)
			// An exception from the other side
			this._processException(callID, type, message.slice(offset))
		else
			// A return from the other side
			this._processReturn(callID, message.slice(offset))
	}
}

// Process an incoming call
Connection.prototype._processCall = function (callID, type, dataBuffer) {
	var call, data, answer, answered, that = this
	
	// Check the sequence ID
	if (callID != ++this._lastReceivedID) {
		this._protocolError()
		return
	}
	
	// Get call definition
	call = this.isClient ? Connection._registeredServerCalls[type] : Connection._registeredClientCalls[type]
	if (!call) {
		this._protocolError()
		return
	}
	
	// Read the incoming data
	try {
		data = inflateData(dataBuffer, call[0])
	} catch (e) {
		// Invalid format
		this._protocolError()
		return
	}
	
	// Create the answer callback
	// obj can be an Exception or a Data (or convertable to Data) in the call-return format
	// If the connection has already been closed, returns false (true otherwise)
	answered = false
	answer = function (obj) {
		var data
		if (answered)
			throw new Error("Answer already sent")
		if (that._closed)
			return false
		if (obj instanceof Exception) {
			if (call[2].indexOf(obj.type) == -1)
				throw new Error("Invalid exception "+obj.type+" to call "+type)
			that._sendAnswer(callID, obj.type, obj.data)
		} else {
			data = Data.toData(obj)
			if (data.format != call[1].formatString)
				throw new Error("Invalid data type '"+data.format+"' for return "+type)
			that._sendAnswer(callID, 0, data)
		}
		answer = true
		return true
	}
	
	// Emmits the "call" event
	this.emit("call", type, data, answer)
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
		data = inflateData(dataBuffer, callInfo[0][1])
	} catch (e) {
		// Invalid format
		this._protocolError()
		return
	}
	
	// Clear the timeout
	if (callInfo[3])
		clearTimeout(callInfo[3])
	
	// Call the callback
	if (callInfo[1])
		callInfo[1].call(this, data)
}

// Process a returned exception
Connection.prototype._processException = function (callID, type, dataBuffer) {
	var callInfo, data, format
	
	callInfo = this._calls[callID]
	delete this._calls[callID]
	if (!callInfo) {
		// Received a timeouted (or invalid) answer
		this._protocolError()
		return
	}
	if (callInfo[0][2].indexOf(type) == -1) {
		// Received an invalid exception type
		this._protocolError()
		return
	}
	
	// Get exception definition
	format = Connection._registeredExceptions[type]
	if (!format) {
		this._protocolError()
		return
	}
	
	// Read the incoming data
	try {
		data = inflateData(dataBuffer, format)
	} catch (e) {
		// Invalid format
		this._protocolError()
		return
	}
	
	// Clear the timeout
	if (callInfo[3])
		clearTimeout(callInfo[3])
	
	// Call the callback
	if (callInfo[2])
		callInfo[2].call(this, type, data)
}

// Treats a protocol error (close the connection)
Connection.prototype._protocolError = function () {
	this.socket.end()
}

// Sends an answer (return or exception)
Connection.prototype._sendAnswer = function (callID, exceptionType, data) {
	var meta, length
	
	// Creates the buffers
	data = data.toBuffer()
	meta = (new Data).addUint(0).addUint(callID).addUint(exceptionType).toBuffer()
	length = (new Data).addUint(meta.length+data.length).toBuffer()
	
	// Send the message
	this.socket.write(length)
	this.socket.write(meta)
	this.socket.write(data)
}
