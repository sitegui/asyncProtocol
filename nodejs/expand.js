"use strict"

// Expand a call signature with the format
//     #{id} {name}({args}) -> {returns}
// {id} is a decimal number
// {name} is the call identifier
// {args} and {returns} are optional and have similar syntax:
//     {field}, {field}, ...
// {field} can be a scalar field:
//     {name}:{type}
// or array field:
//     {name}[]:{type}
//     {name}[]:({field})
// {type} can be one of "uint", "int", "float", "string", "token", "Buffer" or "boolean"
// Examples:
//     #17 getSum(a: int, b: int) -> sum:int
//     #2 createUser(name: string, email: string, password: Buffer)
//     #5 getFolders -> folders[]:(name: string, ownerName: string, ownerId: uint)
//     #7 setTags(postId: int, tags[]:string)
// Return an object with keys "id", "name", "args", "outArgs"
module.exports.expandCallSignature = function (str) {
	// Ignore white spaces
	str = str.replace(/\s/g, "")
	
	// Extract the id and name
	var match = str.match(/^#([1-9][0-9]*)([a-zA-Z_][a-zA-Z0-9_]*)/)
	if (!match)
		throw new Error("Invalid format")
	
	// Extract args and return
	str = str.substr(match[0].length)
	var match2 = str.match(/^(\(.*?\))?(->.*?)?$/)
	if (!match2)
		throw new Error("Invalid format")
	return {
		id: Number(match[1]),
		name: match[2],
		args: expandFields(match2[1] ? match2[1].substr(1, match2[1].length-2) : ""),
		outArgs: expandFields(match2[2] ? match2[2].substr(2) : "")
	}
}

// Similar to expandCallSignature, except the syntax is
//     #{id} {name}({args})
// Return an object with keys "id", "name", "args"
module.exports.expandExceptionSignature = function (str) {
	// Ignore white spaces
	str = str.replace(/\s/g, "")
	
	// Extract the parts
	var match = str.match(/^#([1-9][0-9]*)([a-zA-Z_][a-zA-Z0-9_]*)(\(.*?\))?/)
	if (!match)
		throw new Error("Invalid format")
	
	return {
		id: Number(match[1]),
		name: match[2],
		args: expandFields(match[3] ? match[3].substr(1, match[3].length-2) : "")
	}
}

// Aux function of expandCallSignature to expand {args} and {returns}
function expandFields(str) {
	var tree = expandParenthesis(str)
	
	var expandLevel = function (tree) {
		var i, str, match, r = [], type
		r.format = ""
		for (i=0; i<tree.length; i++) {
			str = tree[i]
			if (typeof str !== "string")
				throw new Error("Invalid format")
			
			// Look for simple cases: "name:type" and "name[]:type"
			match = str.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\[\])?:(uint|int|float|string|token|Buffer|boolean)$/)
			if (match) {
				r.push({name: match[1], array: Boolean(match[2]), type: match[3]})
				r.format += match[2] ? "("+match[3][0]+")" : match[3][0]
				continue
			}
			
			// Check harder case: this element is "name[]:" and the next is an array
			if (!str.match(/^[a-zA-Z_][a-zA-Z0-9_]*\[\]:$/) || !Array.isArray(tree[i+1]))
				throw new Error("Invalid format")
			type = expandLevel(tree[i+1])
			r.push({name: str.substr(0, str.length-3), array: true, type: type})
			r.format += "("+type.format+")"
			i++
		}
		return r
	}
	
	return expandLevel(tree)
}

// Aux function of expandFields
function expandParenthesis(str) {
	var tree = [], i, c, subtree
	var cache = ""
	var saveCache = function () {
		if (cache) {
			tree.push(cache)
			cache = ""
		}
	}
	for (i=0; i<str.length; i++) {
		c = str[i]
		if (c == "(") {
			saveCache()
			subtree = []
			tree.push(subtree)
			subtree.parent = tree
			tree = subtree
		} else if (c == ")") {
			saveCache()
			if (!tree.parent)
				throw new Error("Parenthesis mismatch")
			subtree = tree.parent
			delete tree.parent
			tree = subtree
		} else if (c == ",") {
			saveCache()
		} else
			cache += c
	}
	saveCache()
	if (tree.parent)
		throw new Error("Parenthesis mismatch")
	
	return tree
}
