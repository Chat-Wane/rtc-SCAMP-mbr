var IVV = require("causaltrack").IVV;


function IVVBroadcast = function(uid){
    this.ivv = new IVV(uid);
};

IVVBroadcast.prototype.stopPropagation = function(){
};


IVVBroadcast.prototype.decorateBroadcastMessage = function(message){
};

IVVBroadcast.prototype.removeDecoration = function(message){
};

module.exports = IVVBroadcast;
