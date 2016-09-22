if(typeof Creep.prototype.transfer_energy === 'undefined') {
    Creep.prototype.transfer_energy = function(target,amount){return this.transfer(target,RESOURCE_ENERGY,amount);};
}

var tasks = require('tasks');
var helpers = require('helpers');

// from future version of lodash 
_.sumBy = function(array, iteratee) {
    var result,
        index = -1,
        length = array.length;

    while (++index < length) {
      var current = iteratee(array[index]);
      if (current !== undefined) {
        result = result === undefined ? current : (result + current);
      }
    }
    return result;
  };

module.exports.loop = function() {
    for (let roomname in Game.rooms) {
        let room = Game.rooms[roomname];

        room.memory.entities = {};
        let entities = room.memory.entities;

        let creeps = room.find(FIND_MY_CREEPS);

        var CREEPTARGET = 7;

        if(creeps.length < CREEPTARGET) {
            //TODO account for multiple spawners
            let creep = helpers.genericCreep(room.energyAvailable);
            if(
                creep &&
                room.energyAvailable >=
                room.energyCapacityAvailable * (creeps.length/(CREEPTARGET-1))
            ) {
                let spawner = room.find(FIND_MY_SPAWNS)[0];
                if(!spawner.spawning) {
                    var newName = room.find(FIND_MY_SPAWNS)[0].createCreep(creep);
                    if(newName!=='') {
                        console.log("Spawning new worker "+newName);
                    }
                }
            }
        }

        // first, neuralyze creeps with finished/invalid orders
        for (let creep of creeps) {
            let order = creep.memory.order;
            if (order) {
                let task = tasks[order.taskname];
                let target = Game.getObjectById(order.targetID);
                if (task.done(creep, target)) {
                    // console.log(creep.name + ' done with task ' + order.taskname + ' target ' + target);
                    delete creep.memory.order;
                }
                if (!task.valid_target(target)) {
                    // console.log(creep.name + ' lost target for task ' + order.taskname);
                    delete creep.memory.order;
                }
            }
        }
        // next, record creeps already/still assigned to each job
        for (let creep of creeps) {
            let order = creep.memory.order;
            if (order) {
                if (!entities[order.targetID]) {
                    entities[order.targetID] = {};
                }
                if (!entities[order.targetID].hasOwnProperty('assigned')) {
                    entities[order.targetID].assigned = [];
                }
                entities[order.targetID].assigned.push(creep);
            }
        }

        // make list of jobs to do
        let sources = room.find(FIND_SOURCES);
        //TODO update slotcount on a cache expiry timer
        for (let source of sources) {
            if (!entities[source.id]) {
                entities[source.id] = {};
            }
            if (!entities[source.id].hasOwnProperty('slotcount')) {
                entities[source.id].slotcount = 0;
                for (let x = source.pos.x - 1; x <= source.pos.x + 1; x++) {
                    for (let y = source.pos.y - 1; y <= source.pos.y + 1; y = y + (x == source.pos.x ? 2 : 1)) {
                        if (helpers.isEnterable(room.getPositionAt(x, y))) {
                            entities[source.id].slotcount++;
                        }
                    }
                }
            }
        }
        _.remove(sources, source =>
            entities[source.id] &&
            entities[source.id].assigned &&
            entities[source.id].assigned.length >
            entities[source.id].slotcount+1
        );

        let construction_sites = room.find(FIND_CONSTRUCTION_SITES);
        let transfer_targets = room.find(FIND_MY_STRUCTURES, {
            filter: structure =>
                (structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_TOWER) &&
                structure.energy < structure.energyCapacity
        });
        //TODO add wait_build creeps as transfer targets
        //TODO prioritize transfer targets
        let dropped_energy = room.find(FIND_DROPPED_ENERGY);
        let repair_targets = room.find(FIND_STRUCTURES, {
            filter: structure =>
                (structure.my && structure.hits < structure.hitsMax) ||
                (!structure.owner && structure.hits < 1000)
        });
        let heal_targets = room.find(FIND_MY_CREEPS, {
            filter: creep => creep.hits < creep.hitsMax
        });
        let attack_targets = room.find(FIND_HOSTILE_CREEPS);
        //remove job targets that are already fulfilled
        for (let x of[
                [dropped_energy, 'pickup'], 
                [sources, 'harvest'], 
                [transfer_targets, 'transfer_energy'], 
                [construction_sites, 'carry_build'], 
                [repair_targets, 'repair']
            ]) {
            let list = x[0],
                task = tasks[x[1]];
            _.remove(list, target =>
                !task.valid_target(target) ||
                entities[target.id] &&
                entities[target.id].assigned &&
                _.sumBy(entities[target.id].assigned,
                    creep => task.effectiveness(creep, target)
                ) >= (x[1]=='harvest'?5:1)
            );
        }
        //assign new jobs to idle creeps
        for (let creep of creeps) {
            if (!creep.memory.order) {
                for (let x of creep.carry.energy===0?
                    [
                        [dropped_energy, 'pickup'], 
                        [sources, 'harvest'], 
                        [transfer_targets, 'transfer_energy'], 
                        [construction_sites, 'carry_build'], 
                        [repair_targets, 'repair'],
                        [[Game.spawns[Object.keys(Game.spawns)[0]].room.controller],'upgrade']
                    ]:
                    [
                        [transfer_targets, 'transfer_energy'], 
                        [construction_sites, 'carry_build'], 
                        [repair_targets, 'repair'],
                        [[Game.spawns[Object.keys(Game.spawns)[0]].room.controller],'upgrade'],
                        [dropped_energy, 'pickup'], 
                        [sources, 'harvest']
                    ]) {
                    let list = x[0],
                        task = tasks[x[1]];
                    let target = creep.pos.findClosestByPath(list, {
                        filter: t => task.requirements(creep,t)
                    });
                    if(target) {
                        creep.memory.order = {
                            taskname: x[1],
                            targetID: target.id
                        };
                        creep.say(x[1]);
                        // console.log(creep.name + ' starting task ' + creep.memory.order.taskname + ' target ' + target);
                        list.splice(list.indexOf(target),1);
                        break;
                    }
                }
            }
            if (!creep.memory.order) {
                console.log("IDLE! Failed to find task for " + creep.name);
            }
        }

        // do the jobs!
        for (let creep of creeps) {
            if(creep.memory.order) {
                let order = creep.memory.order;
                let task = tasks[order.taskname];
                let target = Game.getObjectById(order.targetID);
                if(task && target) {
                    let result = task.method.call(creep,target);
                    if(result == OK) {
                        //do nothing, task succeeded
                    } 
                    else if (result == ERR_NOT_IN_RANGE || result == ERR_NOT_ENOUGH_RESOURCES) {
                        creep.moveTo(target);
                    }
                    else {
                        creep.say("ERROR");
                        console.log(creep.name + ' error result '+result+' task ' + creep.memory.order.taskname + ' target ' + target);
                        delete creep.memory.order;
                    }
                }
                else {
                    creep.say("ERROR");
                    console.log(creep.name + ' lost either: task ' + creep.memory.order.taskname + ' target ' + target);
                    delete creep.memory.order;
                }
            }
            else {
                creep.say("IDLE");
            }
        }
        //tower jobs
        for (let tower of room.find(
            FIND_MY_STRUCTURES, 
            {filter: {structureType: STRUCTURE_TOWER}})
        ) {
            if(tower.energy>=10) {
                for (let x of 
                    [
                        [heal_targets, 'tower_heal'],
                        [repair_targets, 'tower_repair'],
                        [attack_targets, 'tower_attack']
                    ]
                ) {

                    let list = x[0],
                        task = tasks[x[1]];
                    let target = tower.pos.findClosestByPath(list, {
                        filter: t => task.requirements(tower,t) && task.valid_target(t)
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
    }
};