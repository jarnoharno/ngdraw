var app = angular.module('ngdraw', ['ngAnimate']);

app.config(function($locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('!');
});

function Point(x, y) {
  if (x instanceof MouseEvent) {
    this.x = x.offsetX;
    this.y = x.offsetY;
  } else if (x instanceof Point) {
    this.x = x.x;
    this.y = x.y;
  } else {
    this.x = x;
    this.y = y;
  }
};
Point.prototype.sub = function(p) {
  this.x -= p.x;
  this.y -= p.y;
  return this;
};
Point.prototype.add = function(p) {
  this.x += p.x;
  this.y += p.y;
  return this;
};

app.directive('whiteboard', function($window, sockjs) {
  function link(scope, element, attrs) {
    
    // viewbox origin in svg coordinates
    var origin = new Point(0, 0);

    // mousedown device coordinates
    var down_dev = null;
    // mousedown svg coordinates
    var down_svg = null;
    // origin in svg coordinates on mousedown
    var down_ori = null;

    var parent = element.parent()[0];
    function setDimensions() {
      var w = parent.offsetWidth;
      var h = parent.offsetHeight;
      element.attr('width', w);
      element.attr('height', h);
      element.attr('viewBox', origin.x + ' ' + origin.y + ' ' + w + ' ' + h);
    }
    angular.element($window).bind('resize', function() {
      setDimensions();
    });
    function reset() {
      scope.currentPath = [];
      down_dev = null;
      down_svg = null;
      down_ori = null;
    }
    element.bind('mousedown', function($event) {
      // mousedown may be called twice if cursor goes out of div
      // this needs to be fixed!
      if (down_dev)
        reset();
      down_dev = new Point($event);
      down_ori = new Point(origin);
      down_svg = new Point(down_dev).add(down_ori);
      if (scope.draw) {
        scope.currentPath.push(new Point(down_svg));
      }
    });
    element.bind('mousemove', function($event) {
      if (down_dev && !scope.draw) {
        var p = new Point($event);
        var o = new Point(down_ori);
        origin = o.sub(p.sub(down_dev));
        setDimensions();
      } else if (down_dev && scope.draw) {
        var cp = scope.currentPath;
        var p = new Point($event).add(origin);
        if (p.x == cp[cp.length-1].x && p.y == cp[cp.length-1].y)
          return;
        scope.currentPath.push(p);
        scope.$digest();
      }
    });
    element.bind('mouseup', function($event) {
      if (scope.draw && scope.currentPath.length > 1) {
        // fit bezier
        var path = FitCurveArray(scope.currentPath, 40.0);
        scope.paths.push(path);
        // send path to server
        sockjs.sendPath(path);
      }
      reset();
      scope.$digest();
    });
    setDimensions();
  };
  return {
    link: link
  };
});

app.controller('whiteboard', function($scope, $window, sockjs) {

  $scope.polylineData = function(path) {
    return path.map(function(p) {
      return p.x + ' ' + p.y;
    }).join(' ');
  };

  $scope.pathData = function(path) {
    var ret = '';
    if (path.length < 1)
      return ret;
    ret += 'M ' + path[0][0].x + ' ' + path[0][0].y;
    for (var i = 0; i < path.length; ++i) {
      ret += ' C ' + 
        path[i][1].x + ' ' + path[i][1].y + ' ' +
        path[i][2].x + ' ' + path[i][2].y + ' ' +
        path[i][3].x + ' ' + path[i][3].y ;
    }
    return ret;
  };

  $scope.draw = false;
  $scope.showHandles = false;
  $scope.paths = sockjs.paths;
  $scope.currentPath = [];
});

app.service('sockjs', function($location, $rootScope) {
  var connection = new SockJS('/sockjs');
  var paths = [];
  connection.onopen = function() {
    connection.send(JSON.stringify({
      type: 'open',
      name: $location.path()
    }));
  };
  connection.onmessage = function(e) {
    var msg = JSON.parse(e.data);
    switch (msg.type) {
      case 'paths':
        // we want to keep the original reference so...
        Array.prototype.splice.bind(paths, 0, paths.length).
          apply(undefined, msg.paths);
        // so much for that angular magic
        $rootScope.$digest();
        break;
      case 'add_path':
        paths.push(msg.path);
        // ditto
        $rootScope.$digest();
        break;
    }
  }
  return {
    sendPath: function(path) {
      // for now, ignore if not connected
      if (connection.readyState !== SockJS.OPEN)
        return;
      connection.send(JSON.stringify({
        type: 'add_path',
        path: path
      }));
    },
    // we can hook up on to this
    paths: paths
  };
});
