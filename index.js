var Trackr;
var VText = require("virtual-dom/vnode/vtext");
var createElement = require('virtual-dom/create-element');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var matchesSelector = require("matches-selector");

try {
	Trackr = require("trackr");
} catch(e) {
	Trackr = global.Trackr;
}

function VTrackr(fn) {
	if (!(this instanceof VTrackr)) return new VTrackr(fn);
	if (typeof fn === "function") this.render = fn;
	this.mount();
};

module.exports = VTrackr;

VTrackr.prototype.type = "Widget";

VTrackr.prototype.autorun = function(fn) {
	return Trackr.autorun(fn, this);
};

VTrackr.prototype.mount = function() {
	this.stop();

	this.comp = this.autorun(function(comp) {
		var newtree = this.render(comp);

		if (typeof newtree === "string") {
			newtree = new VText(newtree);
		}

		this._latestTree = newtree;
		if (this.node) this.refresh();

		comp.onInvalidate(function() {
			if (comp.stopped) {
				this._latestTree = null;
				delete this.comp;
			}
		});
	});

	return this;
};

VTrackr.prototype.stop = function() {
	if (this.comp) this.comp.stop();
	return this;
};

VTrackr.prototype.refresh = function() {
	// must have changed
	if (!this._latestTree) return this;

	// create a new node if none is set
	if (!this.node || !this._tree) {
		this.node = createElement(this._latestTree);
	}

	// otherwise patch and apply new tree
	else {
		this.node = patch(this.node, diff(this._tree, this._latestTree));
	}

	this._tree = this._latestTree;
	this._latestTree = null;

	return this;
};

VTrackr.prototype.init = function() {
	this.refresh();
	return this.node;
};

VTrackr.prototype.update = function(previous, node) {
	var prevtree = previous && previous._tree;
	if (previous) previous.destroy();
	if (!prevtree || !node) return this.init();

	// basically, don't be switching trees without calling destroy
	if (this.node && this.node !== node) {
		throw new Error("This VTrackr was already initated with a different node.");
	}

	// update internal state and update the node
	this.node = node;
	if (!this._latestTree) this._latestTree = this._tree;
	this._tree = prevtree;
	this.refresh();

	return this.node;
};

VTrackr.prototype.destroy = function(node) {
	this.stop();
	this.node = null;
	this._tree = null;
};

VTrackr.prototype.paint = function(parent, before) {
	if (typeof parent === "string") parent = document.querySelector(parent);
	if (parent == null) throw new Error("Expecting a valid DOM element to attach in.");
	if (typeof before === "string") before = parent.querySelector(before);
	parent.insertBefore(this.init(), before);
	return this;
};

VTrackr.prototype.findAll = function(selector) {
	var matches = [],
		el = this.node;

	if (el) {
		if (el.nodeType === 1 && matchesSelector(el, selector)) matches.push(el);
		if (typeof el.querySelectorAll === "function") {
			matches.push.apply(matches, el.querySelectorAll(selector));
		}
	}

	return matches;
};

VTrackr.prototype.find = function(selector) {
	var el = this.node;

	if (el) {
		if (el.nodeType === 1 && matchesSelector(el, selector)) return el;
		if (typeof el.querySelector === "function") {
			return el.querySelector(selector);
		}
	}

	return null;
};

// proxy a few computation methods
["invalidate","onInvalidate"].forEach(function(method) {
	VTrackr.prototype[method] = function() {
		if (!this.comp) {
			throw new Error("Cannot run " + method + "(). This VTrackr is not mounted.");
		}

		this.comp[method].apply(this.comp, arguments);
		return this;
	}
});
