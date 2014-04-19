(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"Seam":2,"data-binding-plugin":7,"observable-store":16}],2:[function(require,module,exports){
/**
* @license seam https://github.com/flams/seam
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var toArray = require("to-array"),
    simpleLoop = require("simple-loop"),
    getNodes = require("get-nodes"),
    getDataset = require("get-dataset");

/**
 * Seam makes it easy to attach JS behavior to your HTML/SVG via the data- attribute.
 * <div data-plugin="method: param, param, ..."></tag>
 *
 * JS behaviors are defined in plugins, which are plain JS objects with data and methods.
 */
module.exports = function Seam($plugins) {

    /**
     * The list of plugins
     * @private
     */
    var _plugins = {},

    /**
     * Just a "functionalification" of trim
     * for code readability
     * @private
     */
    trim = function trim(string) {
        return string.trim();
    },

    /**
     * Call the plugins methods, passing them the dom node
     * A phrase can be :
     * <tag data-plugin='method: param, param; method:param...'/>
     * the function has to call every method of the plugin
     * passing it the node, and the given params
     * @private
     */
    applyPlugin = function applyPlugin(node, phrase, plugin) {
        // Split the methods
        phrase.split(";")
        .forEach(function (couple) {
            // Split the result between method and params
            var split = couple.split(":"),
            // Trim the name
            method = split[0].trim(),
            // And the params, if any
            params = split[1] ? split[1].split(",").map(trim) : [];

            // The first param must be the dom node
            params.unshift(node);

            if (_plugins[plugin] && _plugins[plugin][method]) {
                // Call the method with the following params for instance :
                // [node, "param1", "param2" .. ]
                _plugins[plugin][method].apply(_plugins[plugin], params);
            }

        });
    };

    /**
     * Add a plugin
     *
     * Note that once added, the function adds a "plugins" property to the plugin.
     * It's an object that holds a name property, with the registered name of the plugin
     * and an apply function, to use on new nodes that the plugin would generate
     *
     * @param {String} name the name of the data that the plugin should look for
     * @param {Object} plugin the plugin that has the functions to execute
     * @returns true if plugin successfully added.
     */
    this.add = function add(name, plugin) {
        var propertyName = "plugins";

        if (typeof name == "string" && typeof plugin == "object" && plugin) {
            _plugins[name] = plugin;

            plugin[propertyName] = {
                    name: name,
                    apply: function apply() {
                        return this.apply.apply(this, arguments);
                    }.bind(this)
            };
            return true;
        } else {
            return false;
        }
    };

    /**
     * Add multiple plugins at once
     * @param {Object} list key is the plugin name and value is the plugin
     * @returns true if correct param
     */
    this.addAll = function addAll(list) {
        return simpleLoop(list, function (plugin, name) {
            this.add(name, plugin);
        }, this);
    };

    /**
     * Get a previously added plugin
     * @param {String} name the name of the plugin
     * @returns {Object} the plugin
     */
    this.get = function get(name) {
        return _plugins[name];
    };

    /**
     * Delete a plugin from the list
     * @param {String} name the name of the plugin
     * @returns {Boolean} true if success
     */
    this.del = function del(name) {
        return delete _plugins[name];
    };

    /**
     * Apply the plugins to a NodeList
     * @param {HTMLElement|SVGElement} dom the dom nodes on which to apply the plugins
     * @returns {Boolean} true if the param is a dom node
     */
    this.apply = function apply(dom) {
        var nodes = getNodes(dom);

        simpleLoop(toArray(nodes), function (node) {
            simpleLoop(getDataset(node), function (phrase, plugin) {
                applyPlugin(node, phrase, plugin);
            });
        });

        return dom;
    };

    if ($plugins) {
        this.addAll($plugins);
    }

};

},{"get-dataset":3,"get-nodes":4,"simple-loop":5,"to-array":6}],3:[function(require,module,exports){
/**
* @license get-dataset https://github.com/cosmios/get-dataset
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

/**
 * Get a domNode's dataset attribute. If dataset doesn't exist (IE)
 * then the domNode is looped through to collect them.
 * @param {HTMLElement|SVGElement} dom
 * @returns {Object} dataset
 */
 module.exports = function getDataset(dom) {
    var dataset = {},
        i, l, split,join;

    if ("dataset" in dom) {
        return dom.dataset;
    } else {
        for (i=0, l=dom.attributes.length; i<l; i++) {
            split = dom.attributes[i].name.split("-");
            if (split.shift() == "data") {
                dataset[join = split.join("-")] = dom.getAttribute("data-"+join);
            }
        }
        return dataset;
    }
};

},{}],4:[function(require,module,exports){
/**
* @license get-nodes https://github.com/cosmios/get-nodes
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var toArray = require("to-array");

module.exports = function getNodes(dom) {
    var domElements = dom.querySelectorAll("*"),
        arrayDomElements = toArray(domElements);

    arrayDomElements.unshift(dom);

    return arrayDomElements;
};

},{"to-array":6}],5:[function(require,module,exports){
/**
* @license simple-loop https://github.com/flams/simple-loop
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert");

/**
 * Small abstraction for looping over objects and arrays
 * Warning: it's not meant to be used with nodeList
 * To use with nodeList, convert to array first
 * @param {Array/Object} iterated the array or object to loop through
 * @param {Function} callback the function to execute for each iteration
 * @param {Object} scope the scope in which to execute the callback
 */
module.exports = function loop(iterated, callback, scope) {
  assert(typeof iterated == "object", "simple-loop: iterated must be an array/object");
  assert(typeof callback == "function", "simple-loop: callback must be a function");

  if (Array.isArray(iterated)) {
      iterated.forEach(callback, scope);
  } else {
      for (var i in iterated) {
          if (iterated.hasOwnProperty(i)) {
              callback.call(scope, iterated[i], i, iterated);
          }
      }
  }
};

},{"assert":25}],6:[function(require,module,exports){
module.exports = toArray

function toArray(list, index) {
    var array = []

    index = index || 0

    for (var i = index || 0; i < list.length; i++) {
        array[i - index] = list[i]
    }

    return array
}

},{}],7:[function(require,module,exports){
/**
* @license data-binding-plugin https://github.com/flams/data-binding-plugin
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var Observable = require("watch-notify"),
    compareNumbers = require("compare-numbers"),
    simpleLoop = require("simple-loop"),
    toArray = require("to-array"),
    getClosest = require("get-closest"),
    nestedProperty = require("nested-property"),
    getNodes = require("get-nodes"),
    getDataset =  require("get-dataset");

function setAttribute(node, property, value) {
    if ('ownerSVGElement' in node) {
        node.setAttribute(property, value);
        return true;
    } else if ('ownerDocument' in node) {
        node[property] = value;
        return true;
    } else {
        throw new Error("invalid element type");
    }
}

/**
 * @class
 * This plugin links dom nodes to a model
 */
module.exports = function BindPluginConstructor($model, $bindings) {

    /**
     * The model to watch
     * @private
     */
    var _model = null,

    /**
     * The list of custom bindings
     * @private
     */
    _bindings = {},

    /**
     * The list of itemRenderers
     * each foreach has its itemRenderer
     * @private
     */
    _itemRenderers = {},

    /**
     * The observers handlers
     * @private
     */
    _observers = {};

    /**
     * Exposed for debugging purpose
     * @private
     */
    this.observers = _observers;

    function _removeObserversForId(id) {
        if (_observers[id]) {
            _observers[id].forEach(function (handler) {
                _model.unwatchValue(handler);
            });
            delete _observers[id];
        }
    }

    /**
     * Define the model to watch for
     * @param {Store} model the model to watch for changes
     * @returns {Boolean} true if the model was set
     */
    this.setModel = function setModel(model) {
        _model = model;
    };

    /**
     * Get the store that is watched for
     * for debugging only
     * @private
     * @returns the Store
     */
    this.getModel = function getModel() {
        return _model;
    };

    /**
     * The item renderer defines a dom node that can be duplicated
     * It is made available for debugging purpose, don't use it
     * @private
     */
    this.ItemRenderer = function ItemRenderer($plugins, $rootNode) {

        /**
         * The node that will be cloned
         * @private
         */
        var _node = null,

        /**
         * The object that contains plugins.name and plugins.apply
         * @private
         */
        _plugins = null,

        /**
         * The _rootNode where to append the created items
         * @private
         */
        _rootNode = null,

        /**
         * The lower boundary
         * @private
         */
        _start = null,

        /**
         * The number of item to display
         * @private
         */
        _nb = null;

        /**
         * Set the duplicated node
         * @private
         */
        this.setRenderer = function setRenderer(node) {
            _node = node;
            return true;
        };

        /**
         * Returns the node that is going to be used for rendering
         * @private
         * @returns the node that is duplicated
         */
        this.getRenderer = function getRenderer() {
            return _node;
        };

        /**
         * Sets the rootNode and gets the node to copy
         * @private
         * @param {HTMLElement|SVGElement} rootNode
         * @returns
         */
        this.setRootNode = function setRootNode(rootNode) {
            var renderer;
            _rootNode = rootNode;
            renderer = _rootNode.querySelector("*");
            this.setRenderer(renderer);
            if (renderer) {
                _rootNode.removeChild(renderer);
            }
        };

        /**
         * Gets the rootNode
         * @private
         * @returns _rootNode
         */
        this.getRootNode = function getRootNode() {
            return _rootNode;
        };

        /**
         * Set the plugins objet that contains the name and the apply function
         * @private
         * @param plugins
         * @returns true
         */
        this.setPlugins = function setPlugins(plugins) {
            _plugins = plugins;
            return true;
        };

        /**
         * Get the plugins object
         * @private
         * @returns the plugins object
         */
        this.getPlugins = function getPlugins() {
            return _plugins;
        };

        /**
         * The nodes created from the items are stored here
         * @private
         */
        this.items = {};

        /**
         * Set the start limit
         * @private
         * @param {Number} start the value to start rendering the items from
         * @returns the value
         */
        this.setStart = function setStart(start) {
            _start = parseInt(start, 10);
            return _start;
        };

        /**
         * Get the start value
         * @private
         * @returns the start value
         */
        this.getStart = function getStart() {
            return _start;
        };

        /**
         * Set the number of item to display
         * @private
         * @param {Number/String} nb the number of item to display or "*" for all
         * @returns the value
         */
        this.setNb = function setNb(nb) {
            _nb = nb == "*" ? nb : parseInt(nb, 10);
            return _nb;
        };

        /**
         * Get the number of item to display
         * @private
         * @returns the value
         */
        this.getNb = function getNb() {
            return _nb;
        };

        /**
         * Adds a new item and adds it in the items list
         * @private
         * @param {Number} id the id of the item
         * @returns
         */
        this.addItem = function addItem(id) {
            var node,
                next;

            if (typeof id == "number" && !this.items[id]) {
                next = this.getNextItem(id);
                node = this.create(id);
                if (node) {
                    // IE (until 9) apparently fails to appendChild when insertBefore's second argument is null, hence this.
                    if (next) {
                        _rootNode.insertBefore(node, next);
                    } else {
                        _rootNode.appendChild(node);
                    }
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        };

        /**
         * Get the next item in the item store given an id.
         * @private
         * @param {Number} id the id to start from
         * @returns
         */
        this.getNextItem = function getNextItem(id) {
            var keys = Object.keys(this.items).map(function (string) {
                    return Number(string);
                }),
                closest = getClosest.greaterNumber(id, keys),
                closestId = keys[closest];

            // Only return if different
            if (closestId != id) {
                return this.items[closestId];
            } else {
                return;
            }
        };

        /**
         * Remove an item from the dom and the items list
         * @private
         * @param {Number} id the id of the item to remove
         * @returns
         */
        this.removeItem = function removeItem(id) {
            var item = this.items[id];
            if (item) {
                _rootNode.removeChild(item);
                delete this.items[id];
                _removeObserversForId(id);
                return true;
            } else {
                return false;
            }
        };

        /**
         * create a new node. Actually makes a clone of the initial one
         * and adds pluginname_id to each node, then calls plugins.apply to apply all plugins
         * @private
         * @param id
         * @param pluginName
         * @returns the associated node
         */
        this.create = function create(id) {
            if (_model.has(id)) {
                var newNode = _node.cloneNode(true),
                nodes = getNodes(newNode);

                toArray(nodes).forEach(function (child) {
                    child.setAttribute("data-" + _plugins.name+"_id", id);
                });

                this.items[id] = newNode;
                _plugins.apply(newNode);
                return newNode;
            }
        };

        /**
         * Renders the dom tree, adds nodes that are in the boundaries
         * and removes the others
         * @private
         * @returns true boundaries are set
         */
        this.render = function render() {
            // If the number of items to render is all (*)
            // Then get the number of items
            var _tmpNb = _nb == "*" ? _model.count() : _nb;

            // This will store the items to remove
            var marked = [];

            // Render only if boundaries have been set
            if (_nb !== null && _start !== null) {

                // Loop through the existing items
                simpleLoop(this.items, function (value, idx) {
                    // If an item is out of the boundary
                    idx = Number(idx);

                    if (idx < _start || idx >= (_start + _tmpNb) || !_model.has(idx)) {
                        // Mark it
                        marked.push(idx);
                    }
                }, this);

                // Remove the marked item from the highest id to the lowest
                // Doing this will avoid the id change during removal
                // (removing id 2 will make id 3 becoming 2)
                marked.sort(compareNumbers.desc).forEach(this.removeItem, this);

                // Now that we have removed the old nodes
                // Add the missing one
                for (var i=_start, l=_tmpNb+_start; i<l; i++) {
                    this.addItem(i);
                }
                return true;
            } else {
                return false;
            }
        };

        if ($plugins) {
            this.setPlugins($plugins);
        }
        if ($rootNode) {
            this.setRootNode($rootNode);
        }
    };

    /**
     * Save an itemRenderer according to its id
     * @private
     * @param {String} id the id of the itemRenderer
     * @param {ItemRenderer} itemRenderer an itemRenderer object
     */
    this.setItemRenderer = function setItemRenderer(id, itemRenderer) {
        id = id || "default";
        _itemRenderers[id] = itemRenderer;
    };

    /**
     * Get an itemRenderer
     * @private
     * @param {String} id the name of the itemRenderer
     * @returns the itemRenderer
     */
    this.getItemRenderer = function getItemRenderer(id) {
        return _itemRenderers[id];
    };

    /**
     * Expands the inner dom nodes of a given dom node, filling it with model's values
     * @param {HTMLElement|SVGElement} node the dom node to apply foreach to
     */
    this.foreach = function foreach(node, idItemRenderer, start, nb) {
        var itemRenderer = new this.ItemRenderer(this.plugins, node);

        itemRenderer.setStart(start || 0);
        itemRenderer.setNb(nb || "*");

        itemRenderer.render();

        // Add the newly created item
        _model.watch("added", itemRenderer.render, itemRenderer);

        // If an item is deleted
        _model.watch("deleted", function (idx) {
            itemRenderer.render();
            // Also remove all observers
            _removeObserversForId(idx);
        },this);

        this.setItemRenderer(idItemRenderer, itemRenderer);
     };

     /**
      * Update the lower boundary of a foreach
      * @param {String} id the id of the foreach to update
      * @param {Number} start the new value
      * @returns true if the foreach exists
      */
     this.updateStart = function updateStart(id, start) {
         var itemRenderer = this.getItemRenderer(id);
         if (itemRenderer) {
             itemRenderer.setStart(start);
             return true;
         } else {
             return false;
         }
     };

     /**
      * Update the number of item to display in a foreach
      * @param {String} id the id of the foreach to update
      * @param {Number} nb the number of items to display
      * @returns true if the foreach exists
      */
     this.updateNb = function updateNb(id, nb) {
         var itemRenderer = this.getItemRenderer(id);
         if (itemRenderer) {
             itemRenderer.setNb(nb);
             return true;
         } else {
             return false;
         }
     };

     /**
      * Refresh a foreach after having modified its limits
      * @param {String} id the id of the foreach to refresh
      * @returns true if the foreach exists
      */
     this.refresh = function refresh(id) {
        var itemRenderer = this.getItemRenderer(id);
        if (itemRenderer) {
            itemRenderer.render();
            return true;
        } else {
            return false;
        }
     };

    /**
     * Both ways binding between a dom node attributes and the model
     * @param {HTMLElement|SVGElement} node the dom node to apply the plugin to
     * @param {String} name the name of the property to look for in the model's value
     * @returns
     */
    this.bind = function bind(node, property, name) {

        // Name can be unset if the value of a row is plain text
        name = name || "";

        // In case of an array-like model the id is the index of the model's item to look for.
        // The _id is added by the foreach function
        var id = node.getAttribute("data-" + this.plugins.name+"_id"),

        // Else, it is the first element of the following
        split = name.split("."),

        // So the index of the model is either id or the first element of split
        modelIdx = id || split.shift(),

        // And the name of the property to look for in the value is
        prop = id ? name : split.join("."),

        // Get the model's value
        get = nestedProperty.get(_model.get(modelIdx), prop),

        // When calling bind like bind:newBinding,param1, param2... we need to get them
        extraParam = toArray(arguments).slice(3);

        // 0 and false are acceptable falsy values
        if (get || get === 0 || get === false) {
            // If the binding hasn't been overriden
            if (!this.execBinding.apply(this,
                    [node, property, get]
                // Extra params are passed to the new binding too
                    .concat(extraParam))) {
                // Execute the default one which is a simple assignation
                //node[property] = get;
                setAttribute(node, property, get);
            }
        }

        // Only watch for changes (double way data binding) if the binding
        // has not been redefined
        if (!this.hasBinding(property)) {
            node.addEventListener("change", function (event) {
                if (_model.has(modelIdx)) {
                    if (prop) {
                        _model.update(modelIdx, name, node[property]);
                    } else {
                        _model.set(modelIdx, node[property]);
                    }
                }
            }, true);

        }

        // Watch for changes
        this.observers[modelIdx] = this.observers[modelIdx] || [];
        this.observers[modelIdx].push(_model.watchValue(modelIdx, function (value) {
            if (!this.execBinding.apply(this,
                    [node, property, nestedProperty.get(value, prop)]
                    // passing extra params too
                    .concat(extraParam))) {

                setAttribute(node, property, nestedProperty.get(value, prop));
            }
        }, this));

    };

    /**
     * Set the node's value into the model, the name is the model's property
     * @private
     * @param {HTMLElement|SVGElement} node
     * @returns true if the property is added
     */
    this.set = function set(node) {
        if (node.name) {
            _model.set(node.name, node.value);
            return true;
        } else {
            return false;
        }
    };

    this.getItemIndex = function getElementId(dom) {
        var dataset = getDataset(dom);

        if (dataset && typeof dataset[this.plugins.name + "_id"] != "undefined") {
            return +dataset[this.plugins.name + "_id"];
        } else {
            return false;
        }
    };

    /**
     * Prevents the submit and set the model with all form's inputs
     * @param {HTMLFormElement} DOMfrom
     * @returns true if valid form
     */
    this.form = function form(DOMform) {
        if (DOMform && DOMform.nodeName == "FORM") {
            var that = this;
            DOMform.addEventListener("submit", function (event) {
                toArray(DOMform.querySelectorAll("[name]")).forEach(that.set, that);
                event.preventDefault();
            }, true);
            return true;
        } else {
            return false;
        }
    };

    /**
     * Add a new way to handle a binding
     * @param {String} name of the binding
     * @param {Function} binding the function to handle the binding
     * @returns
     */
    this.addBinding = function addBinding(name, binding) {
        if (name && typeof name == "string" && typeof binding == "function") {
            _bindings[name] = binding;
            return true;
        } else {
            return false;
        }
    };

    /**
     * Execute a binding
     * Only used by the plugin
     * @private
     * @param {HTMLElement} node the dom node on which to execute the binding
     * @param {String} name the name of the binding
     * @param {Any type} value the value to pass to the function
     * @returns
     */
    this.execBinding = function execBinding(node, name) {
        if (this.hasBinding(name)) {
            _bindings[name].apply(node, Array.prototype.slice.call(arguments, 2));
            return true;
        } else {
            return false;
        }
    };

    /**
     * Check if the binding exists
     * @private
     * @param {String} name the name of the binding
     * @returns
     */
    this.hasBinding = function hasBinding(name) {
        return _bindings.hasOwnProperty(name);
    };

    /**
     * Get a binding
     * For debugging only
     * @private
     * @param {String} name the name of the binding
     * @returns
     */
    this.getBinding = function getBinding(name) {
        return _bindings[name];
    };

    /**
     * Add multiple binding at once
     * @param {Object} list the list of bindings to add
     * @returns
     */
    this.addBindings = function addBindings(list) {
        return simpleLoop(list, function (binding, name) {
            this.addBinding(name, binding);
        }, this);
    };

    // Inits the model
    this.setModel($model);
    // Inits bindings

    if ($bindings) {
        this.addBindings($bindings);
    }
};

},{"compare-numbers":8,"get-closest":9,"get-dataset":10,"get-nodes":11,"nested-property":12,"simple-loop":13,"to-array":14,"watch-notify":15}],8:[function(require,module,exports){
/**
* @license compare-numbers https://github.com/cosmosio/compare-numbers
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
 */
"use strict";

/**
 * Compares two numbers and tells if the first one is bigger (1), smaller (-1) or equal (0)
 * @param {Number} number1 the first number
 * @param {Number} number2 the second number
 * @returns 1 if number1>number2, -1 if number2>number1, 0 if equal
 */
function compareNumbers(number1, number2) {
      if (number1 > number2) {
        return 1;
      } else if (number1 < number2) {
        return -1;
      } else {
         return 0;
      }
}

module.exports = {

  /**
   * Compares two numbers and tells if the first one is bigger (1), smaller (-1) or equal (0)
   * @param {Number} number1 the first number
   * @param {Number} number2 the second number
   * @returns 1 if number1 > number2, -1 if number2 > number1, 0 if equal
   */
    "asc": compareNumbers,

    /**
     * Compares two numbers and tells if the first one is bigger (1), smaller (-1) or equal (0)
     * @param {Number} number1 the first number
     * @param {Number} number2 the second number
     * @returns 1 if number2 > number1, -1 if number1 > number2, 0 if equal
     */
    "desc": function desc(number1, number2) {
      return compareNumbers(number2, number1);
    }
};

},{}],9:[function(require,module,exports){
/**
* @license get-closest https://github.com/cosmosio/get-closest
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert");

/**
 * Get the closest number in an array
 * @param {Number} item the base number
 * @param {Array} array the array to search into
 * @param {Function} getDiff returns the difference between the base number and
 *   and the currently read item in the array. The item which returned the smallest difference wins.
 * @private
 */
function _getClosest(item, array, getDiff) {
    var closest,
        diff;

    assert(Array.isArray(array), "Get closest expects an array as second argument");

    array.forEach(function (comparedItem, comparedItemIndex) {
        var thisDiff = getDiff(comparedItem, item);

        if (thisDiff >= 0 && (typeof diff == "undefined" || thisDiff < diff)) {
            diff = thisDiff;
            closest = comparedItemIndex;
        }
    });

    return closest;
}

module.exports = {

  /**
   * Get the closest number in an array given a base number
   * Example: closest(30, [20, 0, 50, 29]) will return 3 as 29 is the closest item
   * @param {Number} item the base number
   * @param {Array} array the array of numbers to search into
   * @returns {Number} the index of the closest item in the array
   */
  number: function closestNumber(item, array) {
      return _getClosest(item, array, function (comparedItem, item) {
          return Math.abs(comparedItem - item);
      });
  },

  /**
   * Get the closest greater number in an array given a base number
   * Example: closest(30, [20, 0, 50, 29]) will return 2 as 50 is the closest greater item
   * @param {Number} item the base number
   * @param {Array} array the array of numbers to search into
   * @returns {Number} the index of the closest item in the array
   */
  greaterNumber: function closestGreaterNumber(item, array) {
      return _getClosest(item, array, function (comparedItem, item) {
          return comparedItem - item;
      });
  },

  /**
   * Get the closest lower number in an array given a base number
   * Example: closest(30, [20, 0, 50, 29]) will return 0 as 20 is the closest lower item
   * @param {Number} item the base number
   * @param {Array} array the array of numbers to search into
   * @returns {Number} the index of the closest item in the array
   */
  lowerNumber: function closestLowerNumber(item, array) {
    return _getClosest(item, array, function (comparedItem, item) {
        return item - comparedItem;
    });
  },

  /**
   * Get the closest item in an array given a base item and a comparator function
   * Example (closest("lundi", ["mundi", "mardi"], getLevenshteinDistance)) will return 0 for "lundi"
   * @param {*} item the base item
   * @param {Array} array an array of items
   * @param {Function} comparator a comparatof function to compare the items
   *
   * The function looks like:
   *
   * // comparedItem comes from the array
   * // baseItem is the item to compare the others to
   * // It returns a number
   * function comparator(comparedItem, baseItem) {
   *     return comparedItem - baseItem;
   * }
   */
  custom: function closestCustom(item, array, comparator) {
    return _getClosest(item, array, comparator);
  }

};

},{"assert":25}],10:[function(require,module,exports){
module.exports=require(3)
},{}],11:[function(require,module,exports){
module.exports=require(4)
},{"to-array":14}],12:[function(require,module,exports){
/**
* @license nested-property https://github.com/cosmosio/nested-property
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert");

module.exports = {
  set: setNestedProperty,
  get: getNestedProperty
}

/**
 * Get the property of an object nested in one or more objects
 * given an object such as a.b.c.d = 5, getNestedProperty(a, "b.c.d") will return 5.
 * @param {Object} object the object to get the property from
 * @param {String} property the path to the property as a string
 * @returns the object or the the property value if found
 */
function getNestedProperty(object, property) {
    if (object && typeof object == "object") {
        if (typeof property == "string" && property !== "") {
            var split = property.split(".");
            return split.reduce(function (obj, prop) {
                return obj && obj[prop];
            }, object);
        } else if (typeof property == "number") {
            return object[property];
        } else {
            return object;
        }
    } else {
        return object;
    }
}

/**
 * Set the property of an object nested in one or more objects
 * If the property doesn't exist, it gets created.
 * @param {Object} object
 * @param {String} property
 * @param value the value to set
 * @returns object if no assignment was made or the value if the assignment was made
 */
function setNestedProperty(object, property, value) {
    if (object && typeof object == "object") {
        if (typeof property == "string" && property !== "") {
            var split = property.split(".");
            return split.reduce(function (obj, prop, idx) {
                obj[prop] = obj[prop] || {};
                if (split.length == (idx + 1)) {
                    obj[prop] = value;
                }
                return obj[prop];
            }, object);
        } else if (typeof property == "number") {
            object[property] = value;
            return object[property];
        } else {
            return object;
        }
    } else {
        return object;
    }
}

},{"assert":25}],13:[function(require,module,exports){
module.exports=require(5)
},{"assert":25}],14:[function(require,module,exports){
module.exports=require(6)
},{}],15:[function(require,module,exports){
/**
* @license watch-notify https://github.com/flams/watch-notify
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert");

var loop = require("simple-loop"),
  toArray = require("to-array");

/**
* @class
* Observable is an implementation of the Observer design pattern,
* which is also known as publish/subscribe.
*
* This service creates an Observable to which you can add subscribers.
*
* @returns {Observable}
*/
module.exports = function WatchNotifyConstructor() {

    /**
     * The list of topics
     * @private
     */
    var _topics = {};

    /**
     * Add an observer
     * @param {String} topic the topic to observe
     * @param {Function} callback the callback to execute
     * @param {Object} scope the scope in which to execute the callback
     * @returns handle
     */
    this.watch = function watch(topic, callback, scope) {
        if (typeof callback == "function") {
            var observers = _topics[topic] = _topics[topic] || [],
            observer = [callback, scope];

            observers.push(observer);
            return [topic,observers.indexOf(observer)];

        } else {
            return false;
        }
    };

    /**
     * Listen to an event just once before removing the handler
     * @param {String} topic the topic to observe
     * @param {Function} callback the callback to execute
     * @param {Object} scope the scope in which to execute the callback
     * @returns handle
     */
    this.once = function once(topic, callback, scope) {
        var handle = this.watch(topic, function () {
            callback.apply(scope, arguments);
            this.unwatch(handle);
        }, this);
        return handle;
    };

    /**
     * Remove an observer
     * @param {Handle} handle returned by the watch method
     * @returns {Boolean} true if there were subscribers
     */
    this.unwatch = function unwatch(handle) {
        var topic = handle[0], idx = handle[1];
        if (_topics[topic] && _topics[topic][idx]) {
            // delete value so the indexes don't move
            delete _topics[topic][idx];
            // If the topic is only set with falsy values, delete it;
            if (!_topics[topic].some(function (value) {
                return !!value;
            })) {
                delete _topics[topic];
            }
            return true;
        } else {
            return false;
        }
    };

    /**
     * Notifies observers that a topic has a new message
     * @param {String} topic the name of the topic to publish to
     * @param subject
     * @returns {Boolean} true if there was subscribers
     */
    this.notify = function notify(topic) {
        var observers = _topics[topic],
            args = toArray(arguments).slice(1);

        if (observers) {
            loop(observers, function (value) {
                try {
                    if (value) {
                        value[0].apply(value[1] || null, args);
                    }
                } catch (err) { }
            });
            return true;
        } else {
            return false;
        }
    };

    /**
     * Check if topic has the described observer
     * @param {Handle}
     * @returns {Boolean} true if exists
     */
    this.hasObserver = function hasObserver(handle) {
        return !!( handle && _topics[handle[0]] && _topics[handle[0]][handle[1]]);
    };

    /**
     * Check if a topic has observers
     * @param {String} topic the name of the topic
     * @returns {Boolean} true if topic is listened
     */
    this.hasTopic = function hasTopic(topic) {
        return !!_topics[topic];
    };

    /**
     * Unwatch all or unwatch all from topic
     * @param {String} topic optional unwatch all from topic
     * @returns {Boolean} true if ok
     */
    this.unwatchAll = function unwatchAll(topic) {
        if (_topics[topic]) {
            delete _topics[topic];
        } else {
            _topics = {};
        }
        return true;
    };
};

},{"assert":25,"simple-loop":13,"to-array":14}],16:[function(require,module,exports){
/**
* @license observable-store https://github.com/flams/observable-store
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var Observable = require("watch-notify"),
    diff = require("shallow-diff"),
    clone = require("shallow-copy"),
    compareNumbers = require("compare-numbers"),
    count = require("object-count"),
    nestedProperty = require("nested-property"),
    simpleLoop = require("simple-loop");

/**
 * @class
 * Store creates an observable structure based on a key/values object
 * or on an array
 * @param {Array/Object} the data to initialize the store with
 * @returns
 */
module.exports = function StoreConstructor($data) {

    /**
     * Where the data is stored
     * @private
     */
    var _data = clone($data) || {},

    /**
     * The observable for publishing changes on the store iself
     * @private
     */
    _storeObservable = new Observable(),

    /**
     * The observable for publishing changes on a value
     * @private
     */
    _valueObservable = new Observable(),

    /**
     * Saves the handles for the subscriptions of the computed properties
     * @private
     */
    _computed = [],

    /**
     * Gets the difference between two objects and notifies them
     * @private
     * @param {Object} previousData
     */
    _notifyDiffs = function _notifyDiffs(previousData) {
        var diffs = diff(previousData, _data);
        ["updated",
         "deleted",
         "added"].forEach(function (value) {
             diffs[value].forEach(function (dataIndex) {
                    _storeObservable.notify(value, dataIndex, _data[dataIndex]);
                    _valueObservable.notify(dataIndex, _data[dataIndex], value);
             });
        });
    };

   /**
    * Get the number of items in the store
    * @returns {Number} the number of items in the store
    */
    this.count = function() {
        return count(_data);
    };

    /**
     * Get a value from its index
     * @param {String} name the name of the index
     * @returns the value
     */
    this.get = function get(name) {
        return _data[name];
    };

    /**
     * Checks if the store has a given value
     * @param {String} name the name of the index
     * @returns {Boolean} true if the value exists
     */
    this.has = function has(name) {
        return _data.hasOwnProperty(name);
    };

    /**
     * Set a new value and overrides an existing one
     * @param {String} name the name of the index
     * @param value the value to assign
     * @returns true if value is set
     */
    this.set = function set(name, value) {
        var hasPrevious,
            previousValue,
            action;

        if (typeof name != "undefined") {
            hasPrevious = this.has(name);
            previousValue = this.get(name);
            _data[name] = value;
            action = hasPrevious ? "updated" : "added";
            _storeObservable.notify(action, name, _data[name], previousValue);
            _valueObservable.notify(name, _data[name], action, previousValue);
            return true;
        } else {
            return false;
        }
    };

    /**
     * Update the property of an item.
     * @param {String} name the name of the index
     * @param {String} property the property to modify.
     * @param value the value to assign
     * @returns false if the Store has no name index
     */
    this.update = function update(name, property, value) {
        var item;
        if (this.has(name)) {
            item = this.get(name);
            nestedProperty.set(item, property, value);
            _storeObservable.notify("updated", property, value);
            _valueObservable.notify(name, item, "updated");
            return true;
        } else {
            return false;
        }
    };

    /**
     * Delete value from its index
     * @param {String} name the name of the index from which to delete the value
     * @returns true if successfully deleted.
     */
    this.del = function del(name) {
        var previous;
        if (this.has(name)) {
            if (!this.alter("splice", name, 1)) {
                previous = _data[name];
                delete _data[name];
                _storeObservable.notify("deleted", name, undefined, previous);
                _valueObservable.notify(name, _data[name], "deleted", previous);
            }
            return true;
        } else {
            return false;
        }
    };

    /**
     * Delete multiple indexes. Prefer this one over multiple del calls.
     * @param {Array}
     * @returns false if param is not an array.
     */
    this.delAll = function delAll(indexes) {
        if (Array.isArray(indexes)) {
            // Indexes must be removed from the greatest to the lowest
            // To avoid trying to remove indexes that don't exist.
            // i.e: given [0, 1, 2], remove 1, then 2, 2 doesn't exist anymore
            indexes.sort(compareNumbers.desc)
                .forEach(this.del, this);
            return true;
        } else {
            return false;
        }
    };

    /**
     * Alter the data by calling one of it's method
     * When the modifications are done, it notifies on changes.
     * If the function called doesn't alter the data, consider using proxy instead
     * which is much, much faster.
     * @param {String} func the name of the method
     * @params {*} any number of params to be given to the func
     * @returns the result of the method call
     */
    this.alter = function alter(func) {
        var apply,
            previousData;

        if (_data[func]) {
            previousData = clone(_data);
            apply = this.proxy.apply(this, arguments);
            _notifyDiffs(previousData);
            _storeObservable.notify("altered", _data, previousData);
            return apply;
        } else {
            return false;
        }
    };

    /**
     * Proxy is similar to alter but doesn't trigger events.
     * It's preferable to call proxy for functions that don't
     * update the interal data source, like slice or filter.
     * @param {String} func the name of the method
     * @params {*} any number of params to be given to the func
     * @returns the result of the method call
     */
    this.proxy = function proxy(func) {
        if (_data[func]) {
            return _data[func].apply(_data, Array.prototype.slice.call(arguments, 1));
        } else {
            return false;
        }
    };

    /**
     * Watch the store's modifications
     * @param {String} added/updated/deleted
     * @param {Function} func the function to execute
     * @param {Object} scope the scope in which to execute the function
     * @returns {Handle} the subscribe's handler to use to stop watching
     */
    this.watch = function watch(name, func, scope) {
        return _storeObservable.watch(name, func, scope);
    };

    /**
     * Unwatch the store modifications
     * @param {Handle} handle the handler returned by the watch function
     * @returns
     */
    this.unwatch = function unwatch(handle) {
        return _storeObservable.unwatch(handle);
    };

    /**
     * Get the observable used for watching store's modifications
     * Should be used only for debugging
     * @returns {Observable} the Observable
     */
    this.getStoreObservable = function getStoreObservable() {
        return _storeObservable;
    };

    /**
     * Watch a value's modifications
     * @param {String} name the name of the value to watch for
     * @param {Function} func the function to execute
     * @param {Object} scope the scope in which to execute the function
     * @returns handler to pass to unwatchValue
     */
    this.watchValue = function watchValue(name, func, scope) {
        return _valueObservable.watch(name, func, scope);
    };

    /**
     * Unwatch the value's modifications
     * @param {Handler} handler the handler returned by the watchValue function
     * @private
     * @returns true if unwatched
     */
    this.unwatchValue = function unwatchValue(handler) {
        return _valueObservable.unwatch(handler);
    };

    /**
     * Get the observable used for watching value's modifications
     * Should be used only for debugging
     * @private
     * @returns {Observable} the Observable
     */
    this.getValueObservable = function getValueObservable() {
        return _valueObservable;
    };

    /**
     * Loop through the data
     * @param {Function} func the function to execute on each data
     * @param {Object} scope the scope in wich to run the callback
     */
    this.loop = function loop(func, scope) {
        simpleLoop(_data, func, scope);
    };

    /**
     * Reset all data and get notifications on changes
     * @param {Arra/Object} data the new data
     * @returns {Boolean}
     */
    this.reset = function reset(data) {
        if (typeof data == "object") {
            var previousData = clone(_data);
            _data = clone(data) || {};
            _notifyDiffs(previousData);
            _storeObservable.notify("resetted", _data, previousData);
            return true;
        } else {
            return false;
        }

    };

    /**
     * Compute a new property from other properties.
     * The computed property will look exactly similar to any none
     * computed property, it can be watched upon.
     * @param {String} name the name of the computed property
     * @param {Array} computeFrom a list of properties to compute from
     * @param {Function} callback the callback to compute the property
     * @param {Object} scope the scope in which to execute the callback
     * @returns {Boolean} false if wrong params given to the function
     */
    this.compute = function compute(name, computeFrom, callback, scope) {
        var args = [];

        if (typeof name == "string" &&
            typeof computeFrom == "object" &&
            typeof callback == "function" &&
            !this.isCompute(name)) {

            _computed[name] = [];

            simpleLoop(computeFrom, function (property) {
                _computed[name].push(this.watchValue(property, function () {
                    this.set(name, callback.call(scope));
                }, this));
            }, this);

            this.set(name, callback.call(scope));
            return true;
        } else {
            return false;
        }
    };

    /**
     * Remove a computed property
     * @param {String} name the name of the computed to remove
     * @returns {Boolean} true if the property is removed
     */
    this.removeCompute = function removeCompute(name) {
        if (this.isCompute(name)) {
            simpleLoop(_computed[name], function (handle) {
                this.unwatchValue(handle);
            }, this);
            this.del(name);

            delete _computed[name];
            return true;
        } else {
            return false;
        }
    };

    /**
     * Tells if a property is a computed property
     * @param {String} name the name of the property to test
     * @returns {Boolean} true if it's a computed property
     */
    this.isCompute = function isCompute(name) {
        return !!_computed[name];
    };

    /**
     * Returns a JSON version of the data
     * Use dump if you want all the data as a plain js object
     * @returns {String} the JSON
     */
    this.toJSON = function toJSON() {
        return JSON.stringify(_data);
    };

    /**
     * Returns the store's data
     * @returns {Object} the data
     */
    this.dump = function dump() {
        return _data;
    };
};

},{"compare-numbers":17,"nested-property":18,"object-count":19,"shallow-copy":20,"shallow-diff":21,"simple-loop":22,"watch-notify":23}],17:[function(require,module,exports){
module.exports=require(8)
},{}],18:[function(require,module,exports){
/**
* @license nested-property https://github.com/cosmosio/nested-property
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert");

module.exports = {
  set: setNestedProperty,
  get: getNestedProperty
}

/**
 * Get the property of an object nested in one or more objects
 * given an object such as a.b.c.d = 5, getNestedProperty(a, "b.c.d") will return 5.
 * @param {Object} object the object to get the property from
 * @param {String} property the path to the property as a string
 * @returns the object or the the property value if found
 */
function getNestedProperty(object, property) {
    if (object && object instanceof Object) {
        if (typeof property == "string" && property !== "") {
            var split = property.split(".");
            return split.reduce(function (obj, prop) {
                return obj && obj[prop];
            }, object);
        } else if (typeof property == "number") {
            return object[property];
        } else {
            return object;
        }
    } else {
        return object;
    }
}

/**
 * Set the property of an object nested in one or more objects
 * If the property doesn't exist, it gets created.
 * @param {Object} object
 * @param {String} property
 * @param value the value to set
 * @returns object if no assignment was made or the value if the assignment was made
 */
function setNestedProperty(object, property, value) {
    if (object && object instanceof Object) {
        if (typeof property == "string" && property !== "") {
            var split = property.split(".");
            return split.reduce(function (obj, prop, idx) {
                obj[prop] = obj[prop] || {};
                if (split.length == (idx + 1)) {
                    obj[prop] = value;
                }
                return obj[prop];
            }, object);
        } else if (typeof property == "number") {
            object[property] = value;
            return object[property];
        } else {
            return object;
        }
    } else {
        return object;
    }
}

},{"assert":25}],19:[function(require,module,exports){
/**
* @license object-count https://github.com/cosmosio/object-count
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert");

/**
 * Count the number of properties in an object or the number or items
 * in an array.
 * It doesn't look up in the prototype chain
 * @param {Object} object the object to get the number of items/properties from
 * @returns {Number}
 */
module.exports = function count(object) {
  assert(typeof object == "object", "object must be an array or an object");

  if (Array.isArray(object)) {
    return object.length;
  } else {
    return count(Object.keys(object));
  }
};

},{"assert":25}],20:[function(require,module,exports){
module.exports = function (obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    var copy;
    
    if (isArray(obj)) {
        var len = obj.length;
        copy = Array(len);
        for (var i = 0; i < len; i++) {
            copy[i] = obj[i];
        }
    }
    else {
        var keys = objectKeys(obj);
        copy = {};
        
        for (var i = 0, l = keys.length; i < l; i++) {
            var key = keys[i];
            copy[key] = obj[key];
        }
    }
    return copy;
};

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) {
        if ({}.hasOwnProperty.call(obj, key)) keys.push(key);
    }
    return keys;
};

var isArray = Array.isArray || function (xs) {
    return {}.toString.call(xs) === '[object Array]';
};

},{}],21:[function(require,module,exports){
/**
* @license shallow-diff https://github.com/cosmosio/shallow-diff
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert"),
  loop = require("simple-loop");

/**
 * Make a diff between two objects
 * @param {Array/Object} base the base object
 * @param {Array/Object} compared the object to compare the base with
 * @example:
 *  With objects:
 *
 *  base = {a:1, b:2, c:3, d:4, f:6}
 *  compared = {a:1, b:20, d: 4, e: 5}
 *  will return :
 *  {
 *      unchanged: ["a", "d"],
 *      updated: ["b"],
 *      deleted: ["f"],
 *      added: ["e"]
 *  }
 *
 * It also works with Arrays:
 *
 *  base = [10, 20, 30]
 *  compared = [15, 20]
 *  will return :
 *  {
 *      unchanged: [1],
 *      updated: [0],
 *      deleted: [2],
 *      added: []
 *  }
 *
 * @returns object
 */
module.exports = function shallowDiff(base, compared) {
  assert(typeof base == "object", "the first object to compare with shallowDiff needs to be an object");
  assert(typeof compared == "object", "the second object to compare with shallowDiff needs to be an object");

  var unchanged = [],
      updated = [],
      deleted = [],
      added = [];

   // Loop through the compared object
   loop(compared, function (value, idx) {

       // To get the added
       if (typeof base[idx] == "undefined") {
           added.push(idx);

       // The updated
     } else if (value !== base[idx]) {
           updated.push(idx);

       // And the unchanged
     } else if (value === base[idx]) {
           unchanged.push(idx);
       }

   });

   // Loop through the before object
   loop(base, function (value, idx) {

      // To get the deleted
      if (typeof compared[idx] == "undefined") {
          deleted.push(idx);
      }
   });

  return {
      updated: updated,
      unchanged: unchanged,
      added: added,
      deleted: deleted
  };
};

},{"assert":25,"simple-loop":22}],22:[function(require,module,exports){
module.exports=require(5)
},{"assert":25}],23:[function(require,module,exports){
module.exports=require(15)
},{"assert":25,"simple-loop":22,"to-array":24}],24:[function(require,module,exports){
module.exports=require(6)
},{}],25:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":29}],26:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],27:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],28:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],29:[function(require,module,exports){
var process=require("__browserify_process"),global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"./support/isBuffer":28,"__browserify_process":27,"inherits":26}]},{},[1])