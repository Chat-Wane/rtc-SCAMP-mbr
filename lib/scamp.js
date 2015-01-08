// #A external modules or nodejs
var EventEmitter = require('events').EventEmitter;
var SimplePeer = require('simple-peer');

var LRU = require('lru-cache');
var util = require('util');
// #B all kind of messages
var MSubscriptionResponse = require('./messages.js').MSubscriptionResponse;
var MSubscriptionRequest = require('./messages.js').MSubscriptionRequest;
var MOfferResponse = require('./messages.js').MOfferResponse;
var MOfferRequest = require('./messages.js').MOfferRequest;
var MWeightUpdate = require('./messages.js').MWeightUpdate;
var MLeaseOver = require('./messages.js').MLeaseOver;
// #C local prototypes
var LinkFactory = require('./linkfactory.js');
var PendingArray = require('./pendingarray.js');
var ViewArray = require('./viewarray.js');
var Conf = require('./config.js');

util.inherits(SCAMP, EventEmitter);

/*!
 * \brief Represent a peer within a gossip-based protocol using SCAMP as
 * membership. Internally, it has two views representing the in/out peers.
 * When the peer sends a message, it sends it to all the peers in the
 * partialView. When a message is meant to be broadcast, this peer rebroadcast
 * the message to its partialView.
 * \param uid the unique site identifier of this peer
 */
function SCAMP(uid){
    EventEmitter.call(this);

    // #0 connection state: "connected", "partial", "disconnect"
    this.state = "disconnect";
    // #1 uid x counter to ensure uniqueness of broadcast messages
    this.uid = uid; this.counter = 0; // for membership protocol
    
    // #2 neighbourhood partial views for the membership: uid->(link x weight)
    this.partialView = new ViewArray(); 
    this.inView = new ViewArray();
    // #3 webRTC pending messages (TODO) remove from sub
    this.sub = []; this.pending = new PendingArray();
    // #4 backtracking messages using (uid x counter) -> FromChannel
    this.backtrack = LRU(500);

    // #5 update the weights associated with the inView and partialView
    var self = this;
    setInterval(function(){ self.updateWeights(); }, Conf.weightUpdate);
    // #6 regularly renew the lease, i.e., resubscribe to the network
    if (Conf.leaseActivated){
	setInterval(function(){ self.onLeaseOver(); }, Conf.lease);
    };
};

/*!
 * \brief increment the local counter
 * \return a pair {_e: uid, _c: counter}
 */
SCAMP.prototype.increment = function(){
    this.counter += 1;
    return {_e: this.uid, _c: this.counter};
};

/*!
 * \brief generate the very first subscription request to send in order to join
 * the network. After a while, the event "first" is emitted with a subscription
 * message. The peer is in charge to send it himself to another peer in the 
 * network.
 */
SCAMP.prototype.launch = function(callback){
    var self = this;
    var defaultCallback = function(launchMessage){
	setTimeout(function(){ // default emit event
	    self.emit("launch", launchMessage);
	}, Conf.waitSTUN);
    };
    this.launchCallback = callback || defaultCallback;
    var offer = this.generateOffers(1, "launch")[0];

    this.launchCallback(offer);
};

/*!
 * \brief generate a number of offers and return the array of pending link
 * \param k the number of offers to generate
 * \param type the type of link we request
 * \param destUid the unique site identifier of the requesting or answering
 * peer (default to null);
 * \param destCounter the counter of the remote peer when it created the 
 * message that eventually called this function (default to null);
 */
SCAMP.prototype.generateOffers = function(k, type, destUid, destCounter){
    // #0 default values
    var tDestUid = destUid || null;
    var tDestCounter = destCounter || null;
    // #1 create as much offers as required
    var offers = [];
    for (var i = 0; i<k; ++i){
	var pair = this.increment();
	var link = LinkFactory.get.call(this, type, pair._c);
	var msg = null;
	switch(type){
	case "launch":
	    msg = new MSubscriptionRequest(pair._e, pair._c, []);
	    break;
	case "answer":
	    msg = new MSubscriptionResponse(pair._e, pair._c,
					    tDestUid, tDestCounter, []);
	    break;
	case "subscription":
	    msg = new MSubscriptionRequest(pair._e, pair._c, []);
	    break;
	case "response":
	    msg = new MSubscriptionResponse(pair._e, pair._c,
					    tDestUid, tDestCounter, []);
	    break;
	};
	this.pending.add(tDestUid, link);
	this.sub[pair._c] = msg;
	offers.push(this.sub[pair._c]);
    };
    return offers;
};


