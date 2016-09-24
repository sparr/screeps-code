var helpers = require('helpers');

var tasks = {

    move: {
        name: 'move',
        method: Creep.prototype.moveTo,
        range: 0,
        preferred_destinations: (t) => [ t.pos.isLookable() ? ( t.pos.isWalkable() ? [t.pos] : t.pos.findClosestWalkablePositions(1) ) : [t.pos] ],
        expected_duration: (c, t) => 0,
        ever_requirements: (c, t) => c.getActiveBodyparts(MOVE) > 0,
        now_requirements: (c, t) => true,
        effectiveness: (c, t) => 0,
        valid_target: t => t.pos,
        expected_value: (c, t) => 0,
        value_decay: (c, t) => 0,
        done: (c, t) => c.pos.isEqualTo(t.pos)
    },

    recycle_self: {
        name: 'recycle_self',
        method: function(t) { return t.recycleCreep(this); },
        range: 1,
        preferred_destinations: (t) => [t.pos.getAdjacentStructures(STRUCTURE_STORAGE), t.pos.getAdjacentStructures(STRUCTURE_CONTAINER)],
        expected_duration: (c, t) => 0,
        ever_requirements: (c, t) => true,
        now_requirements: (c, t) => true,
        effectiveness: (c, t) => 0,
        valid_target: t => t instanceof StructureSpawn,
        expected_value: (c, t) => _sum( c.body, p => ( BODYPART_COST[p.type] * p.hits / 100 ) ) * c.ticksToLive / 1500,
        value_decay: (c, t) => _sum(c.body, p=>(BODYPART_COST[p.type]*p.hits/100))/1500,
        done: (c, t) => false
    },

    pickup: {
        name: 'pickup',
        method: Creep.prototype.pickup,
        range: 1,
        preferred_destinations: (t) => [[t.pos.findWalkableAtRange(1)], [t.pos]],
        expected_duration: (c, t) => 1,
        ever_requirements: (c, t) => c.getActiveBodyparts(CARRY) > 0,
        now_requirements: (c, t) => _.sum(c.carry) < c.carryCapacity,
        effectiveness: (c, t) => Math.min(1, (c.carryCapacity - _.sum(c.carry) / t.amount)),
        valid_target: t => t instanceof Resource,
        expected_value: (c, t) => t.amount,
        value_decay: (c, t) => 1,
        done: (c, t) => _.sum(c.carry) == c.carryCapacity
    },

    withdraw_energy: {
        name: 'withdraw_energy',
        method: function(t) {return this.withdraw(t,RESOURCE_ENERGY);},
        preferred_destinations: (t) => [[t.pos.findWalkableAtRange(1)], [t.pos]],
        expected_duration: (c, t) => 1,
        ever_requirements: (c, t) => c.getActiveBodyparts(CARRY) > 0,
        now_requirements: (c, t) => _.sum(c.carry) < c.carryCapacity,
        effectiveness: (c, t) => Math.min(1, (c.carryCapacity - _.sum(c.carry) / t.store.energy)),
        valid_target: t => t instanceof StructureContainer || t instanceof StructureStorage,
        expected_value: (c, t) => (Math.min(t.store.energy,(c.carryCapacity - _.sum(c.carry))))/2,
        value_decay: (c, t) => 0,
        done: (c, t) => _.sum(c.carry) == c.carryCapacity || t.store.energy == 0
    },

    harvest: {
        name: 'harvest',
        method: Creep.prototype.harvest,
        range: 1,
        preferred_destinations: (t) => [[t.pos.findWalkableAtRange(1)], [t.pos]],
        expected_duration: (c, t) =>
            Math.ceil((c.carryCapacity - _.sum(c.carry)) /
                (2 * c.getActiveBodyparts(WORK))),
        ever_requirements: (c, t) => c.getActiveBodyparts(CARRY) > 0 && c.getActiveBodyparts(WORK) > 0,
        now_requirements: (c, t) => _.sum(c.carry) < c.carryCapacity,
        effectiveness: (c, t) => Math.min(1, c.getActiveBodyparts(WORK) / 5),
        valid_target: t => t instanceof Source && (t.energy>0 || t.ticksToRegeneration < 50),
        expected_value: (c, t) => (Math.min(t.energy,(c.carryCapacity - _.sum(c.carry))))/2,
        value_decay: (c, t) => 0,
        done: (c, t) =>
            _.sum(c.carry) == c.carryCapacity ||
            (t.energy === 0 && t.ticksToRegeneration >= 50)
    },

    dropharvest: {
        name: 'dropharvest',
        method: Creep.prototype.harvest,
        range: 1,
        preferred_destinations: (t) => [t.pos.getAdjacentStructures(STRUCTURE_STORAGE), t.pos.getAdjacentStructures(STRUCTURE_CONTAINER)],
        expected_duration: (c, t) => Infinity,
        ever_requirements: (c, t) => c.getActiveBodyparts(WORK) > 0,
        now_requirements: (c, t) => true,
        effectiveness: (c, t) => Math.min(1, c.getActiveBodyparts(WORK) / 5),
        valid_target: t => t instanceof Source,
        expected_value: (c, t) => Math.min(t.energyCapacity,c.getActiveBodyparts(WORK)*2*300),
        value_decay: (c, t) => 0,
        done: (c, t) => false
    },

    transfer_resources: {
        name: 'transfer_resources',
        method: function(t) {
            for(resource in this.carry) {
                if(resource != RESOURCE_ENERGY) {
                    return this.transfer(t,resource);
                }
            }
        },
        range: 1,
        preferred_destinations: (t) => [t.pos.findWalkableAtRange(1),[t.pos]],
        expected_duration: (c, t) => 1,
        ever_requirements: (c, t) => c.getActiveBodyparts(CARRY) > 0,
        now_requirements: (c, t) => (_.sum(c.carry)-(c.carry.energy||0)) > 0,
        effectiveness: (c, t) =>
            Math.min(1,
                t.storeCapacicty ?
                (_.sum(c.carry)-(c.carry.energy||0)) / (t.storeCapacity - _.sum(t.store)) :
                (_.sum(c.carry)-(c.carry.energy||0)) / (t.carryCapacity - _.sum(t.carry))
            ),
        valid_target: t => t.storeCapacity || t.carryCapacity,
        expected_value: (c, t) =>
            Math.min((_.sum(c.carry)-(c.carry.energy||0)),
                t.storeCapacicty ?
                (t.storeCapacity - _.sum(t.store)) :
                (t.carryCapacity - _.sum(t.carry))
            )/2,
        value_decay: (c, t) => 0,
        done: (c, t) =>
            (_.sum(c.carry)-(c.carry.energy||0)) === 0 ||
            (
                t.storeCapacity ?
                t.storeCapacity == _.sum(t.store) :
                t.carryCapacity == _.sum(t.carry)
            )
    },

    transfer_energy: {
        name: 'transfer_energy',
        method: function(t) {return this.transfer(t,RESOURCE_ENERGY);},
        range: 1,
        preferred_destinations: (t) => [t.pos.findWalkableAtRange(1),[t.pos]],
        expected_duration: (c, t) => 1,
        ever_requirements: (c, t) => c.getActiveBodyparts(CARRY) > 0,
        now_requirements: (c, t) => c.carry.energy > 0,
        effectiveness: (c, t) =>
            Math.min(1,
                t.energyCapacity ?
                c.carry.energy / (t.energyCapacity - t.energy) :
                t.storeCapacicty ?
                c.carry.energy / (t.storeCapacity - _.sum(t.store)) :
                c.carry.energy / (t.carryCapacity - _.sum(t.carry))
            ),
        valid_target: t => t.energyCapacity || t.storeCapacity || t.carryCapacity,
        expected_value: (c, t) =>
            Math.min(c.carry.energy,
                t.energyCapacity ?
                (t.energyCapacity - t.energy) : 
                t.storeCapacicty ?
                (t.storeCapacity - _.sum(t.store)) :
                (t.carryCapacity - _.sum(t.carry))
            )/(t.structureType==STRUCTURE_TOWER?1:3),
        value_decay: (c, t) => 0,
        done: (c, t) =>
            c.carry.energy === 0 ||
            (t.energyCapacity ?
                t.energyCapacity == t.energy :
                t.storeCapacity ?
                t.storeCapacity == _.sum(t.store) :
                t.carryCapacity == _.sum(t.carry)
            )
    },

    carry_build: {
        name: 'carry_build',
        method: Creep.prototype.build,
        range: 3,
        preferred_destinations: (t) => [t.pos.findWalkableAtRange(3),t.pos.findWalkableAtRange(2),t.pos.findWalkableAtRange(1),[t.pos]],
        expected_duration: (c, t) =>
            Math.ceil(
                Math.min(t.progressTotal - t.progress, c.carry.energy) /
                (5 * c.getActiveBodyparts(WORK))
            ),
        ever_requirements: (c, t) => c.getActiveBodyparts(WORK) > 0,
        now_requirements: (c, t) => c.carry.energy > 0 && _.sum(c.body, s => s.type == WORK && s.hits > 0),
        effectiveness: (c, t) =>
            Math.min(1, c.carry.energy / (t.progressTotal - t.progress)),
        valid_target: t => t instanceof ConstructionSite,
        expected_value: (c, t) => Math.min(c.carry.energy,(t.progressTotal - t.progress))/2,
        value_decay: (c, t) => 0,
        done: (c, t) => c.carry.energy === 0
    },

    wait_build: {
        name: 'wait_build',
        method: Creep.prototype.build,
        range: 3,
        preferred_destinations: (t) => [t.pos.findWalkableAtRange(3),t.pos.findWalkableAtRange(2),t.pos.findWalkableAtRange(1),[t.pos]],
        expected_duration: (c, t) =>
            Math.ceil(
                (t.progressTotal - t.progress) /
                (5 * c.getActiveBodyparts(WORK))
            ),
        ever_requirements: (c, t) => c.getActiveBodyparts(WORK) > 0,
        now_requirements: (c, t) => true,
        effectiveness: (c, t) => 0, //Inf builders allowed
        valid_target: t => t instanceof ConstructionSite,
        expected_value: (c, t) => (t.progressTotal - t.progress)/2,
        value_decay: (c, t) => 0,
        done: (c, t) => false
    },

    carry_upgrade: {
        name: 'carry_upgrade',
        method: Creep.prototype.upgradeController,
        range: 3,
        preferred_destinations: (t) => [t.pos.findWalkableAtRange(3),t.pos.findWalkableAtRange(2),t.pos.findWalkableAtRange(1),[t.pos]],
        expected_duration: (c, t) =>
            Math.ceil(c.carry.energy / c.getActiveBodyparts(WORK)),
        ever_requirements: (c, t) => c.getActiveBodyparts(WORK) > 0,
        now_requirements: (c, t) => c.carry.energy > 0,
        effectiveness: (c, t) => 0, //Inf upgraders allowed
        valid_target: t => t instanceof StructureController,
        expected_value: (c, t) => c.carry.energy / 2,
        value_decay: (c, t) => 0,
        done: (c, t) => c.carry.energy === 0
    },

    wait_upgrade: {
        name: 'wait_upgrade',
        method: Creep.prototype.upgradeController,
        range: 3,
        preferred_destinations: (t) => [t.pos.findWalkableAtRange(3),t.pos.findWalkableAtRange(2),t.pos.findWalkableAtRange(1),[t.pos]],
        expected_duration: (c, t) => Infinity,
        ever_requirements: (c, t) => c.getActiveBodyparts(WORK) > 0,
        now_requirements: (c, t) => c.carry.energy > 0,
        effectiveness: (c, t) => 0, //Inf upgraders allowed
        valid_target: t => t instanceof StructureController,
        expected_value: (c, t) => Infinity,
        value_decay: (c, t) => 0,
        done: (c, t) => false
    },

    repair: {
        name: 'repair',
        method: Creep.prototype.repair,
        range: 3,
        preferred_destinations: (t) => [t.pos.findWalkableAtRange(3),t.pos.findWalkableAtRange(2),t.pos.findWalkableAtRange(1),[t.pos]],
        expected_duration: (c, t) =>
            Math.ceil(
                Math.min((t.hitsMax - t.hits) / 100, c.carry.energy) /
                c.getActiveBodyparts(WORK)
            ),
        ever_requirements: (c, t) => c.getActiveBodyparts(WORK),
        now_requirements: (c, t) => c.carry.energy > 0,
        effectiveness: (c, t) =>
            Math.min(1, c.carry.energy / (t.hitsMax - t.hits) * 100),
        valid_target: t => t.hits && t.hits < t.hitsMax,
        expected_value: (c, t) => Math.min(c.carry.energy,(t.hitsMax - t.hits))/2,
        value_decay: (c, t) => 0,
        done: (c, t) => c.carry.energy === 0 || t.hits > t.hitsRepairTarget*1.1
    },

    attack: {
        name: 'attack',
        method: Creep.prototype.attack,
        range: 1,
        preferred_destinations: (t) => [t.pos.findWalkableAtRange(1)],
        expected_duration: (c, t) => 1,
        ever_requirements: (c,t) => c.getActiveBodyparts(ATTACK),
        now_requirements: (c,t) => true,
        effectiveness: (c, t) => 0, //FIXME
        valid_target: t => t.hits && t.hits > 0 && !t.my,
        expected_value: (c, t) => Math.min(t.hitsMax - t.hits)*10,
        value_decay: (c, t) => 0,
        done: (c, t) => false
    },

    ranged_attack: {
        name: 'ranged_attack',
        method: Creep.prototype.ranged_attack,
        range: 3,
        preferred_destinations: (t) => [t.pos.findWalkableAtRange(3),t.pos.findWalkableAtRange(2)],
        expected_duration: (c, t) => 1,
        ever_requirements: (c,t) => c.getActiveBodyparts(RANGED_ATTACK),
        now_requirements: (c,t) => true,
        effectiveness: (c, t) => 0, //FIXME
        valid_target: t => t.hits && t.hits > 0 && !t.my,
        expected_value: (c, t) => Math.min(t.hitsMax - t.hits)*10,
        value_decay: (c, t) => 0,
        done: (c, t) => false
    },

    tower_attack: {
        name: 'tower_attack',
        method: StructureTower.prototype.attack,
        range: 99,
        expected_duration: (c, t) => 1,
        ever_requirements: (c,t) => c instanceof StructureTower,
        now_requirements: (c,t) => c.energy >= 10,
        effectiveness: (c, t) => 0, //FIXME
        valid_target: t => t.hits && t.hits > 0 && t.my === false,
        done: (c, t) => false
    },

    tower_repair: {
        name: 'tower_repair',
        method: StructureTower.prototype.repair,
        range: 99,
        expected_duration: (c, t) => 1,
        ever_requirements: (c,t) => c instanceof StructureTower,
        now_requirements: (c,t) => c.energy >= 10,
        effectiveness: (c, t) => 0, //FIXME
        valid_target: t => t.hits && t.hits < t.hitsRepairTarget,
        done: (c, t) => t.hits >= t.hitsRepairTarget
    },

    tower_heal: {
        name: 'tower_heal',
        method: StructureTower.prototype.heal,
        range: 99,
        expected_duration: (c, t) => 1,
        ever_requirements: (c,t) => c instanceof StructureTower,
        now_requirements: (c,t) => c.energy >= 10,
        effectiveness: (c, t) => 0, //FIXME
        valid_target: t => t.hits && t.hits < t.hitsMax && t.my === true,
        done: (c, t) => t.hits == t.hitsMax
    }


    // TODO: heal, other structure actions, etc ...
};

module.exports = tasks;