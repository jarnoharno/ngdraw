var app = angular.module('ngdraw', ['ngAnimate']);

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

app.directive('whiteboard', function($window) {
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
    element.bind('mousedown', function($event) {
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
        var p = new Point($event);
        scope.currentPath.push(p.add(origin));
        scope.$digest();
      }
    });
    element.bind('mouseup', function($event) {
      if (scope.draw) {
        scope.paths.push(FitCurveArray(scope.currentPath, 40.0));
        scope.currentPath = [];
      }
      down_dev = null;
      down_svg = null;
      down_ori = null;
      scope.$digest();
    });
    setDimensions();
  };
  return {
    link: link
  };
});

app.controller('whiteboard', function($scope, $window) {

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
  $scope.paths = [];
  $scope.currentPath = [];

  $scope.mousedown = function($event) {
  };
  $scope.mouseup = function($event) {
    $scope.downat = null;
  };
  $scope.mousemove = function($event) {
    
  };
  $scope.toggleDraw = function() {
  };
});
