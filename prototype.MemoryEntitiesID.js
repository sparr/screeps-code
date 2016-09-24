/*
 * Augment various prototypes to refer to Memory.entities[id]
 */

Memory.entities = Memory.entities || {};

module.exports = function() {

  Object.defineProperty(RoomObject.prototype, 'memid', {
    get: function() {
      return (Memory.entities[this.id] = Memory.entities[this.id] || {});
    },
    set: function(value) {
      return (Memory.entities[this.id] = value);
    },
    configurable: true
  });

  Object.defineProperty(Creep.prototype, 'memid', {
    get: function() {
      return (Memory.creeps[this.name] = (Memory.entities[this.id] = Memory.entities[this.id] || Memory.creeps[this.name] || {}));
    },
    set: function(value) {
      return (Memory.creeps[this.name] = Memory.entities[this.id] = value);
    },
    configurable: true
  });

  Object.defineProperty(Room.prototype, 'memid', {
    get: function() {
      return (Memory.rooms[this.name] = (Memory.entities['room.'+this.name] = Memory.entities['room.'+this.name] || Memory.rooms[this.name] || {}));
    },
    set: function(value) {
      return (Memory.rooms[this.name] = Memory.entities['room.'+this.name] = value);
    },
    configurable: true
  });

  Object.defineProperty(Structure.prototype, 'memid', {
    get: function() {
      Memory[this.structureType+'s'] = Memory[this.structureType+'s'] || {}
      return (Memory[this.structureType+'s'][this.id] = (Memory.entities[this.id] = Memory.entities[this.id] || Memory[this.structureType+'s'][this.id] || {}));
    },
    set: function(value) {
      Memory[this.structureType+'s'] = Memory[this.structureType+'s'] || {}
      return (Memory[this.structureType+'s'][this.id] = Memory.entities[this.id] = value);
    },
    configurable: true
  });

  Object.defineProperty(StructureSpawn.prototype, 'memid', {
    get: function() {
      return (Memory.spawns[this.name] = (Memory.entities[this.id] = Memory.entities[this.id] || Memory.spawns[this.name] || {}));
    },
    set: function(value) {
      return (Memory.spawns[this.name] = Memory.entities[this.id] = value);
    },
    configurable: true
  });

  Object.defineProperty(Flag.prototype, 'memid', {
    get: function() {
      return (Memory.flags[this.name] = (Memory.entities['flag.'+this.name] = Memory.entities['flag.'+this.name] || Memory.flags[this.name] || {}));
    },
    set: function(value) {
      return (Memory.flags[this.name] = Memory.entities['flag.'+this.name] = value);
    },
    configurable: true
  });
};