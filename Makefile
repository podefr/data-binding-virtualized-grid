all:
	browserify -e ./js/main.js -o build.js

watch:
	watchify -e ./js/main.js -o build.js
