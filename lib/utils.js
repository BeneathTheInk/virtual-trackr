
// inserts an array nodes into a parent
exports.insertNodes = function(nodes, parent, before) {
	var node, next, i;

	if (Position.isPosition(parent)) {
		before = parent.before;
		parent = parent.parent;
	}

	// we do it backwards so nodes don't get moved if they don't need to
	for (i = nodes.length - 1; i >= 0; i--) {
		node = nodes[i];
		next = nodes[i + 1] || before;

		if (node.nextSibling !== before) {
			parent.insertBefore(node, next);
		}
	}
}

function Position(parent, before) {
	this.parent = parent;
	this.before = before || null;
}

exports.Position = Position;
Position.isPosition = function(p) {
	return p && p.parent != null && p.before !== void 0;
}
