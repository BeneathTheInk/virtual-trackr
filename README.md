# Virtual Trackr

[Virtual DOM](http://ghub.io/virtual-dom) meets [Trackr](http://ghub.io/trackr), a reactive view library.

## Install

Download a UMD bundle from the [releases page](https://github.com/tyler-johnson/virtual-trackr/releases). The variable `vtrackr` will be attached to `window`.

```html
<script type="text/javascript" src="trackr.js"></script>
<script type="text/javascript" src="virtual-trackr.js"></script>
```

If using Browserify or Node.js, you can install via NPM.

```sh
$ npm install trackr virtual-trackr
```

VTrackr depends on [Trackr](http://ghub.io/trackr). Please include it before this library. You will also probably need the [Virtual DOM](http://ghub.io/virtual-dom) library, but that is not required for VTrackr to run.

## Usage

VTrackr will manage a tree of virtual nodes and auto-update the DOM for you. To begin, run the main `vtrackr` method with a function that returns virtual nodes.

```js
var h = require("virtual-dom/h");

var myview = vtrackr(function() {
	return h("h1", "Hello World");
});
```

The returned view is a widget that can be used with other virtual nodes or rendered and appended to the document. Below are three different ways to render a VTrackr instance on the screen.

```js
myview.paint("body");
```

```js
var createElement = require("virtual-dom/create-element");
var node = createElement(myview);
document.body.appendChild(node);
```

```js
var createElement = require("virtual-dom/create-element");
var tree = h("div", [ myview ]);
var node = createElement(tree);
document.body.appendChild(node);
```

The VTrackr instance is now live. Any Trackr dependencies that change will invalidate and redraw the view.

```js
var name = "World";
var dep = new Trackr.Dependency();

var myview = vtrackr(function() {
	dep.depend();
	return h("h1", "Hello " + name);
});

myview.paint("body");

// later
name = "Dave";
dep.changed();
```

Just like Trackr, VTrackr instances can be nested within other instances. Children instances will automatically clean themselves up if the parent is rerun.

```js
var name = "World";
var dep = new Trackr.Dependency();

var myview = vtrackr(function() {
	// only rerenders the text node on changes
	var nameview = vtrackr(function() {
		dep.depend();
		return name;
	});

	return h("h1", [ "Hello", nameview ]);
});

myview.paint("body");
```