/*!
 * \brief the new peer subscribe to the network by sending a piece of data.
 * This function forwards the subscription to any peer and get the offer back.
 * Afterwards, "this" peer is responsible to give the offer back to the new
 * subscriber.
 * \param uid the unique site identifier subscribing to the network
 * \param counter the local counter of the site when he decided to subscribe
 * \param offer the piece of data required to establish the connection
 * \param callback the callback function executed at the end of this function
 */
SCAMP.prototype.answer = function(message, callback){
    var self = this;
    this.answerCallback = callback || function(answerMessage){
	setTimeout(
	    function(){
		self.emit("answer", answerMessage);
	    }, Conf.waitSTUN);	
    };
    
    var uid = message.uid;
    var counter = message.counter;
    var offer = message.offer;
    // #1 initialize the length of the walk to reach a random node to contact
    var pair = JSON.stringify({_e:uid, _c:counter});
    this.backtrack.set(pair,null);
    var hop = 2*this.partialView.length()+1;
    this.onForwardedContact(uid, counter, offer, hop);
};

/*!
 * \brief function that decide either if 'this' peer should keep the 
 * subscription or forward it to a peer among its partialView.
 * \param uid the unique site identifier of the peer that subscribed
 * \param counter the counter of the site when it subscribed
 * \param offer the piece of data required to establish a connection
 * \param hop the number of hop required for the indirection mechanism
 * \param callback the callback function executed at the end of this function
 */ 
SCAMP.prototype.onForwardedContact = function(uid, counter, offer, hop){
    var self = this;
    if ((hop === 1) && (uid===this.uid) && (this.partialView.length()===0)){
	return; 
    }
    if (hop > 1 || (uid===this.uid && hop===1)) {
	// #A within the indirection mechanism
	// #1 normalize the weights
	// #1a process the total weight of outgoing arcs
	var wout = 0;
	for (var i = 0; i < this.partialView.length(); ++i){
	    wout += this.partialView.get(i).weight;
	};
	// #1b normalize each outgoing arcs
	for (var i = 0; i < this.partialView.length(); ++i){
	    this.partialView.get(i).weight=this.partialView.get(i).weight/wout;
	};
	// #2 choose the node to forward the subscription
	var rn = Math.random();
	var cumulativeProbability = 0;
	var i = 0;
	while ((cumulativeProbability + this.partialView.get(i).weight)<rn){
	    cumulativeProbability += this.partialView.get(i).weight;
	    ++i;
	};
	// #3 decrement the hop number and forward it to the proper peer
	var fwdhop = Math.max(hop - 1, 1);
	this.send(new MSubscriptionRequest(uid,counter,offer,fwdhop),
		  this.partialView.get(i).link);
    };
    if (hop===1 && uid!==this.uid) {
	// #B 'this' peer becomes the first contact of the subscriber
	// #1 generate the offer
	var offerContact = this.generateOffers(1, "answer", uid, counter)[0];
	var link = this.pending.getObject(uid).link;
	for (var i=0; i<offer.length; ++i){ link.signal(offer[i]); };
	// #2 on ready, the contact add the link to its InView
	link.on("ready", function(){
	    console.log("Send me "+(self.partialView.length()+1)+" offers.");
	    var pair = self.increment();
	    self.inView.add(uid,this);    
	    self.pending.delObject(uid);
	    link.send(new MOfferRequest(pair._e, pair._c,
					self.partialView.length()+Conf.c));
	    self.checkConnectionState();
	});
	// #3 after a while, emit & send the message containing the offer back
	var pair = JSON.stringify({_e:uid, _c:counter});
	if (self.backtrack.has(pair) && self.backtrack.get(pair)===null){
	    this.answerCallback(self.sub[offerContact.counter]);
	} else {
	    setTimeout(
		function(){
		    self.send(self.sub[offerContact.counter]);
		},
		Conf.waitSTUN);
	};
    };
};

