var diff = require('virtual-dom/diff');
var VNode = require("virtual-dom/vnode/vnode");

module.exports = function(a, b) {
	return diff(new VNode("div", {}, a), new VNode("div", {}, b));
}
