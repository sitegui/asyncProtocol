// Creates a resizable Buffer with the given initial length
// length can be omitted, in this case 256 will be used
function DataBuffer(length) {
	this.buffer = new Buffer(length || 256) // allocated buffer
	this.length = 0 // number of used bytes
}

// Appends a byte (uint8 in a number) or a buffer (Buffer or DataBuffer) to this DataBuffer
// Automatically increase the internal buffer size if needed
DataBuffer.prototype.append = function (x) {
	if (typeof x == "number") {
		this._alloc(1)
		this.buffer.writeUInt8(x, this.length)
		this.length++
	} else if (x instanceof Buffer) {
		this._alloc(x.length)
		x.copy(this.buffer, this.length)
		this.length += x.length
	} else if (x instanceof DataBuffer) {
		this._alloc(x.length)
		x.buffer.copy(this.buffer, this.length, 0, x.length)
		this.length += x.length
	} else
		throw new TypeError("number, Buffer or DataBuffer expected")
}

// Makes sure there is enough free space to allocate the given amount of bytes
DataBuffer.prototype._alloc = function (amount) {
	var newBuffer
	if (this.length+amount > this.buffer.length) {
		newBuffer = new Buffer(this.buffer.length*2)
		this.buffer.copy(newBuffer, 0, 0, this.length)
		this.buffer = newBuffer
		this._alloc(amount)
	}
}

module.exports = DataBuffer