/*!
 * \brief function which is regularly called to update the weight of the
 * inView and partialView and send the update to the corresponding neighbours
 */
SCAMP.prototype.updateWeights = function(){
    // #1 update the total weights of the ongoing and outgoing arcs
    var win = 0;
    for (var i=0; i<this.inView.length(); ++i){
	win += this.inView.get(i).weight;
    };
    var wout = 0;
    for (var i=0; i<this.partialView.length(); ++i){
	wout += this.partialView.get(i).weight;
    };
    // #2 update the weight associated with the incoming arcs
    for (var i = 0; i<this.inView.length(); ++i){
	// #2a change the weight value in the array
	var oldWeight = this.inView.get(i).weight;
	this.inView.get(i).weight =
	    Math.round(100 * this.inView.get(i).weight / win)/100;
	// 2b only onChange, send the update message
	if (oldWeight !== this.inView.get(i).weight){
	    var message = new MWeightUpdate(this.uid, true,
					    this.inView.get(i).weight);
	    this.send(message, this.inView.get(i).link);
	};
    };
    // #3 update the weight associated with the outgoing arcs
    for (var i = 0; i<this.partialView.length(); ++i){
	// #3a change the weight value in the array
	var oldWeight = this.partialView.get(i).weight;
	this.partialView.get(i).weight =
	    Math.round(100 * this.partialView.get(i).weight / wout)/100;
	// #3b only onChange, send the update message
	if (oldWeight !== this.partialView.get(i).weight){
	    var message = new MWeightUpdate(this.uid, false,
					    this.partialView.get(i).weight);
	    this.send(message, this.partialView.get(i).link);
	};
    };
};

/*!
 * \brief A peer inside the network answered our subscription request, this
 * function finishes the handshake between the two peers.
 * \param uid the unique site identifier of the remote peer
 * \param counter the counter of 'this' peer when it generated the offer
 * \param offer the offer of the remote peer to establish a WebRTC link
 */
SCAMP.prototype.handshake = function(message){
    var uid = message.uid;
    var counter = message.destCounter;
    var offer = message.offer;
    var self = this;
    // #1 get the link back (cannot use uid since it is not defined yet)
    var link = this.pending.get(
	this.pending.indexOfLinkWithCounter(counter)).link;
    link.on("ready", function(){
	self.checkConnectionState();
	self.partialView.add(uid,this);
	self.pending.del(self.pending.indexOfLinkWithCounter(this.counter));
	self.checkConnectionState();
    });
    for (var i = 0; i<offer.length; ++i){
	link.signal(offer[i]);	
    };
};

SCAMP.prototype.ready = function(callback){
    if (this.state === "connect"){
	callback();
    } else {
	this.on("connect", callback);
    };
};

/*!
 * \brief the peer send a message to a specific link.
 * \param message the message to send
 * \param link the message is sent through this link, if none is specified, it
 * searches if this message is a response, and if it must be backtracked using
 * a specific link.
 */
SCAMP.prototype.send = function(message, link){
    if (link !== undefined){
	link.send(message);
    } else {
	if (message.category === "response"){
	    var pair = JSON.stringify({_e:message.destUid,
				       _c:message.destCounter});
	    if (this.backtrack.has(pair) && this.backtrack.get(pair)!==null){
		this.backtrack.get(pair).send(message);
	    };
	};
    };
}

/*!
 * \brief redirect the processing of the message to the proper function (e.g.
 * a new subscription message will be redirected to the function onSubscription
 * \param link the WebRTC that receive the message
 * \param message the received message
 */
