##An example of a virtualized Grid using Seam's data binding plugin

Demo page : clone and open index.html, demo page on github is coming


This is a simple example of an application using the virtualization feature of Seam's data-binding plugin.

### The html for generating the grid

```html
<table>
	<thead>
		<tr>
			<td>#ID</td>
			<td>Continent</td>
			<td>Color</td>
			<td>Quantity</td>
			<td>Quantity</td>
			<td>Quantity</td>
			<td>Quantity</td>
			<td>Date</td>
			<td>fruit</td>
			<td>name</td>
		</tr>
	</thead>
	<tbody data-model="foreach: list,0,20">
		<tr>
			<td data-model="bind: innerHTML, id"></td>
			<td data-model="bind: innerHTML, continent"></td>
			<td data-model="bind: innerHTML, color"></td>
			<td data-model="bind: innerHTML, quantity1"></td>
			<td data-model="bind: innerHTML, quantity2"></td>
			<td data-model="bind: innerHTML, quantity3"></td>
			<td data-model="bind: innerHTML, quantity4"></td>
			<td data-model="bind: formatDate, date"></td>
			<td data-model="bind: innerHTML, fruit"></td>
			<td data-model="bind: innerHTML, name"></td>
		</tr>
	</tbody>
</table>
```

### The 1,000,000 rows

```js
for (; i<=1000000; i++) {
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
```

### The js for applying the data to the HTML

Most of the cells are assigned the value via the innerHTML property, but the data has it's own formatter which is shown here

```js
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
```

```js
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
```

```js
function getInitDataBindingPlugin(store) {
	return new DataBindingPlugin(store, {
		formatDate: function (timestamp) {
			this.innerHTML = new Date(timestamp).toISOString();
		}
	});
}
```

```js
function getInitSeam(bindPlugin) {
	var seam = new Seam();
	seam.addAll({
		"model": bindPlugin
	});
	return seam;
}
```
