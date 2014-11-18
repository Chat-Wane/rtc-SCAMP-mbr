
/*!
 * \brief object which represents a subscription message from a peer to the
 * network
 * \param uid the unique identifier of the peer that created the message
 * \param counter the local counter of the sender peer to ensure uniqueness
 * \param offer the webrtc data required to open the connection. These data
 * are the output of the Stun server.
 */
function MessageSubscription(uid, counter, offer){
    this.uid = uid;
    this.counter = counter;
    this.offer = offer;
};

module.exports = MessageSubscription;