SCAMP.prototype.receive = function(link, message){
    // #1 the message is a request whose response will be backtracked
    if (message.category === "request"){
	var pair = JSON.stringify({_e:message.uid, _c:message.counter});
	if (!this.backtrack.has(pair)){
	    this.backtrack.set(pair,link);
	};
    };
    // #2 handle each kind of messages
    switch(message.type){
    case "MLeaseOver":
	console.log("received "+ message.type +"; from = "+ message.uid);
	var pair = this.increment();
	this.send(new MOfferRequest(pair._e,pair._c,
				    this.partialView.length()), link);
	break;
    case "MOfferResponse":
	console.log("received "+message.type+ "; k = "+message.offers.length);
        for (var i = 0; i<message.offers.length; ++i){
	    var pair = JSON.stringify({_e:message.offers[i].uid,
				       _c:message.offers[i].counter});
	    if (!this.backtrack.has(pair)){
		this.backtrack.set(pair,link);
	    };
	};
	this.dispatchSubscriptions(message.offers);
	break;
    case "MOfferRequest":
	console.log("received "+message.type+"; k = "+Math.max(1,message.k));
        var offers = this.generateOffers(Math.max(1,message.k),
					 "subscription",
					 message.uid, message.counter);
	var self = this;
	setTimeout(function(){
	    self.send(new MOfferResponse(self.uid,
					 message.uid, message.counter,
					 offers));}, Conf.waitSTUN);
	 break;
    case "MWeightUpdate":
	console.log("received "+message.type+"; uid = "+message.uid);
	if (message.isFromInView){
	    this.partialView.getObject(message.uid).weight = message.weight;
	} else {
	    this.inView.getObject(message.uid).weight = message.weight;
	};
	break;
    case "MSubscriptionRequest":
	console.log("received "+message.type+"; hop = "+ message.hop);
	this.onForwardedContact(message.uid, message.counter,
				message.offer,
				message.hop);
	this.onForwardedSubscription(message.uid, message.counter,
				     message.offer,
				     message.hop);
	break;
    case "MSubscriptionResponse": console.log("received "+message.type);
	if (message.destUid === this.uid){
	    var self = this;
	    var link = this.pending.get(
		this.pending.indexOfLinkWithCounter(message.destCounter)).link;
	    link.on("ready", function(){
		self.inView.add(message.uid, this);
		self.pending.del(
		    self.pending.indexOfLinkWithCounter(message.destCounter));
		self.checkConnectionState();
	    });
	    for (var i = 0; i<message.offer.length; ++i){
		link.signal(message.offer[i]);
	    };
	} else {
	    var pair = JSON.stringify({_e:message.destUid,
				       _c:message.destCounter});
	    if (this.backtrack.has(pair) && this.backtrack.get(pair)===null){
		this.answerCallback(message);
	    } else {
		this.send(message);
	    }
	}
	break;
    default:
	this.emit('churn', link, message);
	break;
    };
};


/*!
 * \brief gets a subset of the partialView randomly chosen
 * \param k the number of link within the partial view
 * \param an array of objects {uid, link}
 */
SCAMP.prototype.getPeers = function(k){
    var k = k || this.partialView.length();
    var result = [];
    while (result.length < Math.min(k, this.partialView.length()) ){
	var rn = Math.floor(Math.random()*this.partialView.length());
	var found = false;
	var i = 0;
	while(i<result.length && !found){
	    if (this.partialView.get(rn).uid === result[i].uid){
		found = true;
	    } else {
		++i;
	    };
	};
	if (!found){
	    result.push(this.partialView.get(rn).link);
	};
    };
    return result;
};


/*!
 * \brief sends a message to all neighbours in the partial view
 * \param message the message to send
 */
SCAMP.prototype.sendToPartialView = function(message){
    var i = 0;
    while (i<this.partialView.length()){
	this.send(message, this.partialView.get(i).link);
	++i;
    };
};

/*!
 * \brief received a message with one or more subscription request of one peer.
 * This function choose if it keeps the subscription in its partialView or it
 * forwards it to other peers. Each subscription must be eventually accepted
 * \param uid the unique site identifier which wants to enter in the network
 * \param offers the informations to contact this peer directly via webRTC
 */
