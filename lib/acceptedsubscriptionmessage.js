
/*!
 * \brief object that represents an accepted subscription message containing
 * the destination and the offer
 * \param uid the unique site identifier of the peer which accepts the offer
 * \param coutner the local counter of the site that emitted the accept
 * \param dest the unique site identifier of the peer that wanted to sub
 * \param dataList the required webRTC data necessary to establish the p2p link
 */

function AcceptedSubscriptionMessage(uid, counter, dest, dataList){
    this.uid = uid;
    this.dest = dest;
    this.dataList = dataList;
};

module.exports = AcceptedSubscriptionMessage;
