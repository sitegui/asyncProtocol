// Creates a new protocol exception, with the given type (int) e data
// data (optional) must be a Data, DataArray or string
// data must match the format registered with Connection.registerException
function Exception(type, data) {
	var format
	
	// Validates the data format
	data = Data.toData(data)
	format = Connection._registeredExceptions[type]
	if (!format)
		throw new Error("Invalid exception type "+type)
	if (data.format != format.formatString)
		throw new Error("Invalid data type '"+format.formatString+"' for exception "+type)
	
	this.type = type
	this.data = data
}
