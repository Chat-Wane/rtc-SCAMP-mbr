var EventEmitter = require('events').EventEmitter;
var SimplePeer = require('simple-peer');
var Track = require('causaltrack').IVV;
var LRU = require('lru-cache');
var util = require('util');

var MSubscriptionResponse = require('./messages.js').MSubscriptionResponse;
var MSubscriptionRequest = require('./messages.js').MSubscriptionRequest;
var MOfferResponse = require('./messages.js').MOfferResponse;
var MOfferRequest = require('./messages.js').MOfferRequest;
var MHeartbeat = require('./messages.js').MHeartbeat;
var MWeightUpdate = require('./messages.js').MWeightUpdate;

var LinkFactory = require('./linkfactory.js');
var ViewArray = require('./viewarray.js');
var Conf = require('./config.js');

util.inherits(Peer, EventEmitter);

/*!
 * \brief Represent a peer within a gossip-based protocol using SCAMP as
 * membership. Internally, it has two views representing the in/out peers.
 * When the peer sends a message, it sends it to all the peers in the
 * partialView. When a message is meant to be broadcast, this peer rebroadcast
 * the message to its partialView.
 * \param uid the unique site identifier of this peer
 */
function Peer(uid){
    EventEmitter.call(this);
    // #1 uid x counter to ensure uniqueness of broadcast messages
    this.track = new Track(uid);
    // #2 neighbourhood partial views for the membership: uid->(link x weight)
    this.partialView = new ViewArray(); 
    this.inView = new ViewArray();
    // #3 webRTC pending messages (TODO) remove them when no pending anymore
    this.sub = [];
    this.pending = [];
    // #4 backtracking messages using (uid x counter) -> FromChannel
    this.backtrack = LRU(500);
    // #5 heartbeat messages are sent regularly to update inView
    var self = this;
    setInterval(function(){
	self.broadcast(new MHeartbeat(uid));
    }, Conf.heartbeat);
    // #6 update the weights associated with the inView and partialView
    setInterval(function(){
	self.updateWeights();
    }, Conf.weightUpdate);
};

/*!
 * \brief generate the very first subscription request to send in order to join
 * the network. After a while, the event "first" is emitted with a subscription
 * message. The peer is in charge to send it himself to another peer in the 
 * network.
 */
Peer.prototype.generateFirst = function(){
    this.generateOffers(1, "first");
};

/*!
 * \brief generate a number of offers and return the array of pending link
 * \param k the number of offers to generate
 * \param type the type of link we request
 */
