// Creates a new DataArray with the given format for each element
function DataArray(format) {
	this.buffer = new DataBuffer
	this.format = format
	this.length = 0 // number of elements
}

// Appends a new data element to the array
DataArray.prototype.addData = function (data) {
	if (data.format != this.format)
		throw new TypeError("Data element must match the DataArray format: '"+data.format+"' was given, '"+this.format+"' was expected")
	this.buffer.append(data.buffer)
	this.length++
	return this
}
