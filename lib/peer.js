var EventEmitter = require('events').EventEmitter;
var SimplePeer = require('simple-peer');
var Track = require('causaltrack').IVV;
var util = require('util');
require('./util.js');

var MessageSubscription = require('./messagesubscription.js');
var MessageAcceptedSubscription = require('./messageacceptedsubscription.js');
var MessageHeartbeat = require('./messageheartbeat.js');
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

    // #4 heartbeat messages are sent regularly to update inView
    var self = this;
    setInterval(function(){
	if (self.partialView.length>0){
	    self.broadcast(new MessageHeartbeat(uid));
	}}, Conf.heartbeat);
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
    var firstContact = new SimplePeer();
    for (var i = 0; i<offer.length; ++i){firstContact.signal(offer[i]);};
    firstContact.index = this.sub.length;
    // #2 initialize the accept message
    var pair = self.track.increment();
    this.sub.push(new MessageAcceptedSubscription(pair._e,
						  pair._c,
						  uid,
						  counter,
						  []));
    this.pending.push(firstContact);
    // #3 getting the signaling data from stun server
    firstContact.on('signal',function(data){ 
	self.sub[this.index].offer.push(data)
    });
    // #4 after X seconds, emit the accept message
    setTimeout(function(){
	self.emit("offer", self.sub[firstContact.index]); }, 3000);
    // #5 redirect message from the link
    firstContact.on('message', function(message){
	self.receive(message);
    });
    // #6 after the handshake, send a number of offers to our first neighbour
    firstContact.on('ready', function(){
	console.log("My first contact! :3");
    });
};


Peer.prototype.onContactAccepted = function(uid, counter, offer){
    for (var i = 0; i<offer.length; ++i){
	this.pending[counter-1].signal(offer[i]);
    };
};

/*!
 * \brief generate a number of offers and return the array of pending link
 * \param k the number of offers to generate
 */
Peer.prototype.generateOffers = function(k){
    var self = this;
    var length = this.sub.length;
    for (var i = 0; i<k; ++i){
	var pair = this.track.increment();
	var contact = new SimplePeer({initiator:true});
	contact.index = this.sub.length;
	this.sub.push(new MessageSubscription(pair._e,
					      pair._c,
					      []));
	this.pending.push(contact);
	contact.on('signal', function(data){
	    self.sub[this.index].offer.push(data);
	});
    };
    setTimeout(function(){
	for (var i = length; i<self.sub.length; ++i){
	    self.emit("offer", self.sub[i]);
	};
    }, 3000);
};


/*!
 * \brief redirect the processing of the message to the proper function (e.g.
 * a new subscription message will be redirected to the function onSubscription
 * \param message the received message
 */
Peer.prototype.receive = function(message){
/*    if (message typeof MessageHeartbeat){
	return;
    };
    if (message typeof MessageSubscription){
	return;
    };
    if (message typeof MessageAcceptedSubscription){
	return;
    };*/
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
    if (("uid" in message) && ("counter" in message) &&
	(message.uid != this.track.local.e) &&
	!this.track.isLower({_e:message.uid, _c:message.counter})) {
	// #1 browse the partialView and send the message
	for (var i = 0; i<this.partialView.length; ++i){
	    this.partialView[i].send(message);
	};
    };
};

/*!
 * \brief received a subscription message. This function choose if it keeps
 * the subscription in its partialView or it forwards it.
 * \param uid the unique site identifier which wants to enter in the network
 * \param dataList the informations to contact this peer directly via webRTC
 */
Peer.prototype.onSubscription = function(uid, dataList){
    // #1 forward the subscription to each peer in the partialView + c
    // additionnal copies of the subscription
    // (TODO) deterministically choose the peers + c at random
    var rn = Math.floor(Math.random()*this.partialView.length);
    this.partialView[rn].send(new MessageSubscription(uid, dataList));
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
		    new MessageAcceptedSubscription(pair._e, pair._c,
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
