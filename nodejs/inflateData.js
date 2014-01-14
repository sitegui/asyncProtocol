"use strict"

// Inflates a given data based on its format
// buffer is a Buffer
// format is an object created by expand module
// Returns an object or throws in case of error
function inflateData(buffer, format) {
	var state = {buffer: buffer, offset: 0}
	var data = inflateData.readElement(state, format)
	if (state.offset != buffer.length)
		throw new Error("Unable to read data in the given format")
	return data
}

module.exports = inflateData
var Data = require("./Data.js")
var Token = require("./Token.js")

// Extract a unsigned integer from the buffer (a Buffer) from the position offset
// state is an object with keys "buffer" and "offset". "offset" will be updated
// Throw in case of error
inflateData.readUint = function (state) {
	var firstByte, u, length, i, shifts
	
	// Get the first byte
	if (state.offset >= state.buffer.length)
		throw new RangeError("Unable to extract unsigned integer from index "+state.offset)
	firstByte = state.buffer[state.offset]
	
	// Get the total length and the first bits
	if (firstByte < Data.OFFSET_2_B) {
		// Fast path
		state.offset++
		return firstByte
	} else if (firstByte < Data.OFFSET_3_B) {
		length = 1
		u = firstByte&Data.MASK_6_B
	} else if (firstByte < Data.OFFSET_4_B) {
		length = 2
		u = firstByte&Data.MASK_5_B
	} else if (firstByte < Data.OFFSET_5_B) {
		length = 3
		u = firstByte&Data.MASK_4_B
	} else if (firstByte < Data.OFFSET_6_B) {
		length = 4
		u = firstByte&Data.MASK_3_B
	} else if (firstByte < Data.OFFSET_7_B) {
		length = 5
		u = firstByte&Data.MASK_2_B
	} else if (firstByte < Data.OFFSET_8_B) {
		length = 6
		u = firstByte&Data.MASK_1_B
	} else if (firstByte == Data.OFFSET_8_B) {
		length = 7
		u = 0
	} else
		throw new Error("Unable to extract unsigned integer from index "+state.offset)
	
	// Get the remaining bytes
	if (state.offset+length >= state.buffer.length)
		throw new RangeError("Unable to extract unsigned integer from index "+state.offset)
	shifts = 7-length
	for (i=1; i<=length; i++) {
		u += (shifts < 24) ? (state.buffer[state.offset+i] << shifts) : (state.buffer[state.offset+i] * _POWS2[shifts])
		shifts += 8
	}
	
	state.offset += 1+length
	return u
}

// Extract a signed integer from the buffer (a Buffer) from the position offset
// state is an object with keys "buffer" and "offset". "offset" will be updated
// Throw in case of error
inflateData.readInt = function (state) {
	var firstByte, i, length, j, shifts
	
	// Get the first byte
	if (state.offset >= state.buffer.length)
		throw new Error("Unable to extract signed integer from index "+state.offset)
	firstByte = state.buffer[state.offset]
	
	// Get the total length and the first bits
	if (firstByte < Data.OFFSET_2_B) {
		// Fast path
		state.offset++
		return firstByte+Data.MIN_INT_1_B
	} else if (firstByte < Data.OFFSET_3_B) {
		length = 1
		i = (firstByte&Data.MASK_6_B)+Data.MIN_INT_2_B
	} else if (firstByte < Data.OFFSET_4_B) {
		length = 2
		i = (firstByte&Data.MASK_5_B)+Data.MIN_INT_3_B
	} else if (firstByte < Data.OFFSET_5_B) {
		length = 3
		i = (firstByte&Data.MASK_4_B)+Data.MIN_INT_4_B
	} else if (firstByte < Data.OFFSET_6_B) {
		length = 4
		i = (firstByte&Data.MASK_3_B)+Data.MIN_INT_5_B
	} else if (firstByte < Data.OFFSET_7_B) {
		length = 5
		i = (firstByte&Data.MASK_2_B)+Data.MIN_INT_6_B
	} else if (firstByte < Data.OFFSET_8_B) {
		length = 6
		i = (firstByte&Data.MASK_1_B)+Data.MIN_INT_7_B
	} else
		throw new Error("Unable to extract signed integer from index "+state.offset)
	
	// Get the remaining bytes
	if (state.offset+length >= state.buffer.length)
		throw new Error("Unable to extract signed integer from index "+state.offset)
	shifts = 7-length
	for (j=1; j<=length; j++) {
		i += (shifts < 24) ? (state.buffer[state.offset+j] << shifts) : (state.buffer[state.offset+j] * _POWS2[shifts])
		shifts += 8
	}
	
	state.offset += 1+length
	return i
}

