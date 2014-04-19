(function main() {
	var Store = require("observable-store"),
		Seam = require("Seam"),
		DataBindingPlugin = require("data-binding-plugin");

	// The view we want to attach behavior to
	var view = document.querySelector(".container");

	// Create the observable-store with 1M items
	var store = getInitStore();

	// Create the data-binding plugin with the new store
	var bindPlugin = getInitDataBindingPlugin(store);

	// Create Seam with the data-binding plugin
	var seam = getInitSeam(bindPlugin);

	// Apply Seam to the template
	seam.apply(view);

	// Bind the scroll events and the data-binding plugin to update
	// the viewport
	bindScrollEvents(view, bindPlugin);


	function getInitStore() {
		var data = [];

		function pick(array) {
			return array[Math.floor(Math.random() * array.length)]
		}

		for (var i=0; i<=1000000; i++) {
			data.push({
				"id" : i,
				"continent": pick(["North America", "Europe", "South America", "Africa", "Antartica", "Australia", "Asia"]),
				"color": pick(["yellow", "red", "lightblue"]),
				"quantity1": Math.floor(Math.random() * 100000),
				"quantity2": Math.floor(Math.random() * 100000),
				"quantity3": Math.floor(Math.random() * 100000),
				"quantity4": Math.floor(Math.random() * 100000),
				"date": (new Date().getTime()),
				"fruit": pick(["banana", "apple", "pear"]),
				"name": pick(["olivier", "pierre", "lucien"])
			});
		}

		return new Store(data);
	}

	function getInitDataBindingPlugin(store) {
		return new DataBindingPlugin(store, {
			formatDate: function (timestamp) {
				this.innerHTML = new Date(timestamp).toISOString();
			}
		});
	}

	function getInitSeam(bindPlugin) {
		var seam = new Seam();
		seam.addAll({
			"model": bindPlugin
		});
		return seam;
	}

	function bindScrollEvents(view, bind) {
		function move(idx) {
			var itemRenderer = bind.getItemRenderer("list");
			itemRenderer.setStart(idx);
			itemRenderer.render();
		}

		function moveToIndex() {
			move(Math.floor(this.scrollTop / 20));
		}

		view.onscroll = moveToIndex;
	}

})();
