var _ = require("underscore");

var observed = [];

var observer = new MutationObserver(function(res) {
	observed.forEach(function(o) {
		var oldParent = o.parent;
		var oldBefore = o.before;

		if (oldParent === o.node.parentNode &&
			oldBefore === o.node.nextSibling) return;

		o.parent = o.node.parentNode;
		o.before = o.node.nextSibling;

		o.fns.forEach(function(fn) {
			fn(oldParent, oldBefore);
		});
	});
});

observer.observe(document, {
	childList: true,
	subtree: true
});

module.exports = function(node, fn) {
	var item = _.findWhere(observed, { node: node });

	if (item == null) {
		observed.push(item = {
			node: node,
			fns: []
		});
	}

	item.fns.push(fn);
	item.parent = node.parentNode;
	item.before = node.nextSibling;
}
