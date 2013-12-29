"use strict"

// Creates a new token
// If base (a Token or Buffer) is given, copy its contents
// If not, creates a new random token
function Token(base) {
	var i
	this.buffer = new Buffer(16)
	if (base)
		if (base instanceof Buffer && base.length == 16)
			base.copy(this.buffer)
		else if (base instanceof Token)
			base.buffer.copy(this.buffer)
		else
			throw new TypeError("Invalid base argument for new Token")
	else 
		for (i=0; i<16; i++)
			this.buffer[i] = Math.floor(256*Math.random())
}

module.exports = Token

// Returns true if both token are equal to the given token
Token.prototype.isEqual = function (token) {
	var i
	for (i=0; i<16; i++)
		if (this.buffer[i] != token.buffer[i])
			return false
	return true
}
