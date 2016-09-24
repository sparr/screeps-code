/*
 * Augment various prototypes to do annotated console.log
 */

module.exports = function() {
    Room.prototype.log = function(message) {
        console.log(this+': ' + message);
    };
    RoomPosition.prototype.log = function(message) {
        console.log(this+': ' + message);
    };
    RoomObject.prototype.log = function(message) {
        console.log(this+'@'+this.pos+': ' + message);
    };
};
