var SimplePeer = require('simple-peer');
var MOfferResponse = require("./messages.js").MOfferResponse;
var MOfferRequest = require("./messages.js").MOfferRequest;

function LinkFactory(){
}

LinkFactory.prototype.get = function(type, counter){
    var link;
    switch (type){
    case "launch": // very first offer
	link = new SimplePeer({initiator: true});
        link.counter = counter;
        setClassicLink(link,this);
        break;
    case "answer": // first contact connected to within the network
        link = new SimplePeer();
        link.counter = counter;
        setClassicLink(link,this);
        break;
    case "subscription": // link as subscription sent through the network
        link = new SimplePeer({initiator: true});
        link.counter = counter;
        setClassicLink(link, this);
        break;
    case "response": // link as response to the subscription sent
        link = new SimplePeer();
        link.counter = counter;
        setClassicLink(link, this);
        break;
    };
    
    return link;
};

function setClassicLink(link, self){
    link.on('signal', function(data){
        self.sub[this.counter].offer.push(data);
    });
    link.on('ready', function(){
        console.log("A direct connection to a new peer has been established!");
    });
    link.on('message', function(message){
        self.receive(this, message);
    });
    link.on('error', function(err){
        // (TODO) understand exactly the kind of errors generated
    });
    link.on('close', function(){
        console.log("A direct connection has been closed!");
        removeLinkFromViews(this.counter, self);
        self.checkConnectionState();
        // (TODO) handle the resubscriptions as in the paper
    });
};

function removeLinkFromViews(counter, self){
    var found = false, i = 0;
    // #1 search within the partialView and delete the link
    while ((!found) && (i<self.partialView.length())){
        if (self.partialView.get(i).link.counter === counter){
            found = true;
            self.partialView.del(i);
        };
        ++i;
    };
    // #2 search within the inView and delete the link
    found = false;
    i = 0;
    while ((!found) && (i<self.inView.length())){
        if (self.inView.get(i).link.counter === counter){
            found = true;
            self.inView.del(i);
        };
        ++i;
    };
};


module.exports = (function () { return new LinkFactory(); })();
