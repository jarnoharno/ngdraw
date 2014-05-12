# ngdraw

Collaborative SVG whiteboard with AngularJS.

## Introduction

Each unique path (eg. /foo on http://ngdraw.herokuapp.com/foo) corresponds to a
single shared whiteboard session. When a client connects to an existing
session, the server will send the entire drawing on the board to the
newly connected client. Connected clients can draw on the board and see each
other's drawings in real-time. Session closes and the corresponding whiteboard is
erased when the last client navigates away from the page or closes her browser tab.

Paths are simplified with a clever
[algorithm](http://iut-arles.univ-provence.fr/web/romain-raffin/sites/romain-raffin/IMG/pdf/PSchndeider_An_Algorithm_for_automatically_fitting_digitized_curves.pdf)
and sent to the server with [SockJS](https://github.com/sockjs/).

## Development

    $ make run

## Links

* [Deployed app](http://ngdraw.herokuapp.com/)
* [Work hour log](tuntikirjanpito.md) (in Finnish)

## References

* [SVG-edit](https://code.google.com/p/svg-edit/) Full-blown SVG editor on the browser
* [SVG + AngularJS](http://alexandros.resin.io/angular-d3-svg/)
* [Paper.js examples](http://paperjs.org/examples/path-simplification/) (uses canvas)
* [Piecewise Bézier curve fitting](http://iut-arles.univ-provence.fr/web/romain-raffin/sites/romain-raffin/IMG/pdf/PSchndeider_An_Algorithm_for_automatically_fitting_digitized_curves.pdf)

## License

[ISC](http://en.wikipedia.org/wiki/ISC_license)
