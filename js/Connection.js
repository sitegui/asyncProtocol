// Wrap a given WebSocket connection with the asyncProtocol
// Events: error(err), call(type, data, answer), close()
function Connection(webSocket) {
	// Store the underlying webSocket
	this.webSocket = webSocket
	
	// Store the last received and sent auto-increment ids
	this._lastReceivedID = 0
	this._lastSentID = 0
	
	// List of calls waiting for an answer
	this._calls = []
	
	// Set listeners for webSocket events
	this.webSocket.that = this
	this.webSocket.onclose = this._onclose
	this.webSocket.onerror = this._onerror
	this.webSocket.onmessage = this._processMessage
}

// Register a new type of call that the server can make
Connection.registerServerCall = function (id, argsFormat, returnFormat) {
	if (Math.round(id) != id || id < 1)
		throw new TypeError("id must be a non-zero unsigned integer")
	if (id in Connection._registeredServerCalls)
		throw new Error("Unable to register server call "+id+", it has already been registered")
	Connection._registeredServerCalls[id] = [inflateFormat(argsFormat), inflateFormat(returnFormat)]
	return id
}

// Register a new type of call that clients can make
Connection.registerClientCall = function (id, argsFormat, returnFormat) {
	if (Math.round(id) != id || id < 1)
		throw new TypeError("id must be a non-zero unsigned integer")
	if (id in Connection._registeredClientCalls)
		throw new Error("Unable to register client call "+id+", it has already been registered")
	Connection._registeredClientCalls[id] = [inflateFormat(argsFormat), inflateFormat(returnFormat)]
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

// Send a call to the other side
// type is the call-type id (int)
// data is the argument data (optional, must be a Data, DataArray or string. Must match the format registered with Connection.registerClientCall)
// onreturn(data) is a callback (optional)
// onexception(type, data) is a callback (optional)
// timeout is the maximum time this endpoint will wait for a return/exception (optional, default: 60e3)
// Inside the callbacks, this will be the Connection object
Connection.prototype.sendCall = function (type, data, onreturn, onexception, timeout) {
	var meta, length, interval, call
	
	// Validates the data
	call = Connection._registeredClientCalls[type]
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
	this.webSocket.send(new Uint8Array([length, meta, data]).buffer)
	
	// Set timeout
	timeout = timeout===undefined ? 60e3 : timeout
	if (timeout)
		interval = setTimeout(this._getTimeoutCallback(), timeout)
	
	// Save info about the sent call
	// [expectedReturnFormat, onreturn, onexception, interval]
	this._calls[this._lastSentID] = [call[1], onreturn, onexception, interval]
}

// Close the connection
Connection.prototype.close = function () {
	this.webSocket.close()
}

// Registered calls
Connection._registeredServerCalls = {}
Connection._registeredClientCalls = {}
Connection._registeredExceptions = {}

// Returns a callback to treat the timeout
Connection.prototype._getTimeoutCallback = function () {
	var that = this, id = this._lastSentID
	return function () {
		call = that._calls[id]
		if (call) {
			if (call[3])
				clearInterval(call[3])
			if (call[2])
				call[2].call(that, 0, null)
			delete that._calls[id]
		}
	}
}

// Let the connection be closed
Connection.prototype._onerror = function (err) {
}

// Inform the connection has been closed (send -1 exception to every pending call)
Connection.prototype._onclose = function () {
	var i, call, that
	that = this.that
	that.emit("close")
	for (i in that._calls)
		// Foreach openned call, dispatch the error exception
		if (that._calls.hasOwnProperty(i)) {
			call = that._calls[i]
			if (call[3])
				clearInterval(call[3])
			if (call[2])
				call[2].call(that, -1, null)
		}
	
	// Clear everything
	that._calls = {}
}

// Process the incoming message (a MessageEvent)
Connection.prototype._processMessage = function (message) {
	var aux, type, callID, offset
	
	// Extracts the message type and sequence id
	message = new Uint8Array(message.data)
	try {
		aux = []
		offset = inflateData.readUint(message, 0, aux)
		offset = inflateData.readUint(message, offset, aux)
		type = aux[0]
		callID = aux[1]
	
		if (type)
			// A call from the other side
			this._processCall(callID, type, message.subarray(offset))
		else {
			offset = inflateData.readUint(message, offset, aux)
			type = aux[2]
			if (type)
				// An exception from the other side
				this._processException(callID, type, message.subarray(offset))
			else
				// A return from the other side
				this._processReturn(callID, message.subarray(offset))
		}
	} catch (e) {
		this._protocolError()
	}
}

// Process an incoming call
Connection.prototype._processCall = function (callID, type, dataBuffer) {
	var call, data, answer, answered, that = this
	
	// Get call definition
	call = Connection._registeredServerCalls[type]
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
	answered = false
	answer = function (obj) {
		var data
		if (answered)
			throw new Error("Answer already sent")
		if (obj instanceof Exception)
			that._sendAnswer(callID, obj.type, obj.data)
		else {
			data = Data.toData(obj)
			if (data.format != call[1].formatString)
				throw new Error("Invalid data type '"+data.format+"' for return "+type)
			that._sendAnswer(callID, 0, data)
		}
		answered = true
	}
	
	// Emmits the "call" event
	this.emit("call", type, data, answer)
}

// Process a return
Connection.prototype._processReturn = function (callID, dataBuffer) {
	var callInfo, data
	
	callInfo = this._calls[callID]
	if (!callInfo) {
		// Received a timeouted (or invalid) answer
		this._protocolError()
		return
	}
	
	// Read the incoming data
	try {
		data = inflateData(dataBuffer, callInfo[0])
	} catch (e) {
		// Invalid format
		this._protocolError()
		return
	}
	
	// Clear the timeout
	if (callInfo[3])
		clearInterval(callInfo[3])
	
	// Call the callback
	if (callInfo[1])
		callInfo[1].call(this, data)
	delete this._calls[callID]
}

// Process a returned exception
Connection.prototype._processException = function (callID, type, dataBuffer) {
	var callInfo, data, format
	
	callInfo = this._calls[callID]
	if (!callInfo) {
		// Received a timeouted (or invalid) answer
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
		clearInterval(callInfo[3])
	
	// Call the callback
	if (callInfo[2])
		callInfo[2].call(this, type, data)
	delete this._calls[callID]
}

// Treats a protocol error (close the connection)
Connection.prototype._protocolError = function () {
	this.webSocket.close(1002)
}

// Sends an answer (return or exception)
Connection.prototype._sendAnswer = function (callID, exceptionType, data) {
	var meta, length
	
	// Creates the buffers
	data = data.toBuffer()
	meta = (new Data).addUint(0).addUint(callID).addUint(exceptionType).toBuffer()
	length = (new Data).addUint(meta.length+data.length).toBuffer()
	
	// Send the message
	this.webSocket.send(new Uint8Array([length, meta, data]).buffer)
}