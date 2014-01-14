"use strict"

// Creates a new protocol exception, with the given name (string) and data
// data must match the format registered in the connection context
function Exception(name, data) {
	this.name = name
	this.data = data
}

module.exports = Exception
