"use strict"

// Creates a new token
// If base (a Token, 16-byte Buffer or hex encoded string) is given, copy its contents
// If not, creates a new pseudo-random token
function Token(base) {
	var i
	if (base)
		this._buffer = toTokenBuffer(base)
	else {
		this._buffer = new Buffer(16)
		for (i=0; i<16; i++)
			this._buffer[i] = Math.floor(256*Math.random())
	}
}

module.exports = Token

function toTokenBuffer(obj) {
	var buffer = new Buffer(16)
	if (obj instanceof Buffer && obj.length === 16)
		obj.copy(buffer)
	else if (obj instanceof Token)
		obj._buffer.copy(buffer)
	else if (typeof obj === "string" && obj.match(/^[0-9a-fA-F]{32}$/))
		buffer.write(obj, 0, 16, "hex")
	else
		throw new TypeError("Invalid base argument for new Token")
	return buffer
}

// Returns true if both token are equal to the given token
// token can be a any value accept to create a new token
Token.prototype.isEqual = function (obj) {
	var buffer = toTokenBuffer(obj), i
	for (i=0; i<16; i++)
		if (this._buffer[i] != buffer[i])
			return false
	return true
}

// Return the hex encoded token
Token.prototype.toString = function () {
	return this._buffer.toString("hex")
}
