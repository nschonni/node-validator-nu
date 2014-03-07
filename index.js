var program = require("commander");
var url = require("url");
var request = require("request");
var fs = require("fs");
var path = require("path");

var fileName = null;
var contentType = "text/html";
var inputHandle = null;
var validator;

program
	.version("0.0.1")
	.option("-x, --xml", "force application/xhtml+xml", false)
	.option("-g, --gnu", "GNU output", false)
	.option("-e, --errors-only", "only ouput errors", false)
	.option("--encoding [type]", "declare encoding [utf-8]", "utf-8")
	.option("--service [url]", "declare validation service url ['http://html5.validator.nu/']", "http://html5.validator.nu/")
	.parse(process.argv);

if (program.encoding) {
	contentType = contentType + '; charset=' + program.encoding;
}

targetUrl = program.service;
if (program.gnu) {
	targetUrl = targetUrl + '?out=gnu';
} else {
	targetUrl = targetUrl + '?out=text'
}
if (program.errorsOnly) {
	targetUrl = targetUrl + '&level=error';
}


fileName = program.args[0];
if (fs.existsSync(fileName)) {
	validate(targetUrl, fs.readFileSync(fileName, program.encoding.toString()), contentType);
} else {
	var data;
	process.stdin.on('readable', function(chunk) {
		var chunk = process.stdin.read();
		if (chunk !== null) {
			data += chunk;
		}
	});

	process.stdin.on('end', function() {
		validate(targetUrl, data, contentType);
	});
}

var validate = function( targetUrl, data, contentType) {
	validator = request({
		url: targetUrl,
		method: "POST",
		headers: {
			"Content-Type": contentType
		},
		body: data,
		proxy: process.env.HTTP_PROXY
	}, function callback(error, response, body) {
		if (!error && response.statusCode == 200) {
			console.log("info: ", body);
		}
	});
}

