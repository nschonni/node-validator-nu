var extPat = new RegExp('^.*\.([A-Za-z]+)$'),
extDict = {
	html : "text/html",
	htm : "text/html",
	xhtml : "application/xhtml+xml",
	xht : "application/xhtml+xml",
	xml : "application/xml"
},
forceXml = false,
forceHtml = false,
gnu = false,
errorsOnly = false,
encoding = null,
fileName = null,
contentType = null,
inputHandle = null,
service = 'http://html5.validator.nu/';

process.argv.forEach(function (arg, index, array) {
	if (index === 0) {
		return;
	}
	if ('--help' == arg) {
		console.log('-h : force text/html');
		console.log('-x : force application/xhtml+xml');
		console.log('-g : GNU output');
		console.log('-e : errors only (no info or warnings)');
		console.log('--encoding=foo : declare encoding foo');
		console.log('--service=url	: the address of the HTML5 validator');
		console.log('One file argument allowed. Leave out to read from stdin.');
		process.exit(0);
	} else if (arg.indexOf("--encoding=")) {
		encoding = arg[11];
	} else if (arg.indexOf("--service=")) {
		service = arg[10];
	} else if (arg.indexOf("--")) {
		process.stderr.write('Unknown argument %s.\n' % arg);
		process.exit(2);
	} else if (arg.indexOf("-")) {
		for (c in arg[1]) {
			if ('x' == c) {
				forceXml = true;
			} else if ('h' == c) {
				forceHtml = true;
			} else if ('g' == c) {
				gnu = true;
			} else if ('e' == c) {
				errorsOnly = true;
			} else {
				process.stderr.write('Unknown argument %s.\n' % arg);
				process.exit(3);
			}
		}
	} else {
		if (fileName) {
			process.stderr.write('Cannot have more than one input file.\n');
			process.exit(1);
		}
		fileName = arg;
	}
});
if (forceXml && forceHtml) {
	process.stderr.write('Cannot force HTML and XHTML at the same time.\n');
	process.exit(2);
}
if (forceXml) {
	contentType = 'application/xhtml+xml';
} else if (forceHtml) {
	contentType = 'text/html';
} else if (fileName) {
	m = extPat.match(fileName)
	if (m) {
		ext = m.group(1);
		ext = ext.translate(string.maketrans(string.ascii_uppercase, string.ascii_lowercase));
		if (extDict.has_key(ext)) {
			contentType = extDict[ext];
		} else {
			process.stderr.write('Unable to guess Content-Type from file name. Please force the type.\n');
			process.exit(3);
		}
	} else {
		process.stderr.write('Could not extract a filename extension. Please force the type.\n');
		process.exit(6);
	}
} else {
	process.stderr.write('Need to force HTML or XHTML when reading from stdin.\n');
	process.exit(4);
}
if (encoding) {
	contentType = '%s; charset=%s' % (contentType, encoding);
}
if (fileName) {
	inputHandle = open(fileName, "rb");
} else {
	inputHandle = process.stdin;
}
data = inputHandle.read();

buf = StringIO.StringIO();
gzipper = gzip.GzipFile(fileobj=buf, mode='wb');
gzipper.write(data);
gzipper.close();
gzippeddata = buf.getvalue();
buf.close();

connection = null;
response = null;
status = 302;
redirectCount = 0;

url = service;
if (gnu) {
	url = url + '?out=gnu';
} else {
	url = url + '?out=text'
}
if (errorsOnly) {
	url = url + '&level=error';
}

while ((status == 302 || status == 301 || status == 307) && redirectCount < 10) {
	if (redirectCount > 0) {
		url = response.getheader('Location');
	}
	parsed = urlparse.urlsplit(url);
	if (parsed[0] != 'http') {
		process.stderr.write('URI scheme %s not supported.\n' % parsed[0]);
		process.exit(7);
	}
	if (redirectCount > 0) {
		connection.close(); // previous connection
		console.log('Redirecting to %s' % url);
		console.log('Please press enter to continue or type "stop" followed by enter to stop.');
		if (raw_input() != "") {
			process.exit(0);
		}
	}
	connection = httplib.HTTPConnection(parsed[1]);
	connection.connect();
	connection.putrequest("POST", "%s?%s" % (parsed[2], parsed[3]), skip_accept_encoding=1);
	connection.putheader("Accept-Encoding", 'gzip');
	connection.putheader("Content-Type", contentType);
	connection.putheader("Content-Encoding", 'gzip');
	connection.putheader("Content-Length", len(gzippeddata));
	connection.endheaders();
	connection.send(gzippeddata);
	response = connection.getresponse();
	status = response.status;
	redirectCount += 1;
}
if (status != 200) {
	process.stderr.write('%s %s\n' % (status, response.reason));
	process.exit(5);
}
if (response.getheader('Content-Encoding', 'identity').lower() == 'gzip') {
	response = gzip.GzipFile(fileobj=StringIO.StringIO(response.read()));
}

if (fileName && gnu) {
	quotedName = '"%s"' % fileName.replace('"', '\\042');
	for (line in response) {
		process.stdout.write(quotedName);
		process.stdout.write(line);
	}
} else {
	process.stdout.write(response.read());
}
connection.close();
