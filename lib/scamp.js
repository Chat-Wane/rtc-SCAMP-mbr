// #A external modules or nodejs
var EventEmitter = require('events').EventEmitter;
var SimplePeer = require('simple-peer');
var LRU = require('lru-cache');
var util = require("util");
// #B all kind of messages
var MSubscriptionResponse = require('./messages.js').MSubscriptionResponse;
var MSubscriptionRequest = require('./messages.js').MSubscriptionRequest;
var MOfferResponse = require('./messages.js').MOfferResponse;
var MOfferRequest = require('./messages.js').MOfferRequest;
var MWeightUpdate = require('./messages.js').MWeightUpdate;
var MLeaseOver = require('./messages.js').MLeaseOver;
// #C local prototypes
var PendingArray = require('./pendingarray.js');
var LinkFactory = require('./linkfactory.js');
var ViewArray = require('./viewarray.js');
// #D scamp membership handle events
util.inherits(SCAMP, EventEmitter);

/*!
 * \brief Represent a peer within a gossip-based protocol using SCAMP as
 * membership. Internally, it has two views representing the in/out peers.
 * When the peer sends a message, it sends it to all the peers in the
 * partialView. When a message is meant to be broadcast, this peer rebroadcast
 * the message to its partialView.
 * \param uid the unique site identifier of this peer
 * \param options the optional additional configurations
 */
