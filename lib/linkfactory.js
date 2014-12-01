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
	break;
    case "contact": // first contact connected to within the network
	link = new SimplePeer();
	link.index = index;
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

function setClassicLink(link, self){
    link.on('signal', function(data){
	self.sub[this.index].offer.push(data);
    });
    link.on('ready', function(){
	console.log("A direct connection to a new peer has been established!");
	// (TODO) remove the link from pending and sub;
    });
    link.on('message', function(message){
	self.receive(this, message);
    });
    link.on('error', function(err){
	console.log("Connection could not be established or errors happened.");
	removeLinkFromViews(this.index, self);
	// (TODO) remove the link from pending and sub;
    });
    link.on('close', function(){
	console.log("A direct connection has been close!");
	removeLinkFromViews(this.index, self);
	// (TODO) handle the resubscriptions as in the paper
    });
};

function removeLinkFromViews(index, self){
    var found = false;
    // #1 search within the partialView and delete the link
    var i = 0;
    while ((!found) && (i<self.partialView.length())){
	if (self.partialView.get(i).link.index == index){
	    found = true;
	    self.partialView.del(i);
	};
	++i;
    };
    // #2 search within the inView and delete the link
    found = false;
    i = 0;
    while ((!found) && (i<self.inView.length())){
	if (self.inView.get(i).link.index == index){
	    found = true;
	    self.inView.del(i);
	};
	++i;
    };
};


module.exports = (function () { return new LinkFactory(); })();
