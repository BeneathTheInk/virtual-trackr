var Trackr = require("trackr");
var _ = require("underscore");
var VText = require("virtual-dom/vnode/vtext");
var createElement = require('virtual-dom/create-element');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var matchesSelector = require("matches-selector");

function VTrackr(fn) {
	if (!(this instanceof VTrackr)) return new VTrackr(fn);
	if (typeof fn === "function") this.render = fn;
	this.mount();
}

module.exports = VTrackr;
VTrackr.extend = require("backbone-extend-standalone");

_.extend(VTrackr.prototype, {
	type: "Widget",

	autorun: function(fn) {
		return Trackr.autorun(fn, this);
	},

	mount: function() {
		if (this.comp) this.stop();

		this.comp = this.autorun(function(comp) {
			var newtree = this.render.call(this, comp),
				oldNode;

			if (typeof newtree === "string") {
				newtree = new VText(newtree);
			}

			this._latestTree = newtree;
			if (this.node) this.updateNode();

			comp.onInvalidate(function() {
				if (comp.stopped) {
					this._latestTree = null;
					delete this.comp;
				}
			});
		});

		return this;
	},

	stop: function() {
		if (this.comp) this.comp.stop();
		return this;
	},

	updateNode: function() {
		// must have changed
		if (!this._latestTree) return this;

		// create a new node if none is set
		if (!this.node || !this._tree) {
			this.node = createElement(this._latestTree);
		}

		// otherwise patch and apply new tree
		else {
			var oldNode = this.node;
			this.node = patch(oldNode, diff(this._tree, this._latestTree));

			if (this.node !== oldNode && oldNode.parentNode) {
				oldNode.parentNode.replaceChild(this.node, oldNode);
			}
		}

		this._tree = this._latestTree;
		this._latestTree = null;

		return this;
	},

	init: function() {
		this.updateNode();
		return this.node;
	},

	update: function(previous, node) {
		var prevtree = previous && previous._tree;
		if (!prevtree || !node) return this.init();

		// basically, don't be switching trees without calling destroy
		if (this.node && this.node !== node) {
			throw new Error("This VTrackr was already initated with a different node.");
		}

		// update internal state and update the node
		this.node = node;
		if (!this._latestTree) this._latestTree = this._tree;
		this._tree = prevtree;
		this.updateNode();

		return this.node;
	},

	destroy: function(node) {
		this.stop();
		this.node = null;
		this._tree = null;
	},

	paint: function(parent, before) {
		if (typeof parent === "string") parent = document.querySelector(parent);
		if (parent == null) throw new Error("Expecting a valid DOM element to attach in.");
		if (typeof before === "string") before = parent.querySelector(before);
		parent.insertBefore(this.init(), before);
		return this;
	},

	findAll: function(selector) {
		var matches = [],
			el = this.node;

		if (el) {
			if (el.nodeType === 1 && matchesSelector(el, selector)) matches.push(el);
			if (typeof el.querySelectorAll === "function") {
				matches.push.apply(matches, el.querySelectorAll(selector));
			}
		}

		return matches;
	},

	find: function(selector) {
		var el = this.node;

		if (el) {
			if (el.nodeType === 1 && matchesSelector(el, selector)) return el;
			if (typeof el.querySelector === "function") {
				return el.querySelector(selector);
			}
		}

		return null;
	}
});

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