// Extract a float from the buffer (a Buffer) from the position offset
// state is an object with keys "buffer" and "offset". "offset" will be updated
// Throw in case of error
inflateData.readFloat = function (state) {
	if (state.offset+4 > state.buffer.length)
		throw new Error("Unable to extract float from index "+state.offset)
	
	var r = state.buffer.readFloatLE(state.offset)
	state.offset += 4
	return r
}

// Extract a Token from the buffer (a Buffer) from the position offset
// state is an object with keys "buffer" and "offset". "offset" will be updated
// Throw in case of error
inflateData.readToken = function (state) {
	if (state.offset+16 > state.buffer.length)
		throw new Error("Unable to extract token from index "+state.offset)
	
	var r = new Token(state.buffer.slice(state.offset, state.offset+16))
	state.offset += 16
	return r
}

// Extract a string from the buffer (a Buffer) from the position offset
// state is an object with keys "buffer" and "offset". "offset" will be updated
// Throw in case of error
inflateData.readString = function (state) {
	// Gets the string length
	var length = inflateData.readUint(state)
	
	if (state.offset+length > state.buffer.length)
		throw new Error("Unable to extract string from index "+state.offset)
	
	var r = state.buffer.toString("utf8", state.offset, state.offset+length)
	state.offset += length
	return r
}

// Extract a Buffer from the buffer (a Buffer) from the position offset
// state is an object with keys "buffer" and "offset". "offset" will be updated
// Throw in case of error
inflateData.readBuffer = function (state) {
	// Gets the buffer length
	var length = inflateData.readUint(state)
	
	if (state.offset+length > state.buffer.length)
		throw new Error("Unable to extract Buffer from index "+state.offset)
	
	var r = state.buffer.slice(state.offset, state.offset+length)
	state.offset += length
	return r
}

// Extract a Buffer from the buffer (a Buffer) from the position offset
// state is an object with keys "buffer" and "offset". "offset" will be updated
// Throw in case of error
inflateData.readBoolean = function (state) {
	var byte
	
	if (state.offset+1 > state.buffer.length)
		throw new Error("Unable to extract boolean from index "+state.offset)
	
	byte = state.buffer[state.offset]
	
	if (byte != 0 && byte != 1)
		throw new Error("Unable to extract boolean from index "+state.offset)
	
	state.offset++
	return Boolean(byte)
}

// Extract a simple element from the buffer
// type is one of "uint", "int", "float", "string", "token", "Buffer" or "boolean"
inflateData.readSimpleElement = function (state, type) {
	if (type === "uint")
		return inflateData.readUint(state)
	else if (type === "int")
		return inflateData.readInt(state)
	else if (type === "float")
		return inflateData.readFloat(state)
	else if (type === "token")
		return inflateData.readToken(state)
	else if (type === "string")
		return inflateData.readString(state)
	else if (type === "Buffer")
		return inflateData.readBuffer(state)
	else
		return inflateData.readBoolean(state)
}

// Extract a simple array, in which every element has the same simple type
// type is one of "uint", "int", "float", "string", "token", "Buffer" or "boolean"
inflateData.readSimpleArray = function (state, type) {
	var length = inflateData.readUint(state)
	var array = [], i
	
	// Extract all elements
	for (i=0; i<length; i++)
		array.push(inflateData.readSimpleElement(state, type))
	
	return array
}

// Extract an element from the buffer (a Buffer) from the position offset
// state is an object with keys "buffer" and "offset". "offset" will be updated
// Throw in case of error
// format is a args expanded format
inflateData.readArray = function (state, format) {
	var length = inflateData.readUint(state)
	var array = [], i
	
	// Extract all elements
	for (i=0; i<length; i++)
		array.push(inflateData.readElement(state, format))
	
	return array
}

// Extract an element from the buffer (a Buffer) from the position offset
// state is an object with keys "buffer" and "offset". "offset" will be updated
// Throw in case of error
// format is a args expanded format
inflateData.readElement = function (state, format) {
	var data = Object.create(null)
	var i, entry
	for (i=0; i<format.length; i++) {
		entry = format[i]
		if (!entry.array)
			data[entry.name] = inflateData.readSimpleElement(state, entry.type)
		else if (typeof entry.type === "string")
			data[entry.name] = inflateData.readSimpleArray(state, entry.type)
		else
			data[entry.name] = inflateData.readArray(state, entry.type)
	}
	return data
}

// Stores 2^i from i=0 to i=56
var _POWS2 = (function () {
	var r = [], i, n = 1
	for (i=0; i<=56; i++) {
		r.push(n)
		n *= 2
	}
	return r
})()
