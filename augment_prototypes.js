var prototypeModules = [
// one module per prototype
  'Creep',
  'RoomPosition',
  'Structure',
// one module per concept
  'MemoryEntitiesID',
  'Logging'
];

// disable modules by passing options like {modulename:false}
module.exports = function(options={}) {
  for(let m of prototypeModules) {
    if(!(options.hasOwnProperty(m) && options.m === false)) {
      require('prototype.'+m)();
    }
  }
};