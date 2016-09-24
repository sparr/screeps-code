/*
 * Augment Structure with new methods
 */

module.exports = function() {

  Object.defineProperty(Structure.prototype, 'memory', {
    get: function() {
      Memory[this.structureType+'s'] = Memory[this.structureType+'s'] || {}
      return (Memory[this.structureType+'s'][this.id] = Memory[this.structureType+'s'][this.id] || {});
    },
    set: function(value) {
      Memory[this.structureType+'s'] = Memory[this.structureType+'s'] || {}
      return (Memory[this.structureType+'s'][this.id] = value);
    },
    configurable: true
  });

  Object.defineProperty(Structure.prototype, 'hitsRepairTarget', {
    get: function() {
      return this.memory.hitsRepairTarget || this.hitsMax;
    },
    set: function(value) {
      this.memory.hitsRepairTarget = value;
    },
    configurable: true
  });
};