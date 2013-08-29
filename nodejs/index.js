var Data = require("./Data.js")
var inflateFormat = require("./inflateFormat.js")
var inflateData = require("./inflateData.js")

var data, buffer, inflatedData

data = (new Data).addStringArray(["um", "dois", "três", "quatro"])

buffer = data.toBuffer()
console.log(buffer)
inflatedData = inflateData(buffer, inflateFormat(data.format))
console.log(inflatedData)
