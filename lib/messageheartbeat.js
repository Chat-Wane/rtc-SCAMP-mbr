
/*! 
 * \brief object that represent an heartbeat message which only notify the
 * receiving peer that the sender is still alive. Thus, the receiving peer
 * does not remove it from the its inView.
 * \param uid the unique site identifier of the sender
 */
function MessageHeartbeat(uid){
    this.uid = uid;
};

module.exports = MessageHeartbeat;
