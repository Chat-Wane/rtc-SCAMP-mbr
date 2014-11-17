var EventEmitter = require('events').EventEmitter;
var SimplePeer = require('simple-peer');
var Track = require('causaltrack').IVV;
var util = require('util');

var SubscriptionMessage = require('./subscriptionmessage.js');
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

    // #2 neighbourhood partial views for the membership
    this.partialView = []; // (TODO) uid -> link
    this.inView = []; // (TODO) uid -> link

    // #3 webRTC pending offers
    this.offers = [];

    // #4 heartbeat messages are sent regularly to update inView
    var self = this;
    setInterval(function(){
	if (this.partialView.length>0){
	    self.broadcast(new HeartbeatMessage(this.track.local.e));
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
Peer.prototype.on('contact', function(data){
    var firstContact = new SimplePeer();
    var self = this;
    firstContact.signal(data);
    firstContact.on('signal',function(data){
	console.log(data); // (TODO) define a proper output system
    });

    firstContact.on('ready', function(){
	// #1 add the initial contact to the partial view
	self.partialView.push(firstContact);
	// #2 send a subscription request as a list of simple peers waiting
	// for an answer
	for (var i = 0; i < Conf.partialViewSize + Conf.c; ++i){
	    self.contacts[self.contacts.length] = [];
	    // #2a create the new offers to distribute in the network
	    var contact = new SimplePeer({intiator:true});
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
	    contact.on("ready", function(){
		self.inView.push(this);
	    });
	};
    });
});

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
    contact.on("signal", function(data){
	self.offers[this.index].push(data);
	console.log(JSON.stringify(data)); // (TODO) proper output
    });
};

/*!
 * \brief sends a message to all the peers in the neighbourhood. From one
 * neighbour to another, the message reaches all participants in the network 
 * with a high probability. (Note: Heartbeat messages are not forwarded)
 * \param message the message to broadcast
 */
Peer.prototype.broadcast = function(message){
    // (TODO) change for a more reliable way to crawl the array
    // i.e., if a peer link dies, this function may crash
    // #0 verify if the message has already been seen (TODO)
    
    // #1 browse the partialView and send the message
    for (var i = 0; i<this.partialView.length; ++i){
	this.partialView[i].send(message);
    };
};

/*!
 * \brief received a subscription message. This function choose if it keeps
 * the subscription in its partialView or it forwards it.
 * \param uid the unique site identifier which wants to enter in the network
 * \param dataList the informations to contact this peer directly via webRTC
 */
Peer.prototype.on('subscription', function(uid, dataList){
    // #1 forward the subscription to each peer in the partialView + c
    // additionnal copies of the subscription
    // (TODO) deterministically choose the peers + c at random
    var rn = Math.floor(Math.random()*this.partialView.length);
    this.partialView[rn].send(new SubscriptionMessage(uid, dataList));
});
