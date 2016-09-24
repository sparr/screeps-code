/*
 * Augment RoomPosition with new methods
 */

module.exports = function() {

  // make RoomPosition.pos refer to itself, for action target resolution purposes
  Object.defineProperty(RoomPosition.prototype, 'pos', {
    get: function() {
      return this;
    },
    configurable: true
  });

  RoomPosition.prototype.isLookable = function() {
    return Game.rooms[this.roomName]?true:false;
  };

  // can a creep walk into this position?
  RoomPosition.prototype.isWalkable = function() {
    if(!this.isLookable()) {
      return null;
    }
    var atPos = this.look();
    var SWAMP = "swamp";
    var PLAIN = "plain";
    for (var i = 0; i < atPos.length; i++) {
      switch (atPos[i].type) {
        case LOOK_TERRAIN:
          if (atPos[i].terrain != PLAIN && atPos[i].terrain != SWAMP)
            return false;
          break;
        case LOOK_STRUCTURES:
          if (OBSTACLE_OBJECT_TYPES.includes(atPos[i].structure.structureType))
            return false;
          break;
        case LOOK_CREEPS:
        case LOOK_SOURCES:
        case LOOK_MINERALS:
        case LOOK_NUKES:
        case LOOK_ENERGY:
        case LOOK_RESOURCES:
        case LOOK_FLAGS:
        case LOOK_CONSTRUCTION_SITES:
          break;
        default:
      }
    }
    return true;
  };

  RoomPosition.prototype.normalize = function() {
    let exits = false;
    if(this.x<0) {
      this.x=this.x+50;
      exits = exits || Game.map.describeExits(this.roomName);
      this.roomName = exits["7"];
    }
    if(this.x>49) {
      this.x=this.x-50;
      exits = exits || Game.map.describeExits(this.roomName);
      this.roomName = exits["3"];
    }
    if(this.y<0) {
      this.y=this.y+50;
      exits = exits || Game.map.describeExits(this.roomName);
      this.roomName = exits["1"];
    }
    if(this.y>49) {
      this.y=this.y-50;
      exits = exits || Game.map.describeExits(this.roomName);
      this.roomName = exits["5"];
    }
    return this;
  }

  RoomPosition.prototype.findWalkableAtRange = function(range) {
    results = [];
    for(let x = this.x-range; x <= this.x+range; x++) {
      for(let y = this.y-range; y <= this.y+range; y++) {
        if(!(x==this.x-range||x==this.x+range||y==this.y-range||y==this.y+range)) {
          continue;
        }
        let cand = new RoomPosition(x,y,this.roomName);
        cand.normalize();
        if(cand.isWalkable()) {
          results.push(cand);
        }
      }
    }
    return results;
  };

  RoomPosition.prototype.findWalkableInRange = function(range) {
    results = [];
    for(let dist=0; dist<=range; dist++) {
      results = results.concat(this.findWalkableAtRange(dist));
    }
    return results;
  };

  RoomPosition.prototype.findClosestWalkablePositions = function(minpositions=1,maxrange=50) {
    results = [];
    for(let dist=0; dist <= range; dist++) {
      results = results.concat(this.findWalkableAtRange(dist));
      if(results.length >= minpositions) {
        break;
      }
    }
    return results;
  };

  // absolute world coordinates, with 0,0 indicating the top left corner of E0S0
  Object.defineProperty(RoomPosition.prototype, 'worldPosition', {
    get: function() {
      let worldpos = [0,0];
      let nameparts = this.roomName.split(/([NESW])/);
      if(nameparts[1]=='E') {
        worldpos[0] = (nameparts[2]*50) + this.x;
      }
      else {
        worldpos[0] = (nameparts[2]*-50) - (50-this.x);
      }
      if(nameparts[3]=='S') {
        worldpos[1] = (nameparts[4]*50) + this.y;
      }
      else {
        worldpos[1] = (nameparts[4]*-50) - (50-this.y);
      }
      return worldpos;
    },
    configurable: true
  });

  RoomPosition.prototype.worldDistance = function(pos2) {
    if(!(pos2 instanceof RoomPosition)) {
      return -1;
    }
    if(this.roomName == pos2.roomName) {
      return Math.max(Math.abs(this.x-pos2.x),Math.abs(this.y-pos2.y));
    }
    else {
      let wp1=this.worldPosition, wp2=pos2.worldPosition;
      return Math.max(Math.abs(wp1[0]-wp2[0]),Math.abs(wp1[1]-wp2[01]));
    }
  };

  RoomPosition.prototype.findClosestByWorldDistance = function(list, opts) {
    let closest = null;
    let closest_dist = Infinity;
    for(let i=0; i<list.length; i++) {
      if(!opts.filter || opts.filter(list[i])) {
        let dist = this.worldDistance(list[i].pos);
        if(dist<closest_dist) {
          closest = list[i];
          closest_dist = dist;
        }
      }
    }
    return closest;
  };

  RoomPosition.prototype.getAdjacentStructures = function(type) {
    if (!this.isLookable()) {
      return null;
    }
    let structures = Game.rooms[this.roomName].lookForAtArea(LOOK_STRUCTURES,this.y-1,this.x-1,this.y+1,this.x+1,true);
    if(!type) {
      return structures;
    }
    else if (type instanceof Array) {
      return _.filter(structures, s => type.includes(s.structureType));
    }
    else {
      return _.filter(structures, s => type == s.structureType);
    }
  };

};