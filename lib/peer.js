var EventEmitter = require('events').EventEmitter;
var SimplePeer = require('simple-peer');
var LRU = require('lru-cache');
var Track = require('causaltrack').IVV;
var util = require('util');
require('./util.js');

var MSubscriptionResponse = require('./messages.js').MSubscriptionResponse;
var MSubscriptionRequest = require('./messages.js').MSubscriptionRequest;
var MOfferResponse = require('./messages.js').MOfferResponse;
var MOfferRequest = require('./messages.js').MOfferRequest;
var MHeartbeat = require('./messages.js').MHeartbeat;

var ViewEntry = require('./viewentry.js');
var Conf = require('./config.js');

util.inherits(Peer, EventEmitter);

/*!
 * \brief Represent a peer within a gossip-based protocol using SCAMP as
 * membership. Internally, it has two views representing the in/out peers.
 * When the peer sends a message, it sends it to all the peers in the
 * partialView. Also, each message received through the inView is forwarded
 * to the partialView.
 * \param uid the unique site identifier of this peer
 */
function Peer(uid){
    EventEmitter.call(this);
    // #1 uid x counter to ensure uniqueness of broadcast messages
    this.track = new Track(uid);

    // #2 neighbourhood partial views for the membership: uid -> link
    this.partialView = []; 
    this.inView = [];
    this.pending = [];

    // #3 webRTC pending messages (TODO) remove them when no pending anymore
    this.sub = [];

    // #4 backtracking messages using (uid x counter) -> FromChannel
    this.backtrack = LRU(500);

    // #4 heartbeat messages are sent regularly to update inView
    var self = this;
    setInterval(function(){
	if (self.partialView.length>0){
	    self.broadcast(new MHeartbeat(uid));
	}}, Conf.heartbeat);
};

/*!
 * \brief generate a number of offers and return the array of pending link
 * \param k the number of offers to generate
 */
Peer.prototype.generateOffers = function(k){
    var offers = [];
    var self = this;
    var length = this.sub.length;
    for (var i = 0; i<k; ++i){
	var pair = this.track.increment();
	var link = new SimplePeer({initiator:true});
	link.index = pair._c;
	this.sub[pair._c] = new MSubscriptionRequest(pair._e,
						     pair._c,
						     []);
	this.pending[pair._c] = link;
	this.setLink(link);
	offers.push(this.sub[pair._c]);
    };
    
    setTimeout(function(){
	for (var i = length; i<self.sub.length; ++i){
	    self.emit("offer", self.sub[i]);
	};
    }, 3000);
    
    return offers;
};

/*! 
 * \brief first function that will initialize the network. The peer "this", is
 * outside of the gossip network. One of the peer inside gives him an offer to
 * enter inside. The outside peer create an offer back to establish the
 * connection.
 * \param uid the unique site identifier of the peer which created the offer
 * \param counter the local counter of the peer when it generated the offer
 * \param offer the data that represents the offer, i.e., the output of
 * the stun WebRTC server
 */
Peer.prototype.onContact = function(uid, counter, offer){
    var self = this;
    // #1 create the peer and signal it the incomming offer
    var firstLink = new SimplePeer();
    for (var i = 0; i<offer.length; ++i){firstLink.signal(offer[i]);};
    // #2 initialize the accept message and put the link in pending
    var pair = self.track.increment();
    firstLink.index = pair._c;
    this.sub[pair._c] = new MSubscriptionResponse(pair._e, pair._c,
						  uid, counter,
						  []);
    this.pending[pair._c] = firstLink;
    this.setLink(firstLink);
    // #3 preparing the link to send some offer into the network
    firstLink.on("message", function(message){
	if (message.type == "MOfferRequest"){
	    var offers = self.generateOffers(message.k);
	    setTimeout(function(){
		firstLink.send(new MOfferResponse(self.track.local.e,
						  message.uid, message.counter,
						  offers));}, 3000);
	    console.log("Ok friend! Here are the " + message.k +
			" requested offers! :3");
	};
    });
    firstLink.on("ready", function(){
	var viewEntry = new ViewEntry(uid,this);
	var position  = self.partialView.binaryIndexOf(uid);
	self.partialView.splice(-position,0,viewEntry);
    });
    
    setTimeout(function(){self.emit("offer",self.sub[firstLink.index]);},3000);
};

/*!
 * \brief the first contact with an external peer has been established. The 
 * peer 'this' requests a bunch of new offers to allow peers within the
 * the network to contact the new peer.
 * \param uid the unique site identifier of the remote peer
 * \param counter the counter of 'this' peer when it generated the offer
 * \param offer the offer of the remote peer to establish a WebRTC link
 */
Peer.prototype.onContactAccepted = function(uid, counter, offer){
    var self = this;
    this.pending[counter].on("ready", function(){
	console.log("Send me "+(self.partialView.length+1)+" offers, friend.");
	var pair = self.track.increment();
	self.pending[counter].send(
	    new MOfferRequest(pair._e, pair._c,
			      self.partialView.length + Conf.c + 1));
	var viewEntry = new ViewEntry(uid, this);
	var pos = self.inView.binaryIndexOf(uid);
	self.inView.splice(pos,0,viewEntry);
    });
    for (var i = 0; i<offer.length; ++i){
	this.pending[counter].signal(offer[i]);	
    };
};

