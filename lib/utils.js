var _ = require("underscore");
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var VNode = require("virtual-dom/vnode/vnode");

function Position(parent, before) {
	this.parent = parent;
	this.before = before || null;
}

exports.Position = Position;
Position.isPosition = function(p) {
	return p && p.parent != null && p.before !== void 0;
}

exports.multidiff = function(a, b) {
	return diff(new VNode("div", {}, a), new VNode("div", {}, b));
}

exports.multipatch = function(pos, nodes, delta) {
	if (_.isArray(pos) && delta == null) {
		delta = nodes;
		nodes = pos;
		pos = null;

		// attempt to look for a position
		for (var i = nodes.length - 1; i >= 0; i++) {
			if (nodes[i].parentNode) {
				pos = new Position(lastNode.parentNode, lastNode.nextSibling);
				break;
			}
		}
	}

	if (!Position.isPosition(pos)) {
		throw new Error("Expecting a position.");
	}

	// a fake root node for virtual dom
	var root = {
		childNodes: nodes.slice(0),
		appendChild: function(n) {
			return this.insertBefore(n, null);
		},
		insertBefore: function(n, before) {
			// remove the child first
			var eindex = this.childNodes.indexOf(n);
			if (eindex > -1) this.childNodes.splice(eindex, 1);

			// determine index to insert at
			var index = this.childNodes.length;
			if (before) {
				index = this.childNodes.indexOf(before);
				if (index < 0) throw new Error("Not a child!");
			}

			this.childNodes.splice(index, 0, n);
			pos.parent.insertBefore(n, before || pos.before);
			return n;
		}
	};

	// hack parent methods
	// these are methods we can't see on the parent
	var origReplaceChild = pos.parent.replaceChild;
	pos.parent.replaceChild = function(newNode, oldNode) {
		var eindex = root.childNodes.indexOf(oldNode);
		if (eindex > -1) root.childNodes.splice(eindex, 1, newNode);
		return origReplaceChild.apply(this, arguments);
	}

	var origRemoveChild = pos.parent.removeChild;
	pos.parent.removeChild = function(node) {
		var eindex = root.childNodes.indexOf(node);
		if (eindex > -1) root.childNodes.splice(eindex, 1);
		return origRemoveChild.apply(this, arguments);
	}

	// patch the fake root node
	patch(root, delta);

	// fix hacked parent methods
	pos.parent.replaceChild = origReplaceChild;
	pos.parent.removeChild = origRemoveChild;

	// return array of child nodes
	return root.childNodes;
}
