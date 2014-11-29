var SimplePeer = require('simple-peer');
var ViewEntry = require("./viewentry.js");
var Conf = require("./config.js");
var MOfferResponse = require("./messages.js").MOfferResponse;
var MOfferRequest = require("./messages.js").MOfferRequest;

function LinkFactory(){
}

LinkFactory.prototype.get = function(type, index){
    var link = null;
    
    switch (type){
    case "first": // very first offer
	link = new SimplePeer({initiator: true});
	link.index = index;
	setClassicLink(link,this);
	setFirstLink(link, this);
	break;
    case "contact": // first contact connected to within the network
	link = new SimplePeer();
	link.index = index;
	setContactLink(link, this);
	setClassicLink(link,this);
	break;
    case "subscription": // link as subscription sent through the network
	link = new SimplePeer({initiator: true});
	link.index = index;
	setClassicLink(link, this);
	break;
    case "response": // link as response to the subscription sent
	link = new SimplePeer();
	link.index = index;
	setClassicLink(link, this);
	break;
    };
    
    return link;
};

function setFirstLink(link, self){
    link.on("message", function(message){
	if (message.type == "MOfferRequest"){
	    var offers = self.generateOffers(message.k, "subscription");
	    setTimeout(function(){
		self.send(new MOfferResponse(self.track.local.e,
					     message.uid, message.counter,
					     offers));}, Conf.waitSTUN);
	    console.log("Ok friend! Here are the " + message.k + " offers");
	};
    });
}

function setContactLink(link, self){
    link.on("message", function(message){
	if (message.type == "MOfferResponse"){
	    for (var i = 0; i<message.offers.length; ++i){
		var pair = JSON.stringify({_e:message.offers[i].uid,
					   _c:message.offers[i].counter});
		if (!self.backtrack.has(pair)){
		    self.backtrack.set(pair,link);
		};
	    };
	    self.dispatchSubscriptions(message.offers);
	};
    });	   
};

function setClassicLink(link, self){
    link.on('signal', function(data){
	self.sub[this.index].offer.push(data);
    });
    link.on('ready', function(){
	console.log("A direct connection to a new peer has been established!");
    });
    link.on('message', function(message){
	self.receive(this, message);
    });
    link.on('error', function(err){
	// (TODO)
    });
};

module.exports = (function () { return new LinkFactory(); })();
