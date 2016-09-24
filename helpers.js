var helpers = {

  genericCreep: function(budget) {
    if (budget < 200) {
      return false;
    }
    let creep = [],
      work = 0,
      move = 0,
      carry = 0,
      attack = 0;
    while (budget >= 0) {
      if (move <= (work + carry) / 2) {
        move++;
        budget -= 50;
        creep.push(MOVE);
      } else if (carry >= work * 2) {
        work++;
        budget -= 100;
        creep.push(WORK);
      }
      // else if(attack<Math.floor((carry+move+work)*8)) {
      //     attack++;
      //     budget-=80;
      //     creep.push(ATTACK);
      // }
      else {
        carry++;
        budget -= 50;
        creep.push(CARRY);
      }
    }
    creep.pop();
    creep.reverse();
    return creep;
  },

  genericAttackCreep: function(budget) {
    if (budget < 130) {
      return false;
    }
    let orig_budget = budget;
    budget = budget - 130;
    let creep = [MOVE,ATTACK],
      move = 1,
      attack = 1,
      tough = 0;
    while (budget >= orig_budget*3/4) {
      if (move <= attack) {
        move++;
        budget -= 50;
        creep.push(MOVE);
      } else {
        attack++;
        budget -= 80;
        creep.push(ATTACK);
      }
    }
    while (budget >= 10) {
      tough++;
      budget -= 10;
      creep.push(TOUGH);
    }
    creep.pop();
    creep.reverse();
    return creep;
  },

  resolveTarget(target) {
    if (target.pos) {
      return target;
    }
    return Game.getObjectById(id) || Game.flags[id] || null;
  }
};

module.exports = helpers;