/*!
 * MessageAcceptedSubscription(uid,counter,destUid,destCounter,offer)
 * MessageSubscription(uid,counter,offer)
 * MessageOfferRequest(uid,destUid,k)
 * MessageOfferResponse(uid,destUid,offers)
 * MessageHeartbeat(uid)
 */



/*!
 * \brief object that represents an accepted subscription message containing
 * the destination and the offer
 * \param uid the unique site identifier of the peer which accepts the offer
 * \param coutner the local counter of the site that emitted the accept
 * \param destUid the unique site identifier of the peer that wanted to sub
 * \param destCounter the local counter of the peer when it wanted to sub
 * \param offer the required webRTC data necessary to establish the p2p link
 */

function MessageAcceptedSubscription(uid,counter, destUid, destCounter, offer){
    this.type = "MessageAcceptedSubscription";
    this.uid = uid;
    this.counter = counter;
    this.destUid = destUid;
    this.destCounter = destCounter;
    this.offer = offer;
};

module.exports.MessageAcceptedSubscription = MessageAcceptedSubscription;

/*!
 * \brief object which represents a subscription message from a peer to the
 * network
 * \param uid the unique identifier of the peer that created the message
 * \param counter the local counter of the sender peer to ensure uniqueness
 * \param offer the webrtc data required to open the connection. These data
 * are the output of the Stun server.
 */
function MessageSubscription(uid, counter, offer){
    this.type = "MessageSubscription";
    this.uid = uid;
    this.counter = counter;
    this.offer = offer;
};

module.exports.MessageSubscription = MessageSubscription;

/*!
 * \brief object representing a message that request a number of offers in
 * order to contact the receiving peer
 * \param uid the unique site identifier that request the offers
 * \param destUid the unique site identifier that must provides these offers
 * \param k the number of offers to provide
 */
function MessageOfferRequest(uid, destUid, k){
    this.type = "MessageOfferRequest";
    this.uid = uid;
    this.destUid = destUid;
    this.k = k;
};

module.exports.MessageOfferRequest = MessageOfferRequest;

/*!
 * \brief object that represents a response message to an offer request. It
 * contains the k offers
 * \param uid the unique site identifier that provide the offers
 * \param destUid the unique site identifier that requested the offers
 * \param offers the list of offers provided
 */
function MessageOfferResponse(uid, destUid, offers){
    this.type = "MessageOfferResponse";
    this.uid = uid;
    this.destUid = destUid;
    this.offers = offers;
};

module.exports.MessageOfferResponse = MessageOfferResponse;

/*!
 * \brief object that represent an heartbeat message which only notify the
 * receiving peer that the sender is still alive. Thus, the receiving peer
 * does not remove it from the its inView.
 * \param uid the unique site identifier of the sender
 */
function MessageHeartbeat(uid){
    this.type = "MessageHeartbeat";
    this.uid = uid;
};

module.exports.MessageHeartbeat = MessageHeartbeat;