function SCAMP(uid, options){
    EventEmitter.call(this);
    // #0 process the options
    this.c = (options && options.c) || 0;
    this.heartbeat = (options && options.heartbeat) || 30000;
    this.weightUpdate = (options && options.weightUpdate) || 30000;
    this.lease = (options && options.lease) || false;
    this.waitSTUN = (options && options.waitSTUN) || 1500;
    // #1 connection state: "connected", "partial", "disconnect"
    this.state = "disconnect";
    // #2 uid x counter to ensure uniqueness of broadcast messages
    this.uid = uid; this.counter = 0; // for membership protocol
    // #3 neighbourhood partial views for the membership: uid->(link x weight)
    this.partialView = new ViewArray(); 
    this.inView = new ViewArray();
    // #4 webRTC pending messages (TODO) remove from sub
    this.sub = []; this.pending = new PendingArray();
    // #5 backtracking messages using (uid x counter) -> FromChannel
    this.backtrack = LRU(500);
    // #6 update the weights associated with the inView and partialView
    var self = this;
    setInterval(function(){ self.updateWeights(); }, this.weightUpdate);
    // #7 regularly renew the lease, i.e., resubscribe to the network
    if (this.lease){
        setInterval(function(){ self.onLeaseOver(); }, this.lease);
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
 * \brief the default callback function of the first part of the process to
 * enter or authorize the entrance of someone in the network. It emits a
 * "launch" event with a message in parameter
 * \param launchMessage the first message to give to the other peer to 
 * establish a connection
 */
SCAMP.prototype.launchDefaultCallback = function(launchMessage){
    var self = this;
    setTimeout(function(){
        self.emit("launch", launchMessage);
    }, this.waitSTUN);
};

/*!
 * \brief the default callback function of the second part of the process 
 * joining (or authorizing the join) of a network. It emits an event "answer"
 * with the message in parameter
 * \param launchMessage the first message to give to the other peer to 
 * establish a connection
 */
SCAMP.prototype.answerDefaultCallback = function(answerMessage){
    var self = this;
    setTimeout( function(){
        self.emit("answer", answerMessage);
    }, this.waitSTUN);   
};

/*!
 * \brief the first step of joining (or authorizing someone to join) the 
 * network. By default, this function will emit an event containing the message
 * to give to the other peer.
 * \param callback the callback function erasing the default behaviour
 */
SCAMP.prototype.launch = function(callback){
    var pair;
    this.launchCallback = callback || this.launchDefaultCallback;
    // #A this peer is outside a network and wants to join
    if (this.state!=="connect"){
        this.launchCallback(this.generateOffers(1, "launch")[0]);
    };
    // #B authorize the join of another peer to the network already in place
    if (this.state==="connect"){
        pair = this.increment();
        this.answer(new MSubscriptionRequest(pair._e,pair._c,[]));
    };
};

/*!
 * \brief the second step to join (or authorize the join to) the network. 
 * This peer received a request or an invitation an must generate an response.
 * By default, the function will emit an "answer" event with the response 
 * message as parameter.
 * \param message the joining request message or the invitation message
 * \param callback the callback function that erase the default behaviour
 */
SCAMP.prototype.answer = function(message, callback){
    this.answerCallback = callback || this.answerDefaultCallback;
    this.receive(null,new MSubscriptionRequest(message.uid,
                                               message.counter,
                                               message.offer,
                                               2*this.partialView.length()+1));
};

/*!
 * \brief the final step of the joining (or authorizing a peer to join) the 
 * network.
 * \param message the message containing the answer to the second step of the
 * process
 */
SCAMP.prototype.handshake = function(message){
    var self = this, uid = message.uid, counter = message.destCounter,
        offer = message.offer,
        link = this.pending.get(
            this.pending.indexOfLinkWithCounter(counter)).link;
    // #1 when the link is ready to send message, update the local views
    link.on("ready", function(){
        // (TODO) incorrect when starting network, i.e., 1 join 1
        if (self.state!=="connect"){ self.partialView.add(uid,this); };
        if (self.state==="connect"){ self.inView.add(uid,this); };
        self.pending.del(self.pending.indexOfLinkWithCounter(this.counter));
        self.checkConnectionState();
    });
    // #2 signal the offer contained in the message
    for (var i = 0; i<offer.length; ++i){ link.signal(offer[i]); };
};

/*!
 * \brief generate a number of offers and return the array of pending link
 * \param k the number of offers to generate
 * \param type the type of requested link
 * \param destUid the unique site identifier of the requesting or answering
 * peer (default to null);
 * \param destCounter the counter of the remote peer when it created the 
 * message that eventually called this function (default to null);
 * \return an array containing the k messages of the requested type
 */
SCAMP.prototype.generateOffers = function(k, type, destUid, destCounter){
    var pair, link, msg,
        tDestUid = destUid || null,
        tDestCounter = destCounter || null,
        result = [];
    // #1 create as much offers as required
    for (var i = 0; i<k; ++i){
        pair = this.increment();
        link = LinkFactory.get.call(this, type, pair._c);
        switch(type){
        case "launch":
            msg = new MSubscriptionRequest(pair._e, pair._c, []); break;
        case "answer":
            msg = new MSubscriptionResponse(pair._e, pair._c,
                                            tDestUid, tDestCounter, []); break;
        case "subscription":
            msg = new MSubscriptionRequest(pair._e, pair._c, []); break;
        case "response":
            msg = new MSubscriptionResponse(pair._e, pair._c,
                                            tDestUid, tDestCounter, []); break;
        };
        this.pending.add(tDestUid, link);
        this.sub[pair._c] = msg;
        result.push(this.sub[pair._c]);
    };
    return result;
};

/*!
 * \brief decide if 'this' peer should be the first contact within the network.
 * \param uid the unique site identifier of the peer that subscribed
 * \param counter the counter of the site when it subscribed
 * \param offer the piece of data required to establish a connection
 * \param hop the number of hop required for the indirection mechanism
 */ 
SCAMP.prototype.onForwardedContact = function(uid, counter, offer, hop){
    if (hop > 1 || (uid===this.uid && hop===1 && this.partialView.length()>0)){
        // #A within the indirection mechanism
        // #1 normalize the weights
        this.partialView.normalizeWeights();
        // #2 forward the subscription to a peer
        this.forwardContact(uid, counter, offer, hop)
    };
    if (hop===1 && uid!==this.uid) {
        // #B 'this' peer becomes the first contact of the subscriber
        this.keepContact(uid, counter, offer);
    };
};

/*!
 * \brief forward the contact request to a neighbour peer according to the
 * processed weights (i.e. indirection mechanism).
 * \param uid the unique site identifier of the origin of the request
 * \param counter the local counter of the origin site when it requested
 * \param offer the offer to answer
 * \param hop the number of hop before the message stop to forward
 */
SCAMP.prototype.forwardContact = function(uid, counter, offer, hop){
    var rn = Math.random(), cumulativeProbability = 0, i = 0,
        fwdhop = Math.max(hop - 1, 1);
    while ((cumulativeProbability + this.partialView.get(i).weight)<rn){
        cumulativeProbability += this.partialView.get(i).weight;
        ++i;
    };
    this.send(new MSubscriptionRequest(uid,counter,offer,fwdhop),
              this.partialView.get(i).link);
};

/*!
 * \brief 'this' peer accept to be contacted either to join the network or
 * to authorize someone to join the network.
 * \param uid the unique site identifier of the origin peer
 * \param counter the local counter of the origin peer when it requested
 * \param offer the offer to answer. Null means that this peer is already
 * in the network and must authorize someone outside.
 */
SCAMP.prototype.keepContact = function(uid, counter, offer){
    var self = this, offerContact, pair, link; 
    if (offer.length===0) {
        offerContact = this.generateOffers(1, "launch")[0];
    } else {
        offerContact = this.generateOffers(1, "answer", uid, counter)[0];
    };
    // #1 if the offer is not empty, it will signal
    link = this.pending.get(
        this.pending.indexOfLinkWithCounter(offerContact.counter)).link
    for (var i=0; i<offer.length; ++i){ link.signal(offer[i]); };
    // #2 when ready, add the link to inview
    link.on("ready", function(){
        console.log("Send me "+(self.partialView.length()+1)+" offers.");
        pair = self.increment();
        self.inView.add(uid,this);    
        self.pending.delObject(uid);
        link.send(new MOfferRequest(pair._e, pair._c,
                                    self.partialView.length()+self.c));
        self.checkConnectionState();
    });
    // #3 after a while, the message containing the offer back or callback
    pair = JSON.stringify({_e:uid, _c:counter});
    if (this.backtrack.has(pair) && this.backtrack.get(pair)===null){
        this.answerCallback(self.sub[offerContact.counter]);
    } else {
        setTimeout(
            function(){ self.send(self.sub[offerContact.counter]); },
            this.waitSTUN);
    };
};

/*!
 * \brief function which is regularly called to update the weight of the
 * inView and partialView and send the update to the corresponding neighbours
 */
SCAMP.prototype.updateWeights = function(){
    var inViewChanges, partialViewChanges, entry;
    // #1 update the weights of the local views
    inViewChanges = this.inView.normalizeWeights();
    partialViewChanges = this.partialView.normalizeWeights();
    for (var i=0; i<inViewChanges.length;++i){
        entry = this.inView.get(inViewChanges[i]);
        this.send(new MWeightUpdate(this.uid, true, entry.weight), entry.link);
    };
    for (var i=0; i<partialViewChanges.length;++i){
        entry = this.partialView.get(partialViewChanges[i]);
        this.send(new MWeightUpdate(this.uid, false, entry.weight),entry.link);
    };    
};

/*!
 * \brief call a specific function when the network is connected
 * \param callback the callback function to call when the network is ready
 * to send and receive messages
 */
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
    var pair;
    if (link !== undefined){
        link.send(message);
    } else {
        if (message.category === "response"){
            pair = JSON.stringify({_e:message.destUid,_c:message.destCounter});
            if (this.backtrack.has(pair)){
                if (this.backtrack.get(pair)!==null){
                    this.backtrack.get(pair).send(message);                    
                } else {
                    this.answerCallback(message);
                };
            };
        };
    };
};

/*!
 * \brief redirect the processing of the message to the proper function (e.g.
 * a new subscription message will be redirected to the function onSubscription
 * \param link the WebRTC that receive the message
 * \param message the received message
 */
SCAMP.prototype.receive = function(link, message){
    var self = this, offers, pair;
    // #1 the message is a request whose response will be backtracked
    if (message.category === "request"){
        pair = JSON.stringify({_e:message.uid, _c:message.counter});
        if (!this.backtrack.has(pair)){ this.backtrack.set(pair,link); };
    };
    // #2 handle each kind of messages
    switch(message.type){
    case "MLeaseOver":
        console.log("received "+ message.type +"; from = "+ message.uid);
        pair = this.increment();
        this.send(new MOfferRequest(pair._e,pair._c,
                                    this.partialView.length()), link);
        break;
    case "MOfferResponse":
        console.log("received "+message.type+ "; k = "+message.offers.length);
        for (var i = 0; i<message.offers.length; ++i){
            pair = JSON.stringify({_e:message.offers[i].uid,
                                   _c:message.offers[i].counter});
            if (!this.backtrack.has(pair)){ this.backtrack.set(pair,link); };
        };
        this.dispatchSubscriptions(message.offers);
        break;
    case "MOfferRequest":
        console.log("received "+message.type+"; k = "+Math.max(1,message.k));
        offers = this.generateOffers(Math.max(1,message.k),
                                     "subscription",
                                     message.uid, message.counter);
        setTimeout(function(){
            self.send(new MOfferResponse(self.uid,
                                         message.uid, message.counter,
                                         offers));}, this.waitSTUN);
        break;
    case "MWeightUpdate":
        console.log("received "+message.type+"; uid = "+message.uid);
        if (message.isFromInView){
            this.partialView.updateWeightObject(message.uid, message.weight);
        } else {
            this.inView.updateWeightObject(message.uid, message.weight);
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
    case "MSubscriptionResponse":
        console.log("received "+message.type);
        if (message.destUid === this.uid){
            originLink = this.pending.get(
                this.pending.indexOfLinkWithCounter(message.destCounter)).link;
            originLink.on("ready", function(){
                self.inView.add(message.uid, this);
                self.pending.del(
                    self.pending.indexOfLinkWithCounter(message.destCounter));
                self.checkConnectionState();
            });
            for (var i = 0; i<message.offer.length; ++i){
                originLink.signal(message.offer[i]);
            };
        } else {
            this.send(message);
        };
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
    var k = k || this.partialView.length(), result = [], rn, found, i;
    while (result.length < Math.min(k, this.partialView.length()) ){
        rn = Math.floor(Math.random()*this.partialView.length());
        found = false;
        i = 0;
        while(i<result.length && !found){
            if (this.partialView.get(rn).uid === result[i].uid){
                found = true;
            } else {
                ++i;
            };
        };
        if (!found){ result.push(this.partialView.get(rn).link); };
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
        // for (var i = 0; i<this.partialView.length(); ++i){
        //     this.send(offers[i], this.partialView.get(i).link);
        // };
        // #2 forward the c additionnal copies to random peers in partialView
        // for (var j = i; j<this.partialView.length()+offers.length; ++j){
        //     var rn = Math.floor(Math.random()*this.partialView.length());
        //     this.send(offers[j], this.partialView.get(rn).link);
        // };
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
    var self = this, offerBack, link, rn;
    if (hop >= 1) { return; };
    // #1 check if we add the subscription to our partialView
    if ((!(uid == this.uid)) && // not our own subscription request
        (!(this.partialView.contains(uid))) && // not already known and active
        (!(this.pending.contains(uid))) && // not in our pending offers
        Math.random() <= (1/(1+this.partialView.length()))){ // random ok
        // #2a create the new link, add it to pending
        offerBack = this.generateOffers(1, "response",
                                        uid, counter)[0];
        link = this.pending.getObject(uid).link;
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
        }, this.waitSTUN);
    } else {
        // #3 otherwise, forward the message to a random peer in partial view
        rn = Math.floor(Math.random()*this.partialView.length());
        self.send(new MSubscriptionRequest(uid,counter,offer),
                  this.partialView.get(rn).link);
    };
};

/*!
 * \brief verify if the connection state changed. On change, it emit an event
 * "statechange" with the associated state in parameter
 */
SCAMP.prototype.checkConnectionState = function(){
    var newState = "disconnect";
    // #1 process the new state
    if ((this.partialView.length()>0) && this.inView.length()>0){
        newState = "connect";
    };
    if ((newState!=="connect") &&
        (this.partialView.length()>0 || (this.inView.length()>0))){
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
