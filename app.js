var express     = require('express');
var http        = require('http');
var path        = require('path');

var app = express();
app.set('port', process.env.PORT || 80);

app.use(function(req, res, next) {
  if (req.method == 'GET') {
    res.sendfile(path.join(__dirname, 'index.html'));
  } else {
    res.set('Allow', 'GET');
    res.json(405, { message: 'not allowed' });
  }
});

app.listen(3000);
console.log('Listening on port 3000');
console.log('Press Ctrl-C to quit');