/*!
 * \brief defines the behaviour of link using the event provided by simplepeer
 * \param link the link to setup
 */
Peer.prototype.setLink = function(link){
    var self = this;
    link.on('signal', function(data){
	if (("sdp" in data) ||
	    (("candidate" in data)&&(data.candidate.sdpMid=="data"))){
	    self.sub[this.index].offer.push(data);
	};
    });
    link.on('ready', function(){
	console.log("New friend, yaay ! :3");
    });
    link.on('message', function(message){
	self.receive(this, message);
    });
    link.on('error', function(err){
	// (TODO)
    });
}

/*!
 * \brief redirect the processing of the message to the proper function (e.g.
 * a new subscription message will be redirected to the function onSubscription
 * \param link the WebRTC that receive the message
 * \param message the received message
 */
Peer.prototype.receive = function(link, message){
    // #0 check if we already received this message in the past
    if (message.category == "request"){
	this.backtrack.set({_e:message.uid, _c:message.counter},link);
    };
    // #1 special kind of message actually containing request to fwd
    if (message.type == "MOfferResponse"){
	console.log("Just received "+message.offers.length+" offers!!");
	for (var i = 0; i<message.offers.length; ++i){
	    this.backtrack.set({_e:message.offers[i].uid,
				_c:message.offers[i].counter},link);
	};
	this.onSubscription(message.offers); return;
    };
    // #2 the message is a response to a particular message
    if (message.category == "response"){
	// #2a this message is for 'this' peer
	if (message.destUid == this.track.local.e){	    
	    if (message.type == "MSubscriptionResponse"){
		var self = this;
		var position = message.destCounter;
		this.pending[position].on("ready", function(){
		    console.log("Backtracted sub' works!! yayyy!");
		    var viewEntry = new ViewEntry(message.uid, this);
		    var pos = self.inView.binaryIndexOf(message.uid);
		    self.inView.splice(pos,0,viewEntry);
		});
		for (var i = 0; i<message.offer.length; ++i){
		    this.pending[position].signal(message.offer[i]);
		};
	    };
	    return;
	};
	// #2b this message must be backtracked
	var pair = {_e:message.destUid,_c:message.destCounter};
	if (this.backtrack.has(pair)){
	    this.backtrack.get(pair).send(message);
	};
	return;
    };
    
    if (message.type == "MHeartbeat"){
	console.log("Peer "+message.uid+" is alive! Good to know :3"); return;
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
    for (var i = 0; i<this.partialView.length; ++i){
	this.partialView[i].link.send(message);
    };
};

/*!
 * \brief received a subscription message. This function choose if it keeps
 * the subscription in its partialView or it forwards it.
 * \param uid the unique site identifier which wants to enter in the network
 * \param offers the informations to contact this peer directly via webRTC
 */
Peer.prototype.onSubscription = function(offers){
    // #0 if our partialView is empty, we keep the offer for ourself
    if ((this.partialView.length == 0) && (offers.length > 0)){
	this.onForwardedSubscription(offers[0].uid,
				     offers[0].counter,
				     offers[0].offer);
    };
    // #1 forward the subscription to each peer in the partialView + c
    // additionnal copies of the subscription
    var rn = Math.floor(Math.random()*this.partialView.length);
    //this.partialView[rn].send(new MSubscriptionRequest(uid, offers));
};

/*!
 * \brief event called when this peer receive a forwarded subscription. This 
 * peer must decide if it keeps it or forwards it. When the size of the 
 * partial view of a peer increases, it decreases the probability of keeping 
 * the new subscription. All subscription must be eventually accepted.
 * \param uid the unique site identifier of the subscriber
 * \param dataList the necessary data required to establish the p2p link
 */
Peer.prototype.onForwardedSubscription = function(uid, counter, offer){
    var self = this;
    // #1 check if we add the subscription to our partialView
    // (TODO) verify if it is automatically fwd if already in partialview
    if (Math.random() < (1/(1+this.partialView.length))){
	// #2a create the new link, add it to pending
	var link = new SimplePeer();
	var pair = this.track.increment();
	link.index = pair._c;
	this.sub[pair._c] = new MSubscriptionResponse(pair._e, pair._c,
						      uid, counter,
						      []);
	this.pending[pair._c] = link;
	this.setLink(link);
	for (var i = 0; i<offer.length; ++i){
	    link.signal(offer[i]);
	};
	
	// #2b when the link is ready, we add it to the partialView
	link.on("ready", function(){
	    var position = self.partialView.binaryIndexOf(uid);
	    var viewEntry = new ViewEntry(uid, this);
	    self.partialView.splice(position,0,viewEntry);
	});
	// #2c send the response message back
	setTimeout(function(){
	    if (self.backtrack.has({_e:uid,_c:counter})){
		self.backtrack.get({_e:uid,_c:counter}).send(
		    self.sub[link.index]);
	    };
	},3000);
	
    } else {
	// #3 otherwise, forward the message to a random peer in partial view
	var rn = Math.floor(Math.random()*this.partialView.length);
	this.partialView[rn].link.send(
	    new MSubscriptionRequest(uid,counter,offer));
    };
};


module.exports = Peer;
