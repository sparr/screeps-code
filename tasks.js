var tasks = {

    pickup: {
        name: 'pickup',
        method: Creep.prototype.pickup,
        range: 1,
        expected_duration: (c, t) => 1,
        requirements: (c, t) => _.sum(c.carry) < c.carryCapacity,
        effectiveness: (c, t) => Math.min(1, (c.carryCapacity - _.sum(c.carry) / t.amount)),
        valid_target: t => t instanceof Resource,
        done: (c, t) => _.sum(c.carry) == c.carryCapacity
    },

    harvest: {
        name: 'harvest',
        method: Creep.prototype.harvest,
        range: 1,
        expected_duration: (c, t) =>
            Math.ceil((c.carryCapacity - _.sum(c.carry)) /
                (2 * _.sum(c.body, s => s.type == WORK))),
        requirements: (c, t) => _.sum(c.carry) < c.carryCapacity && _.sum(c.body, s => s.type == WORK),
        effectiveness: (c, t) => Math.min(1, _.sum(c.body, s => s.type == WORK) / 5),
        valid_target: t => t instanceof Source && (t.energy>0 || t.ticksToRegeneration < 50),
        done: (c, t) =>
            _.sum(c.carry) == c.carryCapacity ||
            (t.energy === 0 && t.ticksToRegeneration > 50)
    },

    dropharvest: {
        name: 'dropharvest',
        method: Creep.prototype.harvest,
        range: 1,
        expected_duration: (c, t) => Inf,
        requirements: (c, t) => c.carryCapacity === 0 && _.sum(c.body, s => s.type == WORK),
        effectiveness: (c, t) => Math.min(1, _.sum(c.body, s => s.type == WORK) / 5),
        valid_target: t => t instanceof Source,
        done: (c, t) => false
    },

    transfer_energy: {
        name: 'transfer_energy',
        // method: (c, t) => Creep.prototype.transfer.call(c, t, RESOURCE_ENERGY),
        method: Creep.prototype.transfer_energy,
        range: 1,
        expected_duration: (c, t) => 1,
        requirements: (c, t) => c.carry.energy > 0,
        effectiveness: (c, t) =>
            Math.min(1,
                t.energyCapacity ?
                c.carry.energy / (t.energyCapacity - t.energy) :
                t.storeCapacicty ?
                c.carry.energy / (t.storeCapacity - _sum(t.store)) :
                c.carry.energy / (t.carryCapacity - _sum(t.carry))
            ),
        valid_target: t => t.energyCapacity || t.storeCapacity || t.carryCapacity,
        done: (c, t) =>
            c.carry.energy === 0 ||
            (t.energyCapacity ?
                t.energyCapacity == t.energy :
                t.storeCapacity ?
                t.storeCapacity == _sum(t.store) :
                t.carryCapacity == _sum(t.carry)
            )
    },

    carry_build: {
        name: 'carry_build',
        method: Creep.prototype.build,
        range: 3,
        expected_duration: (c, t) =>
            Math.ceil(
                Math.min(t.progressTotal - t.progress, c.carry.energy) /
                (5 * _.sum(c.body, s => s.type == WORK))
            ),
        requirements: (c, t) => c.carry.energy > 0 && _.sum(c.body, s => s.type == WORK),
        effectiveness: (c, t) =>
            Math.min(1, c.carry.energy / (t.progressTotal - t.progress)),
        valid_target: t => t instanceof ConstructionSite,
        done: (c, t) => c.carry.energy === 0
    },

    wait_build: {
        name: 'wait_build',
        method: Creep.prototype.build,
        range: 3,
        expected_duration: (c, t) =>
            Math.ceil(
                (t.progressTotal - t.progress) /
                (5 * _.sum(c.body, s => s.type == WORK))
            ),
        requirements: (c, t) => _.sum(c.body, s => s.type == WORK),
        effectiveness: (c, t) => 0, //Inf builders allowed
        valid_target: t => t instanceof ConstructionSite,
        done: (c, t) => false
    },

    upgrade: {
        name: 'upgrade',
        method: Creep.prototype.upgradeController,
        range: 3,
        expected_duration: (c, t) =>
            Math.ceil(c.carry.energy / _.sum(c.body, s => s.type == WORK)),
        requirements: (c, t) => c.carry.energy > 0 && _.sum(c.body, s => s.type == WORK),
        effectiveness: (c, t) => 0, //Inf upgraders allowed
        valid_target: t => t instanceof StructureController,
        done: (c, t) => c.carry.energy === 0
    },

    repair: {
        name: 'repair',
        method: Creep.prototype.repair,
        range: 3,
        expected_duration: (c, t) =>
            Math.ceil(
                Math.min((t.hitsMax - t.hits) / 100, c.carry.energy) /
                (_.sum(c.body, s => s.type == WORK))
            ),
        requirements: (c, t) => c.carry.energy > 0 && _.sum(c.body, s => s.type == WORK),
        effectiveness: (c, t) =>
            Math.min(1, c.carry.energy / (t.hitsMax - t.hits) * 100),
        valid_target: t => t.hits && t.hits < t.hitsMax && t.hits < 1000,
        done: (c, t) => c.carry.energy === 0
    },

    attack: {
        name: 'attack',
        method: Creep.prototype.attack,
        range: 1,
        expected_duration: (c, t) => 1,
        requirements: (c,t) => _.sum(c.body, s => s.type == ATTACK),
        effectiveness: (c, t) => 0, //FIXME
        valid_target: t => t.hits && t.hits > 0 && t.my === false,
        done: (c, t) => false
    },

    ranged_attack: {
        name: 'ranged_attack',
        method: Creep.prototype.ranged_attack,
        range: 3,
        expected_duration: (c, t) => 1,
        requirements: (c,t) => _.sum(c.body, s => s.type == RANGED_ATTACK),
        effectiveness: (c, t) => 0, //FIXME
        valid_target: t => t.hits && t.hits > 0 && t.my === false,
        done: (c, t) => false
    },

    tower_attack: {
        name: 'tower_attack',
        method: StructureTower.prototype.attack,
        range: 99,
        expected_duration: (c, t) => 1,
        requirements: (c,t) => c instanceof StructureTower && c.energy>=10,
        effectiveness: (c, t) => 0, //FIXME
        valid_target: t => t.hits && t.hits > 0 && t.my === false,
        done: (c, t) => false
    },

    tower_repair: {
        name: 'tower_repair',
        method: StructureTower.prototype.repair,
        range: 99,
        expected_duration: (c, t) => 1,
        requirements: (c,t) => c instanceof StructureTower && c.energy>=10,
        effectiveness: (c, t) => 0, //FIXME
        valid_target: t => t.hits && t.hits < t.hitsMax && t.hits < 1000,
        done: (c, t) => false
    },

    tower_heal: {
        name: 'tower_heal',
        method: StructureTower.prototype.heal,
        range: 99,
        expected_duration: (c, t) => 1,
        requirements: (c,t) => c instanceof StructureTower && c.energy>=10,
        effectiveness: (c, t) => 0, //FIXME
        valid_target: t => t.hits && t.hits < t.hitsMax && t.my === true,
        done: (c, t) => false
    }


    // TODO: heal, transfer resources, etc ...
};

module.exports = tasks;