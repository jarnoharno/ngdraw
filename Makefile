PORT := 3000
DISTDIR := public/dist
BOWERDIR := bower_components
NODEDIR := node_modules
TOGGLE_SWITCH := $(DISTDIR)/toggle-switch.css

ALL := $(TOGGLE_SWITCH) $(NODEDIR)
.PHONY: all
all: $(ALL)

$(NODEDIR):
	npm install

$(BOWERDIR):
	bower install

$(DISTDIR):
	mkdir $(DISTDIR)

$(TOGGLE_SWITCH): | $(DISTDIR) $(BOWERDIR)
	cp bower_components/css-toggle-switch/dist/toggle-switch.css $@

.PHONY: run
run: $(ALL)
	PORT=$(PORT) node app.js; true

.PHONY: clean
clean:
	rm -rf bower_components node_modules public/dist
