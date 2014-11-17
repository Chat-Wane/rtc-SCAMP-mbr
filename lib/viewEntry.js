
/*!
 * \brief object which represents an entry in the partial view of the peers.
 * The partial view is totally ordered using the unique identifier of each
 * site.
 * \param uid the unique site identifier of the remote peer 
 * \param link the webrtc connection between this peer and the remote peer
 */
function ViewEntry(uid, link){
    this.uid = uid;
    this.link = link;
};

/*!
 * \brief comparison function between two entry or an uid. It allows searching
 * or ordering the arrays
 * \param o either a ViewEntry to insert somewhere or a uid to search
 */
ViewEntry.prototype.compare(o){
    var uid = null;
    if (o instanceof ViewEntry){ uid = o.uid; } else { uid = o; };
    if (this.uid < uid){ return -1; };
    if (this.uid > uid){ return 1; };
    return 0;
};

module.exports = ViewEntry;
