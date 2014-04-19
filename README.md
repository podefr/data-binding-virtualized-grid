##An example of a virtualized Grid using Seam's data binding plugin

Demo page : http://podefr.github.io/olives-virtualised-grid/


This is a simple example of an application using the virtualisation feature of the data-binding plugin.

It's based on Emily, Olives, and require.js for loading each module.

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
var list = new OObject(new Store(data));

var bind = new Bind(list.model, {
	// formatDate is executed after the row was created
	formatDate: function (timestamp) {
		this.innerHTML = new Date(timestamp).toISOString();
	}
});

list.plugins.addAll({
	// Add data binding to the view
	"model": bind
});

list.alive(view);
```
