var EventEmitter = require('events').EventEmitter;
var SimplePeer = require('simple-peer');
var Track = require('causaltrack').IVV;
var util = require('util');
require('./util.js');

var SubscriptionMessage = require('./subscriptionmessage.js');
var AcceptedSubscriptionMessage = require('./acceptedsubscriptionmessage.js');
var HeartbeatMessage = require('./heartbeatmessage.js');
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

    // #3 webRTC pending offers (TODO) remove them when no pending anymore
    this.offers = [];

    // #4 heartbeat messages are sent regularly to update inView
    var self = this;
    setInterval(function(){
	if (this.partialView.length>0){
	    self.broadcast(new HeartbeatMessage(uid));
	}}, Conf.heartbeat);
};

/*! 
 * \brief first function that will initialize the network. The peer "this", is
 * outside of the gossip network. One of the peer inside gives him an offer to
 * enter inside. The outside peer create an offer back to establish the
 * connection.
 * \param data the data that represents the offer, i.e., the output of the stun
 * webrtc server
 * \return a same piece of data that the peer must route himself manually
 * afterward (e.g. mail, websocket...)
 */
Peer.prototype.onContact = function(uid, data){
    var self = this;
    
    var firstContact = new SimplePeer();
    firstContact.signal(data);
    firstContact.on('signal',function(data){
	console.log(this.track.local.e);
	console.log(data); // (TODO) define a proper output system
    });

    firstContact.on('message', function(message){
	self.receive(message);
    });
    
    firstContact.on('ready', function(){
	// #1 add the initial contact to the partial view
	var position = self.partialView.binaryIndexOf(uid);
	self.partialView.splice(-position,0,new ViewEntry(uid, firstContact));
	// #2 send a subscription request as a list of simple peers waiting
	// for an answer
	for (var i = 0; i < Conf.partialViewSize + Conf.c; ++i){
	    self.contacts[self.contacts.length] = [];
	    // #2a create the new offers to distribute in the network
	    var contact = new SimplePeer({initiator:true});
	    contact.index = self.offers.length; // (TODO) change for monotonic
	    contact.on("signal", function(data){
		self.contacts[this.index].push(data); 
	    });
	    // #2b send each offers one by one
	    // (TODO) change to triggers send when data udp chan found + sdp
	    setTimeout(function(j){
		var pair = self.track.increment();
		firstContact.send(new SubscriptionMessage(pair._e,
							  pair._c,
							  self.contacts[j]));
	    }, 3000*(i+1), i);
	    // #2c on acceptance, put the contact in the inview
	    contact.on("message", function(message){		
		if ("uid" in message){
		    var position = self.inView.binaryIndexOf(message.uid);
		    if (position<0 || (position==0 && self.inView.length==0)){
			var viewEntry = new ViewEntry(message.uid, this);
			self.inView.push(position, 0, viewEntry);
		    };
		};
		self.receive(message);
	    });
	};
    });
};

/*!
 * \brief generate the necessary data to build a peer-to-peer link. The piece
 * of data is shared through any protocol and triggers the event "contact" of 
 * the remote peer
 */
Peer.prototype.offer = function(){
    var self = this;
    
    var contact = new SimplePeer({initiator:true});
    this.offers[this.offers.length] = [];
    contact.index = this.offers.length; // (TODO) change for monotonic counter
    // #1 request the necessary data to create the link between the two peers
    contact.on("signal", function(data){
	self.offers[this.index].push(data);
	console.log(JSON.stringify(data)); // (TODO) proper output
    });
};


/*!
 * \brief redirect the processing of the message to the proper function (e.g.
 * a new subscription message will be redirected to the function onSubscription
 * \param message the received message
 */
Peer.prototype.receive = function(message){
    if (message typeof HeartbeatMessage){
	return;
    };
    if (message typeof SubscriptionMessage){
	return;
    };
    if (message typeof AcceptedSubscriptionMessage){
	return;
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
    this.partialView[rn].send(new SubscriptionMessage(uid, dataList));
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
		    new AcceptedSubscriptionMessage(pair._e, pair._c,
						    uid,
						    self.offers[i]));
	    }, 3000, contact.index);
	    
	    contact.on("ready", function(data){
		// (TODO) verify if it does not already exist
		var position = self.inView.binaryIndexOf(uid);
		var viewEntry = new ViewEntry(uid, this);
		self.inView.splice(position,0,viewEntry);
	    };
	};
    };
};


module.exports = Peer;
