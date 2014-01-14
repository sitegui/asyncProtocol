"use strict"

// Creates a new Data object to store encoded data in the protocol format
function Data() {
	this.buffer = new Buffer(128) // a resizable buffer
	this.length = 0 // number of used bytes
}

module.exports = Data

// Makes sure there is enough free space to allocate the given amount of bytes
Data.prototype.alloc = function (amount) {
	var newBuffer
	if (this.length+amount > this.buffer.length) {
		newBuffer = new Buffer(this.buffer.length*2)
		this.buffer.copy(newBuffer, 0, 0, this.length)
		this.buffer = newBuffer
		this.alloc(amount)
	}
}

// Appends a byte (uint8 in a number) to the internal buffer
// Automatically increase the internal buffer size if needed
Data.prototype.append = function (x) {
	if (typeof x === "number") {
		this.alloc(1)
		this.buffer.writeUInt8(x, this.length)
		this.length++
	} else if (x instanceof Buffer) {
		this.alloc(x.length)
		x.copy(this.buffer, this.length)
		this.length += x.length
	} else
		throw new TypeError("number or Buffer expected")
}

// Appends a unsigned integer to the data
Data.prototype.addUint = function (u) {
	// Validates the input
	if (Math.round(u) != u || u > Data.MAX_DOUBLE_INT || u < 0)
		throw new TypeError("Unsigned integer expected")
	
	// First byte
	if (u <= Data.MAX_UINT_1_B) {
		this.append(Data.OFFSET_1_B+(u&Data.MASK_7_B))
		u = 0
	} else if (u <= Data.MAX_UINT_2_B) {
		this.append(Data.OFFSET_2_B+(u&Data.MASK_6_B))
		u >>= 6
	} else if (u <= Data.MAX_UINT_3_B) {
		this.append(Data.OFFSET_3_B+(u&Data.MASK_5_B))
		u >>= 5
	} else if (u <= Data.MAX_UINT_4_B) {
		this.append(Data.OFFSET_4_B+(u&Data.MASK_4_B))
		u >>= 4
	} else if (u <= Data.MAX_UINT_5_B) {
		this.append(Data.OFFSET_5_B+(u>Data.MAX_INT ? u%_POWS2[3] : u&Data.MASK_3_B))
		u = u>Data.MAX_INT ? Math.floor(u/8) : u>>3
	} else if (u <= Data.MAX_UINT_6_B) {
		this.append(Data.OFFSET_6_B+(u%_POWS2[2]))
		u = Math.floor(u/4)
	} else if (u <= Data.MAX_UINT_7_B) {
		this.append(Data.OFFSET_7_B+(u%_POWS2[1]))
		u = Math.floor(u/2)
	} else {
		this.append(Data.OFFSET_8_B)
	}
	
	// Other bytes
	while (u) {
		this.append(u>Data.MAX_INT ? u%_POWS2[8] : u&Data.MASK_8_B)
		u = u>Data.MAX_INT ? Math.floor(u/256) : u>>8
	}
	
	return this
}

// Appends a signed integer to the data
Data.prototype.addInt = function (i) {
	var length
	
	// Validates the input
	if (Math.round(i) != i || Math.abs(i) >= -Data.MIN_INT_7_B)
		throw new TypeError("Signed integer expected")
	
	// First byte
	if (i >= Data.MIN_INT_1_B && i < -Data.MIN_INT_1_B) {
		i -= Data.MIN_INT_1_B
		this.append(Data.OFFSET_1_B+(i&Data.MASK_7_B))
		i = 0
		length = 0
	} else if (i >= Data.MIN_INT_2_B && i < -Data.MIN_INT_2_B) {
		i -= Data.MIN_INT_2_B
		this.append(Data.OFFSET_2_B+(i&Data.MASK_6_B))
		i >>= 6
		length = 1
	} else if (i >= Data.MIN_INT_3_B && i < -Data.MIN_INT_3_B) {
		i -= Data.MIN_INT_3_B
		this.append(Data.OFFSET_3_B+(i&Data.MASK_5_B))
		i >>= 5
		length = 2
	} else if (i >= Data.MIN_INT_4_B && i < -Data.MIN_INT_4_B) {
		i -= Data.MIN_INT_4_B
		this.append(Data.OFFSET_4_B+(i&Data.MASK_4_B))
		i >>= 4
		length = 3
	} else if (i >= Data.MIN_INT_5_B && i < -Data.MIN_INT_5_B) {
		i -= Data.MIN_INT_5_B
		this.append(Data.OFFSET_5_B+(i > Data.MAX_INT ? i%_POWS2[3] : i&Data.MASK_3_B))
		i = i > Data.MAX_INT ? Math.floor(i/8) : i>>3
		length = 4
	} else if (i >= Data.MIN_INT_6_B && i < -Data.MIN_INT_6_B) {
		i -= Data.MIN_INT_6_B
		this.append(Data.OFFSET_6_B+(i%_POWS2[2]))
		i = Math.floor(i/4)
		length = 5
	} else {
		i -= Data.MIN_INT_7_B
		this.append(Data.OFFSET_7_B+(i%_POWS2[1]))
		i = Math.floor(i/2)
		length = 6
	}
	
	// Other bytes
	while (length--) {
		this.append(i>Data.MAX_INT ? i%_POWS2[8] : i&Data.MASK_8_B)
		i = i>Data.MAX_INT ? Math.floor(i/256) : i>>8
	}
	
	return this
}

