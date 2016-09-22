var helpers = {
    genericCreep: function(budget) {
        if(budget<200) {
            return false;
        }
        let creep = [], work=0, move=0, carry=0;
        while(budget>=0) {
            if(move<=(work+carry)/2) {
                move++;
                budget-=50;
                creep.push(MOVE);
            }
            else if(carry>=work*2) {
                work++;
                budget-=100;
                creep.push(WORK);
            }
            else {
                carry++;
                budget-=50;
                creep.push(CARRY);
            }
        }
        creep.pop();
        creep.reverse();
        return creep;
    },

    isEnterable: function(pos) {
        var atPos = pos.look();
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
                default:
            }
        }
        return true;
    }
};

module.exports = helpers;