Peer.prototype.generateOffers = function(k, type){
    var offers = [];
    var self = this;
    var length = this.sub.length;
    // #1 create as much offers as required
    for (var i = 0; i<k; ++i){
	var pair = this.track.increment();
	var link = LinkFactory.get.call(this, type, pair._c);
	var msg = null
	switch(type){
	case "first":
	    msg = new MSubscriptionRequest(pair._e, pair._c, []);
	    break;
	case "contact":
	    msg = new MSubscriptionResponse(pair._e, pair._c, null, null, []);
	    break;
	case "subscription":
	    msg = new MSubscriptionRequest(pair._e, pair._c, []);
	    break;
	case "response":
	    msg = new MSubscriptionResponse(pair._e, pair._c, null, null, []);
	    break;
	};
	this.pending[pair._c] = link;
	this.sub[pair._c] = msg;
	offers.push(this.sub[pair._c]);
    };
    // #2 after a while, emit the messages containing the offers
    setTimeout(function(){
	for (var i = length; i<self.sub.length; ++i){
	    self.emit(type, self.sub[i]);
	};
    }, Conf.waitSTUN);
    // #3 return the array of links
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
 */
Peer.prototype.onContact = function(uid, counter, offer){
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
 */ 
Peer.prototype.onForwardedContact = function(uid, counter, offer, hop){
    if (hop > 1) {
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
	var fwdhop = hop - 1;
	this.send(new MSubscriptionRequest(uid,counter,offer,fwdhop),
		  this.partialView.get(i).link);
    };
    if (hop==1) {
	// #B 'this' peer becomes the first contact of the subscriber
	// #1 generate the offer
	var offerContact = this.generateOffers(1, "contact")[0];
	this.sub[offerContact.counter].destUid = uid;
	this.sub[offerContact.counter].destCounter = counter;
	for (var i=0;i<offer.length;++i){
	    this.pending[offerContact.counter].signal(offer[i]);
	};
	// #2 on ready, the contact add the link to its InView
	var self = this;
	var link = this.pending[offerContact.counter];
	link.on("ready", function(){
	    console.log("Send me "+(self.partialView.length()+1)+" offers.");
	    var pair = self.track.increment();
	    link.send(new MOfferRequest(pair._e, pair._c,
					self.partialView.length()+Conf.c+1 ));
	    self.inView.add(uid,this);
	});
	// #3 after a while, emit & send the message containing the offer back
	setTimeout(function(){
	    self.send(self.sub[offerContact.counter]);},Conf.waitSTUN);
    };
};

/*!
 * \brief function which is regularly called to update the weight of the
 * inView and partialView and send the update to the corresponding neighbours
 */
Peer.prototype.updateWeights = function(){
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
	this.inView.get(i).weight = this.inView.get(i).weight / win;
	this.send(new MWeightUpdate(this.track.local.e, true,
				    this.inView.get(i).weight),
		  this.inView.get(i).link);
    };
    // #3 update the weight associated with the outgoing arcs
    for (var i = 0; i<this.partialView.length(); ++i){
	this.partialView.get(i).weight = this.partialView.get(i).weight / wout;
	this.send(new MWeightUpdate(this.track.local.e, false,
				    this.partialView.get(i).weight),
		  this.partialView.get(i).link);
    };
};

/*!
 * \brief A peer inside the network answered our subscription request, this
 * function finishes the handshake between the two peers.
 * \param uid the unique site identifier of the remote peer
 * \param counter the counter of 'this' peer when it generated the offer
 * \param offer the offer of the remote peer to establish a WebRTC link
 */
Peer.prototype.acceptContact = function(uid, counter, offer){
    var self = this;
    this.pending[counter].on("ready", function(){
	self.partialView.add(uid,this);
    });
    for (var i = 0; i<offer.length; ++i){
	this.pending[counter].signal(offer[i]);	
    };
};

/*!
 * \brief the peer send a message to a specific link.
 * \param message the message to send
 * \param link the message is sent through this link, if none is specified, it
 * searches if this message is a response, and if it must be backtracked using
 * a specific link.
 */
Peer.prototype.send = function(message, link){
    if (link !== undefined){
	link.send(message);
    } else {
	if (message.category == "response"){
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
Peer.prototype.receive = function(link, message){
    // #0 (TODO) add a mechanism to remove old received messages
    // #1 the message is a request whose response will be backtracked
    // #1a the message is a request
    if (message.category == "request"){
	var pair = JSON.stringify({_e:message.uid, _c:message.counter});
	if (!this.backtrack.has(pair)){
	    this.backtrack.set(pair,link);
	};
    };
    switch(message.type){
    case "MOfferResponse": console.log("received "+message.type); break;
    case "MOfferRequest":  console.log("received "+message.type); break;
    case "MWeightUpdate":
	if (this.isFromInView){
	    this.partialView.getObject(message.uid).weight = message.weight;
	} else {
	    this.inView.getObject(message.uid).weight = message.weight
	}
	break;
    case "MSubscriptionRequest":
	console.log("received "+message.type+"; hop = "+ message.hop);
	// #A the message is a forwarded subscription
	this.onForwardedContact(message.uid, message.counter,
				message.offer,
				message.hop);
	this.onForwardedSubscription(message.uid, message.counter,
				     message.offer,
				     message.hop);
	break;
    case "MSubscriptionResponse":  console.log("received "+message.type);
	// #B the message is a response to a subscription request
	if (message.destUid == this.track.local.e){
	    var self = this;
	    var position = message.destCounter;
	    this.pending[position].on("ready", function(){
		self.inView.add(message.uid, this);
	    });
	    for (var i = 0; i<message.offer.length; ++i){
		this.pending[position].signal(message.offer[i]);
	    };
	} else {
	    var pair = JSON.stringify({_e:message.destUid,
				       _c:message.destCounter});
	    if (this.backtrack.has(pair) && this.backtrack.get(pair)===null){
		this.emit("contact", message);
	    } else {
		this.send(message);
	    }
	}
	break;
    case "MHeartbeat":
	console.log("received "+message.type + ";uid = "+message.uid);
	// #C the message is a heartbeat
	break;
    };
    if (message.category == "broadcast"){
	// #D the message is to be broadcast
	console.log("re-broadcast");
	this.broadcast(message);
    };
};


/*!
 * \brief sends a message to all the peers in the neighbourhood. From one
 * neighbour to another, the message reaches all participants in the network 
 * with a high probability. Furthermore, messages are forwarded only once.
 * (Note: Heartbeat messages are not forwarded)
 * \param message the message to broadcast
 */
Peer.prototype.broadcast = function(message){
    // (TODO) change for a more reliable way to crawl the array
    // i.e., if a peer link dies, this function may crash
    // #0 verify if the message has already been seen (TODO)
    // #1 browse the partialView and send the message
    for (var i = 0; i<this.partialView.length(); ++i){
	this.send(message, this.partialView.get(i).link);
    };
};

/*!
 * \brief received a message with one or more subscription request of one peer.
 * This function choose if it keeps the subscription in its partialView or it
 * forwards it to other peers. Each subscription must be eventually accepted
 * \param uid the unique site identifier which wants to enter in the network
 * \param offers the informations to contact this peer directly via webRTC
 */
Peer.prototype.dispatchSubscriptions = function(offers){
    // #0 if our partialView is empty, we keep the offer for ourself
    if ((this.partialView.length() == 0) && (offers.length > 0)){
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
Peer.prototype.onForwardedSubscription = function(uid, counter, offer, hop){
    if (hop >= 1) {return;}
    var self = this;
    // #1 check if we add the subscription to our partialView
    if ((!(this.partialView.contains(uid))) &&
	Math.random() <= (1/(1+this.partialView.length()))){
	// #2a create the new link, add it to pending
	var offerBack = this.generateOffers(1, "response")[0];
	this.sub[offerBack.counter].destUid = uid;
	this.sub[offerBack.counter].destCounter = counter;
	var link = this.pending[offerBack.counter];
	for (var i = 0; i<offer.length; ++i){ link.signal(offer[i]); };
	// #2b when the link is ready, we add it to the partialView
	link.on("ready", function(){
	    self.partialView.add(uid, this);
	});
	// #2c send the response message back
	setTimeout(function(){
	    self.send(self.sub[link.index]);
	},Conf.waitSTUN);
    } else {
	// #3 otherwise, forward the message to a random peer in partial view
	var rn = Math.floor(Math.random()*this.partialView.length());
	self.send(new MSubscriptionRequest(uid,counter,offer),
		  this.partialView.get(rn).link);
	
    };
};


module.exports = Peer;
