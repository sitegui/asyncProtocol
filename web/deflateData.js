"use strict"

// Return the data in the given format
// obj is an object with the data to fit the given format
// format is an object created by expand.js
module.exports = function (obj, format) {
	var r = new Data
	fitInFormat(obj, format, r)
	return r
}

var Data = require("./Data.js")

function fitInFormat(obj, format, data) {
	var i, entry
	for (i=0; i<format.length; i++) {
		entry = format[i]
		if (!entry.array)
			fitInSimpleType(obj[entry.name], entry.type, data)
		else if (typeof entry.type === "string")
			fitInSimpleArray(obj[entry.name], entry.type, data)
		else
			fitInArray(obj[entry.name], entry.type, data)
	}
}

function fitInSimpleType(value, type, data) {
	if (type === "uint")
		data.addUint(value)
	else if (type === "int")
		data.addInt(value)
	else if (type === "float")
		data.addFloat(value)
	else if (type === "token")
		data.addToken(value)
	else if (type === "string")
		data.addString(value)
	else if (type === "Buffer")
		data.addBuffer(value)
	else
		data.addBoolean(value)
}

function fitInSimpleArray(value, type, data) {
	data.addUint(value.length)
	var i
	for (i=0; i<value.length; i++)
		fitInSimpleType(value[i], type, data)
}

function fitInArray(value, type, data) {
	data.addUint(value.length)
	var i
	for (i=0; i<value.length; i++)
		fitInFormat(value[i], type, data)
}
