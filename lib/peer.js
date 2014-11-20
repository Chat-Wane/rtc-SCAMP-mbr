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
	link.index = this.sub.length;
	this.sub.push(new MSubscriptionRequest(pair._e,
					       pair._c,
					       []));
	this.pending.push(link);
	this.setLink(link);
	offers.push(this.sub[i]);
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
    firstLink.index = this.sub.length;
    // #2 initialize the accept message and put the link in pending
    var pair = self.track.increment();
    this.sub.push(new MSubscriptionResponse(pair._e, pair._c,
					    uid, counter,
					    []));
    this.pending.push(firstLink);
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
    var position = counter-1;
    this.pending[position].on("ready", function(){
	console.log("Send me " + self.partialView.length+1+" offers, friend.");
	self.pending[position].send(
	    new MOfferRequest(self.track.local.e,
			      uid,
			      self.partialView.length + 1 + Conf.c));
	var viewEntry = new ViewEntry(uid, this);
	var pos = self.inView.binaryIndexOf(uid);
	self.inView.splice(pos,0,viewEntry);
    });
    for (var i = 0; i<offer.length; ++i){
	this.pending[position].signal(offer[i]);	
    };
};

/*!
 * \brief defines the behaviour of link using the event provided by simplepeer
 * \param link the link to setup
 */
Peer.prototype.setLink = function(link){
    var self = this;
    link.on('signal', function(data){
	self.sub[this.index].offer.push(data);
    });
    link.on('ready', function(){
	console.log("New friend, yaay ! :3");
    });
    link.on('message', function(message){
	self.receive(link, message);
    });
}

/*!
 * \brief redirect the processing of the message to the proper function (e.g.
 * a new subscription message will be redirected to the function onSubscription
 * \param message the received message
 */
Peer.prototype.receive = function(link, message){
    // #0 check if we already received this message in the past
    // #1 check if the message is for "this" peer
    if (message.type == "MOfferResponse"){
	console.log("Just received "+message.offers.length+" offers!!");
	self.onSubscription(message.uid, message.offers); return;
    };
    if (message.type == "MHeartbeat"){
	console.log("Peer "+message.uid+" is alive! Good to know :3"); return;
    };
    // #2 check if the message is a response to backtrack
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
Peer.prototype.onSubscription = function(uid, offers){
    // #0 if our partialView is empty, we keep the offer for ourself
    if ((this.partialView.length == 0) && (offers.length != 0)){
	
    }
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
Peer.prototype.onForwardedSubscription = function(uid, dataList){
    var self = this;
    // #1 check if we add the subscription to our partialView
    if (Math.random() <  (1/(1+this.partialView.length))){
	// #2 check if the link is not already included
	var position = this.partialView.binaryIndexOf(uid);
	if (position < 0 || (position == 0 && this.partialView.length==0)){
	    // #3 create an offer to handshake
	    var contact = new SimplePeer();

	    for (var i = 0; i< dataList.length; ++i){
		contact.signal(dataList[i]);
	    };
	    contact.index = this.offers.length;
	    this.offers[this.offers.length] = [];

	    contact.on("signal", function(data){
		self.offers[this.index].push(data);
	    });

	    setTimeout(function(i){
		var pair = self.track.increment();
		self.broadcast(
		    new MSubscriptionResponse(pair._e, pair._c,
					      uid,
					      self.offers[i]));
	    }, 3000, contact.index);
	    
	    contact.on("ready", function(data){
		// (TODO) verify if it does not already exist
		var position = self.inView.binaryIndexOf(uid);
		var viewEntry = new ViewEntry(uid, this);
		self.inView.splice(position,0,viewEntry);
	    });
	};
    };
};


module.exports = Peer;
