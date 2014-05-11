var express     = require('express');
var path        = require('path');

var public_path = '/public';
var app = express();
app.set('port', process.env.PORT || 80);

app.use(public_path, express.static(path.join(__dirname, public_path)));
app.get(new RegExp('^' + public_path), function(req, res) {
  res.json(404, { message: 'not found' });
});

app.use(function(req, res, next) {
  if (req.method == 'GET') {
    res.sendfile(path.join(__dirname, public_path, '/app.html'));
  } else {
    res.set('Allow', 'GET');
    res.json(405, { message: 'not allowed' });
  }
});

app.listen(3000);
console.log('Listening on port 3000');
console.log('Press Ctrl-C to quit');
