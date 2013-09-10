// Require and export all external objects
var Data = require("./Data.js")
var DataArray = require("./DataArray.js")
var Exception = require("./Exception.js")
var Gate = require("./Gate.js")
var Connection = require("./Connection.js")
var Token = require("./Token.js")

Connection.Data = Data
Connection.DataArray = DataArray
Connection.Exception = Exception
Connection.Gate = Gate
Connection.Token = Token

module.exports = Connection
