"use strict"

// Creates a new token
// If base (a Token, 16-byte Buffer or hex encoded string) is given, copy its contents
// If not, creates a new pseudo-random token
function Token(base) {
	var i
	if (base)
		this._buffer = toTokenBuffer(base)
	else {
		this._buffer = new Uint8Array(16)
		for (i=0; i<16; i++)
			this._buffer[i] = Math.floor(256*Math.random())
	}
}

module.exports = Token

function toTokenBuffer(obj) {
	var buffer = new Uint8Array(16), i
	if (obj instanceof Uint8Array && obj.length === 16)
		buffer.set(obj)
	else if (obj instanceof Token)
		buffer.set(obj._buffer)
	else if (typeof obj === "string" && obj.match(/^[0-9a-fA-F]{32}$/))
		for (i=0; i<32; i+=2)
			buffer[i/2] = parseInt(obj.substr(i, 2), 16)
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
	var str = "", i, B
	for (i=0; i<16; i++) {
		B = this._buffer[i].toString(16)
		str += B.length==1 ? "0"+B : B
	}
	return str
}
