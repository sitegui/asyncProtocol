// Require and export all external objects
var Data = require("./Data.js")
var DataArray = require("./DataArray.js")
var Exception = require("./Exception.js")
var createGate = require("./createGate.js")
var Connection = require("./Connection.js")
var Token = require("./Token.js")

Connection.Data = Data
Connection.DataArray = DataArray
Connection.Exception = Exception
Connection.createGate = createGate
Connection.Token = Token

module.exports = Connection
