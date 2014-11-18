var EventEmitter = require('events').EventEmitter;
var SimplePeer = require('simple-peer');
var Track = require('causaltrack').IVV;
var util = require('util');
require('./util.js');

var MessageAcceptedSubscription=
    require('./messages.js').MessageAcceptedSubscription;
var MessageOfferResponse = require('./messages.js').MessageOfferResponse;
var MessageOfferRequest = require('./messages.js').MessageOfferRequest;
var MessageSubscription = require('./messages.js').MessageSubscription;
var MessageHeartbeat = require('./messages.js').MessageHeartbeat;

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
 * \brief generate a number of offers and return the array of pending link
 * \param k the number of offers to generate
 */
Peer.prototype.generateOffers = function(k){
    var self = this;
    var length = this.sub.length;
    for (var i = 0; i<k; ++i){
	var pair = this.track.increment();
	var link = new SimplePeer({initiator:true});
	link.index = this.sub.length;
	this.sub.push(new MessageSubscription(pair._e,
					      pair._c,
					      []));
	this.pending.push(link);
	this.setLink(link);
    };
    
    setTimeout(function(){
	for (var i = length; i<self.sub.length; ++i){
	    self.emit("offer", self.sub[i]);
	};
    }, 3000);
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
    this.sub.push(new MessageAcceptedSubscription(pair._e,
						  pair._c,
						  uid,
						  counter,
						  []));
    this.pending.push(firstLink);
    this.setLink(firstLink);
    // #3 preparing the link to send some offer into the network
    firstLink.on("message", function(message){
	if (message.type == "MessageOfferRequest"){
	    if (message.destUid == self.track.local.e){
		console.log("Ok friend! Here are the " + message.k +
			    "requested offers! :3");
	    };
	};
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
	console.log("Send me " + self.partialView.length + " offers, friend.");
	self.pending[position].send(
	    new MessageOfferRequest(self.track.local.e,
				    uid,
				    self.partialView.length));
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
	self.receive(message);
    });
}

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
