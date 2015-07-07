var Trackr = require("trackr");
var _ = require("underscore");
var VText = require("virtual-dom/vnode/vtext");
var createElement = require('virtual-dom/create-element');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var matchesSelector = require("matches-selector");

function VTrackr(fn) {
	if (!(this instanceof VTrackr)) return new VTrackr(fn);

	this._tree = null;
	this._node = null;
	if (typeof fn === "function") this.render = fn;

	this.comp = Trackr.autorun(function(comp) {
		var newtree = this.render.call(this, comp),
			oldNode;

		if (typeof newtree === "string") {
			newtree = new VText(newtree);
		}

		if (this._node) {
			var oldNode = this._node;
			this._node = patch(oldNode, diff(this._tree, newtree));

			if (this._node !== oldNode && oldNode.parentNode) {
				oldNode.parentNode.replaceChild(this._node, oldNode);
			}
		}

		this._tree = newtree;
	}, this);
}

module.exports = VTrackr;
VTrackr.extend = require("backbone-extend-standalone");

_.extend(VTrackr.prototype, {
	type: "Widget",

	init: function() {
		return this._node = createElement(this._tree);
	},

	update: function(previous, node) {
		var prevtree = previous && previous._tree;
		if (!prevtree) return this.init();
		return this._node = patch(node, diff(prevtree, this._tree));
	},

	destroy: function(node) {
		this.comp.stop();
		this._node = null;
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
			el = this._node;

		if (el) {
			if (el.nodeType === 1 && matchesSelector(el, selector)) matches.push(el);
			if (typeof el.querySelectorAll === "function") {
				matches.push.apply(matches, el.querySelectorAll(selector));
			}
		}

		return matches;
	},

	find: function(selector) {
		var el = this._node;

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
["invalidate","onInvalidate","stop"].forEach(function(method) {
	VTrackr.prototype[method] = function() {
		this.comp[method].apply(this.comp, arguments);
		return this;
	}
});
