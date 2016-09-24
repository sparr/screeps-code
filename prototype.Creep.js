/*
 * Augment Creep with new methods
 */

module.exports = function() {
    Creep.prototype.getBodyCost = function() {
        return (this.memory.bodyCost = this.memory.bodyCost || _sum(c.body, p=>BODYPART_COST[p.type]));
    };
};