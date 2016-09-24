require('screeps-perf')({
  speedUpArrayFunctions: true,
  cleanUpCreepMemory: true,
  optimizePathFinding: false,
  noTrainingWheels: true
});

require('augment_prototypes')();

var helpers = require('helpers');
var tasks = require('tasks');

module.exports.loop = function() {
    var entities = Memory.entities;
    var creeps = [],
        sources = [],
        construction_sites = [],
        transfer_energy_targets = [],
        transfer_resources_targets = [],
        dropped_energy = [],
        withdraw_targets = [],
        repair_targets = [],
        attack_targets = [],
        heal_targets = [],
        towers = [];
    for (let roomname in Game.rooms) {
        let room = Game.rooms[roomname];

        creeps = room.find(FIND_MY_CREEPS).concat(creeps);
        sources = room.find(FIND_SOURCES).concat(sources);
        construction_sites = room.find(FIND_CONSTRUCTION_SITES).concat(construction_sites);
        transfer_energy_targets = room.find(FIND_MY_STRUCTURES, {
            filter: structure =>
                (structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_TOWER) &&
                structure.energy < structure.energyCapacity
        }).concat(transfer_energy_targets);
        transfer_resources_targets = room.find(FIND_MY_STRUCTURES, {
            filter: structure =>
                (structure.structureType == STRUCTURE_STORAGE) &&
                _.sum(structure.store) < structure.storeCapacity
        }).concat(transfer_resources_targets);
        //TODO add wait_build creeps as transfer targets
        //TODO prioritize transfer targets
        dropped_energy = room.find(FIND_DROPPED_ENERGY).concat(dropped_energy);
        withdraw_targets = room.find(FIND_STRUCTURES, {
            filter: structure => structure.store && structure.store.energy>0
        }).concat(withdraw_targets);
        repair_targets = room.find(FIND_STRUCTURES, {
            filter: function (s) {
                s.hitsRepairTarget =
                (
                    (s.structureType == STRUCTURE_CONTAINER) ? 225000 :
                    (!s.owner) ? 2000 :
                    (!s.my) ? -1 :
                    (s.structureType == STRUCTURE_STORAGE) ? 10000 :
                    (s.structureType == STRUCTURE_RAMPART) ? 10000 :
                    s.hitsMax
                );
                return s.hits < s.hitsRepairTarget;
            }
                
        }).concat(repair_targets);
        heal_targets = room.find(FIND_MY_CREEPS, {
            filter: creep => creep.hits < creep.hitsMax
        }).concat(heal_targets);
        attack_targets = room.find(FIND_HOSTILE_CREEPS).concat(attack_targets);
        towers = room.find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}}).concat(towers);
    }
    for(let flagname in Game.flags) {
        let decode = flagname.split('.');
        if(decode[0]=='source') {
            if(!Game.getObjectById(decode[1])) {
                sources.push(Game.flags[flagname]);
            }
        }
    }

    if(attack_targets.length>0) {
        let spawner = Game.spawns[Object.keys(Game.spawns)[0]];
        let room = spawner.room;
        let creep = helpers.genericAttackCreep(room.energyAvailable);
        if (creep) {
            if(!spawner.spawning) {
                var newName = spawner.createCreep(creep);
                if(newName!=='') {
                    console.log("Spawning new attacker "+newName);
                }
            }
        }
    }

    var CREEPTARGET = 10;
    if(creeps.length < CREEPTARGET) {
        //TODO account for multiple spawners
        let spawner = Game.spawns[Object.keys(Game.spawns)[0]];
        let room = spawner.room;
        let creep = helpers.genericCreep(room.energyAvailable);
        if (
            creep &&
            room.energyAvailable >=
            room.energyCapacityAvailable * (creeps.length/(CREEPTARGET-1))
        ) {
            if (!spawner.spawning) {
                var newName = spawner.createCreep(creep);
                if (newName!=='') {
                    console.log("Spawning new worker "+newName);
                }
            }
        }
    }

    // first, neuralyze creeps with finished/invalid orders
    for (let creep of creeps) {
        if(!creep){continue;}
        let order = creep.memid.order;
        if (order) {
            let task = tasks[order.taskname];
            if(task) {
                let target = Game.getObjectById(order.targetID) || Game.flags[order.targetID];
                if (!(target instanceof Flag) && task.done(creep, target)) {
                    // console.log(creep.name + ' done with task ' + order.taskname + ' target ' + target);
                    delete creep.memid.order;
                }
                else if (!target || (!(target instanceof Flag) && !task.valid_target(target))) {
                    // console.log(creep.name + ' lost target for task ' + order.taskname);
                    delete creep.memid.order;
                }
            }
            else{
                delete creep.memid.order;
            }
        }
    }
    for (let entid in entities) {
        if(entities[entid].assigned) {
            entities[entid].assigned = [];
        }
    }
    // next, record creeps already/still assigned to each job
    for (let creep of creeps) {
        let order = creep.memid.order;
        if (order && order.taskname != 'move') {
            if (!entities[order.targetID]) {
                entities[order.targetID] = {};
            }
            if (!entities[order.targetID].hasOwnProperty('assigned')) {
                entities[order.targetID].assigned = [];
            }
            entities[order.targetID].assigned.push(creep);
        }
    }

    //TODO update slotcount on a cache expiry timer
    for (let source of sources) {
        if(source instanceof Flag) {
            continue;
        }
        if (!entities[source.id]) {
            entities[source.id] = {};
        }
        if (!entities[source.id].hasOwnProperty('slotcount')) {
            entities[source.id].slotcount = 0;
            for (let x = source.pos.x - 1; x <= source.pos.x + 1; x++) {
                for (let y = source.pos.y - 1; y <= source.pos.y + 1; y = y + (x == source.pos.x ? 2 : 1)) {
                    if (source.room.getPositionAt(x, y).isWalkable()) {
                        entities[source.id].slotcount++;
                    }
                }
            }
        }
    }
    _.remove(sources, source =>
        !(source instanceof Flag) &&
        entities[source.id] &&
        entities[source.id].assigned &&
        entities[source.id].assigned.length >=
        entities[source.id].slotcount
    );

    // if(Game.time%100===0) console.log('valid sources: '+sources);

    //remove job targets that are already fulfilled
    for (let x of[
            [dropped_energy, 'pickup'], 
            [withdraw_targets, 'withdraw_energy'],
            [sources, 'harvest'], 
            [withdraw_targets, 'withdraw_energy'], 
            [transfer_energy_targets, 'transfer_energy'], 
            [transfer_resources_targets, 'transfer_resources'], 
            [construction_sites, 'carry_build'], 
            [repair_targets, 'repair']
        ]) {
        let list = x[0],
            task = tasks[x[1]];
        _.remove(list, target =>
            (!(target instanceof Flag)) && (
                !task.valid_target(target) ||
                entities[target.id] &&
                entities[target.id].assigned &&
                _.sum(entities[target.id].assigned,
                    creep => task.effectiveness(creep, target)
                ) >= (x[1]=='harvest'?3:1)
            )
        );
    }

    //assign new jobs to idle creeps
    for (let creep of creeps) {
        if (!creep.memid.order) {
            if(creep.carry.energy<25 && creep.ticksToLive<100) {
                creep.memid.order = {taskname:'recycle_self',targetID:Game.spawns.Spawn1.id};
                continue;
            }
            for (let x of creep.carry.energy<25?
                [
                    [dropped_energy, 'pickup'], 
                    [sources, 'harvest'], 
                    [withdraw_targets, 'withdraw_energy'], 
                    [transfer_energy_targets, 'transfer_energy'], 
                    [transfer_resources_targets, 'transfer_resources'], 
                    [construction_sites, 'carry_build'], 
                    [repair_targets, 'repair'],
                    [attack_targets, 'attack'],
                    [attack_targets, 'ranged_attack'],
                    [[Game.spawns[Object.keys(Game.spawns)[0]].room.controller],'carry_upgrade']
                ]:
                [
                    [transfer_energy_targets, 'transfer_energy'], 
                    [transfer_resources_targets, 'transfer_resources'], 
                    [construction_sites, 'carry_build'], 
                    [repair_targets, 'repair'],
                    [attack_targets, 'attack'],
                    [attack_targets, 'ranged_attack'],
                    [[Game.spawns[Object.keys(Game.spawns)[0]].room.controller],'carry_upgrade'],
                    [dropped_energy, 'pickup'], 
                    [sources, 'harvest'],
                    [withdraw_targets, 'withdraw_energy']
                ]) {
                let list = x[0],
                    task = tasks[x[1]];
                // if(creep.name=='Zoe' && task.name=='harvest') console.log(sources);
                let target = creep.pos.findClosestByWorldDistance(list, {
                    filter: t => { return task.ever_requirements(creep,t) && task.now_requirements(creep,t); }
                });
                if(target) {
                    creep.memid.order = {
                        taskname: x[1],
                        targetID: (target instanceof Flag)?target.name:target.id
                    };
                    creep.say(x[1]);
                    // console.log(creep.name + ' starting task ' + creep.memid.order.taskname + ' target ' + target);
                    list.splice(list.indexOf(target),1); //FIXME this is a hack
                    break;
                }
            }
        }
        if (!creep.memid.order) {
            console.log("IDLE! Failed to find task for " + creep.name);
        }
    }

    // do the jobs!
    for (let creep of creeps) {
        if (creep.memid.order) {
            let order = creep.memid.order;
            let task = tasks[order.taskname];
            let target = Game.getObjectById(order.targetID) || Game.flags[order.targetID];
            if (target instanceof Flag) {
                let decode = target.name.split('.');
                new_target = Game.getObjectById(decode[1]);
                if(new_target) {
                    order.targetID = new_target.id;
                    target = new_target;
                }
            }
            if (task && target) {
                if (target instanceof Flag) {
                    creep.moveTo(target);
                    continue;
                } 
                let result = task.method.call(creep,target);
                if (result == OK) {
                    if (task.name.indexOf('attack') > -1) {
                        creep.moveTo(target);    
                    }
                    else if (task.name=='carry_upgrade' && Math.random()>0.99) {
                        creep.moveTo(target);
                    }
                    //do nothing, task succeeded
                } 
                else if (result == ERR_NOT_IN_RANGE || result == ERR_NOT_ENOUGH_RESOURCES) {
                    let res = creep.moveTo(target);
                }
                else {
                    creep.say("ERROR");
                    console.log(creep.name + ' error result '+result+' task ' + creep.memid.order.taskname + ' target ' + target);
                    delete creep.memid.order;
                }
            }
            else {
                creep.say("ERROR");
                console.log(creep.name + ' lost either: task ' + creep.memid.order.taskname + ' target ' + target);
                delete creep.memid.order;
            }
        }
        else {
            creep.say("IDLE");
        }
    }
    //tower jobs
    for (let tower of towers) {
        if(tower.energy>=10) {
            for (let x of 
                [
                    [attack_targets, 'tower_attack'],
                    [heal_targets, 'tower_heal'],
                    [repair_targets, 'tower_repair']
                ]
            ) {

                let list = x[0],
                    task = tasks[x[1]];
                let target = tower.pos.findClosestByPath(list, {
                    filter: t => task.ever_requirements(tower,t) && task.now_requirements(tower,t) && task.valid_target(t)
                });
                if(target) {
                    task.method.call(tower,target);
                    // console.log(tower + ' doing task ' + task.name + ' target ' + target);
                    list.splice(list.indexOf(target),1);
                    break;
                }
            }
        }
    }
};