var express     = require('express');
var path        = require('path');
var sockjs      = require('sockjs');
var http        = require('http');

// sockjs stuff

var sjs = sockjs.createServer({
  sockjs_url: "http://cdn.sockjs.org/sockjs-0.3.min.js"
});

// drawing sessions
//
// sessions = {
//  <name>: {
//    paths: []
//    connections: {
//      <id> -> connections: <connection>
//    }
//  }
// }
var sessions = {};

// sockjs connections
//
// connections = {
//  <id>: {
//    connection: connection
//    session: string -> sessions
//  }
// }
var connections = {};

function open_session(name, conn) {
  var session = sessions[name];
  if (!session) {
    session = {
      paths: [],
      connections: {}
    };
    sessions[name] = session;
  }
  var connection = session.connections[conn.id] = connections[conn.id];
  remove_connection_from_session(connection);
  connections[conn.id].session = name;
  // update client
  if (session.paths.length > 0) {
    conn.write(JSON.stringify({
      type: 'paths',
      paths: session.paths
    }));
  }
  console.log('opened session', name, 'with', 
      Object.keys(session.connections).length, 'participant(s) for', conn.id);
}

function remove_connection_from_session(connection) {
  if (connection.session !== null) {
    var old = sessions[connection.session];
    var conn = connection.connection;
    delete old.connections[conn.id];
    console.log('removed', conn.id, 'from', connection.session, 'with',
      Object.keys(old.connections).length, 'participants');
    // remove session if empty
    if (Object.keys(old.connections).length == 0) {
      delete sessions[connection.session];
      console.log('closed', connection.session);
    }
  }
}

function add_connection(conn) {
  connections[conn.id] = {
    connection: conn,
    session: null
  };
}

function remove_connection(conn) {
  var connection = connections[conn.id];
  if (connection) {
    remove_connection_from_session(connection);
    delete connections[conn.id];
  }
  console.log('closed', conn.id);
}

function add_path(conn, path) {
  var connection = connections[conn.id];
  // ignore if connection is not attached to any session
  if (connection.session === null)
    return;
  var session = sessions[connection.session];
  session.paths.push(path);
  console.log('added path to', connection.session, 'with',
      session.paths.length, 'paths');
  // broadcast
  Object.keys(session.connections).forEach(function(id) {
    // skip self
    if (conn.id === id)
      return;
    var c = connections[id].connection;
    c.write(JSON.stringify({
      type: 'add_path',
      path: path
    }));
    console.log('sent path from', connection.session, 'to', id);
  });
}

sjs.on('connection', function(conn) {
  add_connection(conn);
  conn.on('close', function() {
    remove_connection(conn);
  });
  conn.on('data', function(data) {
    var msg;
    try {
      msg = JSON.parse(data);
    } catch(e) {
      console.error('Invalid JSON:', data);
      return;
    }
    switch (msg.type) {
      case 'open':
        open_session(msg.name, conn);
        break;
      case 'add_path':
        add_path(conn, msg.path);
        break;
    }
  });
});

// extend mime charsets check
express.static.mime.charsets.lookup = function(mimeType) {
  return (/^(text|application)\//).test(mimeType) ? 'UTF-8' : '';
};

var public_path = '/public';
var sockjs_path = '/sockjs';
var port = process.env.PORT || 80;

var app = express();
var server = http.createServer(app);
sjs.installHandlers(server, { prefix: sockjs_path });

app.set('port', port);
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

server.listen(port);
console.log('Listening on port ' + port);
console.log('Press Ctrl-C to quit');
