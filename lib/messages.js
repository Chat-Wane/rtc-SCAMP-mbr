/*!
 * MSubscriptionRequest(uid, counter, offer, initiator, hop)
 * MSubscriptionResponse(uid, counter, destUid, destCounter, offer)
 * MOfferRequest(uid, counter, k)
 * MOfferResponse(uid, destUid, destCounter, offers)
 * MWeightUpdate(uid, isFromInView, weight)
 * MLeaseOver(uid, counter)
 */

/*!
 * \brief object which represents a subscription message from a peer to the
 * network
 * \param uid the unique identifier of the peer that created the message
 * \param counter the local counter of the sender peer to ensure uniqueness
 * \param offer the webrtc data required to open the connection. These data
 * are the output of the Stun server. If null, it request an initiator 
 * \param hop the number of hop the message must travel before being considered
 * as a "contact" subscription message. When hop is negative, the message is a
 * normal subscription request message (default).
 */
function MSubscriptionRequest(uid, counter, offer, hop){
    this.type = "MSubscriptionRequest";
    this.category = "request";
    this.uid = uid;
    this.counter = counter;
    this.offer = offer || null;
    this.hop = hop || 0;

};

module.exports.MSubscriptionRequest = MSubscriptionRequest;

/*!
 * \brief object that represents an accepted subscription message containing
 * the destination and the offer
 * \param uid the unique site identifier of the peer which accepts the offer
 * \param coutner the local counter of the site that emitted the accept
 * \param destUid the unique site identifier of the peer that wanted to sub
 * \param destCounter the local counter of the peer when it wanted to sub
 * \param offer the required webRTC data necessary to establish the p2p link
 */

function MSubscriptionResponse(uid,counter,destUid,destCounter,offer){
    this.type = "MSubscriptionResponse";
    this.category = "response";
    this.uid = uid;
    this.counter = counter;
    this.destUid = destUid;
    this.destCounter = destCounter;
    this.offer = offer;
};

module.exports.MSubscriptionResponse = MSubscriptionResponse;

/*!
 * \brief object representing a message that request a number of offers in
 * order to contact the receiving peer
 * \param uid the unique site identifier that request the offers
 * \param counter the local counter of the site when it made the request
 * \param k the number of offers to provide
 */
function MOfferRequest(uid, counter, k){
    this.type = "MOfferRequest";
    this.category = "request";
    this.uid = uid;
    this.counter = counter;
    this.k = k;
};

module.exports.MOfferRequest = MOfferRequest;

/*!
 * \brief object that represents a response message to an offer request. It
 * contains the k offers
 * \param uid the unique site identifier that provide the offers
 * \param destUid the unique site identifier that requested the offers
 * \param destCounter the counter of the site when he made the request
 * \param offers the list of offers provided
 */
function MOfferResponse(uid, destUid, destCounter, offers){
    this.type = "MOfferResponse";
    this.category = "response";
    this.uid = uid;
    this.destUid = destUid;
    this.destCounter = destCounter;
    this.offers = offers;
};

module.exports.MOfferResponse = MOfferResponse;

/*!
 * \brief object that represent a message aiming to update the weight of the
 * send relatively to the receiver. These weights are useful for the
 * indirection mechanism.
 * \param uid the unique site identifier of the send of the message
 * \param isFromInView the flag that determine if the weight comes from an
 * update of the inView or the partialView
 * \param weigth the weight processed by the send of the message
 */
function MWeightUpdate(uid, isFromInView, weight){
    this.type = "MWeightUpdate";
    this.category = "none";
    this.uid = uid;
    this.isFromInView = isFromInView;
    this.weight = weight;
};

module.exports.MWeightUpdate = MWeightUpdate;


/*!
 * \brief object that represents a message indicating that the emitter's lease
 * is over and must be renewed.
 * \param uid the unique site identifier that created the message
 * \param counter the local counter of the site when it created the message
 */
function MLeaseOver(uid, counter){
    this.type = "MLeaseOver";
    this.category = "request";
    this.uid = uid;
    this.counter = counter;
};

module.exports.MLeaseOver = MLeaseOver;