// Appends a float to the data
Data.prototype.addFloat = function (f) {
	this.alloc(4)
	this.buffer.writeFloatLE(f, this.length)
	this.length += 4
	return this
}

// Appends a Token to the data
Data.prototype.addToken = function (t) {
	this.append(t.buffer)
	return this
}

// Appends a string to the data
Data.prototype.addString = function (s) {
	var length = Buffer.byteLength(s)
	this.addUint(length)
	this.alloc(length)
	this.buffer.write(s, this.length, length)
	this.length += length
	return this
}

// Appends a Buffer to the data
Data.prototype.addBuffer = function (B) {
	this.addUint(B.length)
	this.append(B)
	return this
}

// Appends a boolean to the data
Data.prototype.addBoolean = function (b) {
	this.append(b ? 1 : 0)
	return this
}

// Returns a Buffer with all the data stored
Data.prototype.toBuffer = function () {
	return this.buffer.slice(0, this.length)
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

// Pre-calculated constants
Data.MAX_DOUBLE_INT = _POWS2[53]-1
Data.MAX_INT = _POWS2[31]-1
Data.MAX_UINT_1_B = _POWS2[7]-1
Data.MAX_UINT_2_B = _POWS2[14]-1
Data.MAX_UINT_3_B = _POWS2[21]-1
Data.MAX_UINT_4_B = _POWS2[28]-1
Data.MAX_UINT_5_B = _POWS2[35]-1
Data.MAX_UINT_6_B = _POWS2[42]-1
Data.MAX_UINT_7_B = _POWS2[49]-1
Data.MIN_INT_1_B = -_POWS2[6]
Data.MIN_INT_2_B = -_POWS2[13]
Data.MIN_INT_3_B = -_POWS2[20]
Data.MIN_INT_4_B = -_POWS2[27]
Data.MIN_INT_5_B = -_POWS2[34]
Data.MIN_INT_6_B = -_POWS2[41]
Data.MIN_INT_7_B = -_POWS2[48]
Data.OFFSET_1_B = 0
Data.OFFSET_2_B = _POWS2[7]
Data.OFFSET_3_B = _POWS2[7]+_POWS2[6]
Data.OFFSET_4_B = _POWS2[7]+_POWS2[6]+_POWS2[5]
Data.OFFSET_5_B = _POWS2[7]+_POWS2[6]+_POWS2[5]+_POWS2[4]
Data.OFFSET_6_B = _POWS2[7]+_POWS2[6]+_POWS2[5]+_POWS2[4]+_POWS2[3]
Data.OFFSET_7_B = _POWS2[7]+_POWS2[6]+_POWS2[5]+_POWS2[4]+_POWS2[3]+_POWS2[2]
Data.OFFSET_8_B = _POWS2[7]+_POWS2[6]+_POWS2[5]+_POWS2[4]+_POWS2[3]+_POWS2[2]+_POWS2[1]
Data.MASK_1_B = _POWS2[0]
Data.MASK_2_B = _POWS2[0]+_POWS2[1]
Data.MASK_3_B = _POWS2[0]+_POWS2[1]+_POWS2[2]
Data.MASK_4_B = _POWS2[0]+_POWS2[1]+_POWS2[2]+_POWS2[3]
Data.MASK_5_B = _POWS2[0]+_POWS2[1]+_POWS2[2]+_POWS2[3]+_POWS2[4]
Data.MASK_6_B = _POWS2[0]+_POWS2[1]+_POWS2[2]+_POWS2[3]+_POWS2[4]+_POWS2[5]
Data.MASK_7_B = _POWS2[0]+_POWS2[1]+_POWS2[2]+_POWS2[3]+_POWS2[4]+_POWS2[5]+_POWS2[6]
Data.MASK_8_B = _POWS2[0]+_POWS2[1]+_POWS2[2]+_POWS2[3]+_POWS2[4]+_POWS2[5]+_POWS2[6]+_POWS2[7]
