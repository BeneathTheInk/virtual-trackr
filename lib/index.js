var Trackr = require("trackr");
var _ = require("underscore");
var VText = require("virtual-dom/vnode/vtext");
var createElement = require('virtual-dom/create-element');
var observeMove = require("./on-move");
var matchesSelector = require("matches-selector");
var Events = require("backbone-events-standalone");
var utils = require("./utils");

function VTrackr(fn) {
	if (!(this instanceof VTrackr)) return new VTrackr(fn);

	this.id = _.uniqueId("$");
	this.placeholder = document.createTextNode("");
	if (typeof fn === "function") this.render = fn;

	observeMove(this.placeholder, this.updateNodes.bind(this, null));
}

module.exports = VTrackr;
VTrackr.extend = require("backbone-extend-standalone");

VTrackr.active = null;

VTrackr.create = function(fn, props, cprops) {
	var ctor = function() {
		if (!(this instanceof ctor)) {
			var nobj = Object.create(ctor.prototype);
			return ctor.apply(nobj, arguments);
		}

		VTrackr.call(this);
		if (this.initialize) this.initialize.apply(this, arguments);
	}

	if (typeof fn !== "function") {
		cprops = props;
		props = fn;
		fn = null;
	}

	return VTrackr.extend(_.extend({
		constructor: ctor,
		render: fn
	}, props), cprops);
}

_.extend(VTrackr.prototype, Events, {
	type: "Widget",

	autorun: function(fn) { return Trackr.autorun(fn, this); },

	clearNodes: function() {
		if (this._nodes) {
			this._nodes.forEach(function(n) {
				if (n.parentNode) n.parentNode.removeChild(n);
			});
			delete this._nodes;
		}

		return this;
	},

	updateNodes: function(newdom) {
		if (newdom != null && !_.isArray(newdom)) newdom = null;

		// if not in the DOM, take everything down
		if (!this.inDOM()) {
			this.clearNodes();
			if (newdom) this._tree = newdom;
			return this;
		}

		var phold = this.placeholder;
		var parent = this.placeholder.parentNode;

		// no nodes, so create from scratch
		if (!this._nodes) {
			// just replace the tree with the new dom
			if (newdom) this._tree = newdom;

			// no tree? refresh was called early
			if (!this._tree) return this;

			// create a fresh set of nodes from the tree
			this._nodes = this._tree.map(function(t) {
				return createElement(t);
			});
		}

		// if there are existing nodes and new dom, diff and patch
		else if (newdom) {
			// diff and patch
			this._nodes = utils.multipatch(
				{ parent: parent, before: phold },
				this._nodes.slice(0),
				utils.mutlidiff(this._tree, newdom);
			);
			
			// update the internal tree
			this._tree = newdom;
		}

		// apply all nodes onto the parent
		// we do it backwards so nodes don't get moved if they don't need to
		for (var i = this._nodes.length - 1; i >= 0; i--) {
			var before = this._nodes[i + 1] || phold;
			if (this._nodes[i].nextSibling !== before) {
				parent.insertBefore(this._nodes[i], before);
			}
		}

		return this;
	},

	inDOM: function() {
		return this.placeholder.parentNode != null;
	},

	// a generalized reactive workflow helper
	mount: function() {
		Trackr.nonreactive(function() {
			// stop existing mount
			this.stop();

			// the first event in the cycle, before everything else
			this.trigger("mount:before");
		}, this);

		// the autorun computation
		var comp = this.autorun(function(comp) {
			var newdom;
			this.comp = comp;

			// render
			newdom = this.render(comp);
			newdom = _.compact([].concat(newdom)).map(function(t) {
				if (typeof t === "string") t = new VText(t);
				return t;
			});

			// paint the dom changes
			this.updateNodes(newdom);

			// event about the render
			this.trigger("render", comp);

			// auto clean up
			comp.onInvalidate(function() {
				// remaining invalidate events
				this.trigger("invalidate", comp);

				// detect if the computation stopped
				if (comp.stopped) {
					this.trigger("stop", comp);
					delete this.comp;
					this.updateNodes([]); // ensure virtual-dom clean up
				}
			});
		});

		Trackr.nonreactive(function() {
			// last mount event happens after the first render
			this.trigger("mount:after", comp);
		}, this);

		return this;
	},

	stop: function() {
		if (this.comp) this.comp.stop();
		return this;
	},

	invalidate: function() {
		if (this.comp) this.comp.invalidate();
		return this;
	},

	onInvalidate: function(fn, ctx) {
		if (this.comp) this.comp.onInvalidate(fn, ctx);
		return this;
	},

	getComputation: function() {
		return this.comp;
	},

	attach: function(parent, before) {
		if (typeof parent === "string") parent = document.querySelector(parent);
		if (parent == null) throw new Error("Expecting a valid DOM element to attach in.");
		if (typeof before === "string") before = parent.querySelector(before);
		parent.insertBefore(this.placeholder, before);
		return this;
	},

	paint: function() {
		this.attach.apply(this, arguments);
		this.mount();
		return this;
	},

	init: function() {
		this.mount();
		return this.placeholder;
	},

	update: function(previous, node) {
		if (previous.destroy) previous.destroy();
		this.mount();
		return this.placeholder;
	},

	destroy: function(node) {
		this.stop();
		this.clearNodes();
		delete this._tree;
		return this;
	},

	findAll: function(selector) {
		var matches = [],
			el;

		if (this._nodes) for (var i in this._nodes) {
			el = this._nodes[i];
			if (el.nodeType === 1 && matchesSelector(el, selector)) matches.push(el);
			if (typeof el.querySelectorAll === "function") {
				matches.push.apply(matches, el.querySelectorAll(selector));
			}
		}

		return matches
	},

	find: function(selector) {
		var el, res;

		if (this._nodes) for (var i in this._nodes) {
			el = this._nodes[i];
			if (el.nodeType === 1 && matchesSelector(el, selector)) {
				res = el;
			} else if (typeof el.querySelector === "function") {
				res = el.querySelector(selector)
			}

			if (res != null) return res;
		}

		return null;
	}
});
