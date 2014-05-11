PORT := 3000

.PHONY: run
run:
	PORT=$(PORT) node app.js; true