SCAMP.prototype.dispatchSubscriptions = function(offers){
    // #0 if our partialView is empty, we keep the offer for ourself
    if ((this.partialView.length() === 0) && (offers.length > 0)){
	this.onForwardedSubscription(offers[0].uid,
				     offers[0].counter,
				     offers[0].offer);
    } else {
	for (var i=0; i<Math.min(this.partialView.length(),offers.length);++i){
	    this.send(offers[i], this.partialView.get(i).link);
	};
	// (TODO) limited number of receiving a same request
	// #1 forward a subscription to each peer in the partialView
//	for (var i = 0; i<this.partialView.length(); ++i){
//	    this.send(offers[i], this.partialView.get(i).link);
//	};
	// #2 forward the c additionnal copies to random peers in partialView
//	for (var j = i; j<this.partialView.length()+offers.length; ++j){
//	    var rn = Math.floor(Math.random()*this.partialView.length());
//	    this.send(offers[j], this.partialView.get(rn).link);
//	};
    };
};

/*!
 * \brief event called when this peer receive a forwarded subscription. This 
 * peer must decide if it keeps it or forwards it. When the size of the 
 * partial view of a peer increases, it decreases the probability of keeping 
 * the new subscription. All subscription must be eventually accepted.
 * \param uid the unique site identifier of the subscriber
 * \param dataList the necessary data required to establish the p2p link
 */
SCAMP.prototype.onForwardedSubscription = function(uid, counter, offer, hop){
    if (hop >= 1) { return; };
    var self = this;
    // #1 check if we add the subscription to our partialView
    if ((!(uid == this.uid)) && // not our own subscription request
	(!(this.partialView.contains(uid))) && // not already known and active
	(!(this.pending.contains(uid))) && // not in our pending offers
	Math.random() <= (1/(1+this.partialView.length()))){ // random ok
	// #2a create the new link, add it to pending
	var offerBack = this.generateOffers(1, "response",
					    uid, counter)[0];
	var link = this.pending.getObject(uid).link;
	for (var i = 0; i<offer.length; ++i){ link.signal(offer[i]); };
	// #2b when the link is ready, we add it to the partialView
	link.on("ready", function(){
	    self.partialView.add(uid, this);
	    self.pending.delObject(uid);
	    self.checkConnectionState();
	});
	// #2c send the response message back
	setTimeout(function(){
	    self.send(self.sub[link.counter]);
	},Conf.waitSTUN);
    } else {
	// #3 otherwise, forward the message to a random peer in partial view
	var rn = Math.floor(Math.random()*this.partialView.length());
	self.send(new MSubscriptionRequest(uid,counter,offer),
		  this.partialView.get(rn).link);
	
    };
};

/*!
 * \brief verify if the connection state changed. On change, it emit an event
 * "statechange" with the associated state in parameter
 */
SCAMP.prototype.checkConnectionState = function(){
    // #1 process the new state
    var newState = "disconnect";
    if ((this.partialView.length()>0) && this.inView.length()>0){
	newState = "connect";
    };
    if ((newState!=="connect") &&
	(this.partialView.length()>0 ||	(this.inView.length()>0))){
	newState = "partial";
    };
    // #2 if the new state is different than the actual one, emit an event
    if (newState!==this.state){
	this.state = newState;
	this.emit("statechange", newState);
    };
};


/*!
 * \brief function that implements the lease mechanism. Subscriptions die after
 * a while. The peer must resubscribe to one of the peers and send offers to
 * it.
 */
SCAMP.prototype.onLeaseOver = function(){
    // #0 if there are no peers in 'this' partialView, don't bother
    if (this.partialView.length() === 0){return ;};
    // #1 close all the links of its inView
    var i = 0;
    while (i<this.inView.length()){
	this.inView.del(i);
	++i;
    };
    // #2 send a message to a random peer in the partialView to know how
    // much offers 'this' must send
    var rn = Math.floor(Math.random()*this.partialView.length());
    var pair = this.increment();
    this.send(new MLeaseOver(pair._e, pair._c), this.partialView.get(rn).link);
};


module.exports = SCAMP;