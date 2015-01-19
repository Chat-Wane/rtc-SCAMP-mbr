var SortedArray = require("sorted-cmp-array");

/*!
 * \brief object which represents an entry in the partial view of the peers.
 * The partial view is totally ordered using the unique identifier of each
 * site.
 * \param uid the unique site identifier of the remote peer
 * \param link the webrtc connection between this peer and the remote peer
 * \param weight the arc weight to set the indirection mechanism
 */
function ViewEntry(uid, link, weight){
    this.uid = uid;
    this.link = link;
    this.weight = weight;
};

/*!
 * \brief pending array contains the link waiting for the handshake
 */
function PendingArray(){
    this.array = new SortedArray(
        function(a,b){
            if (a.link.counter<b.link.counter){return -1};
            if (a.link.counter>b.link.counter){return  1};
            return 0;});
};

PendingArray.prototype.length = function(){
    return this.array.arr.length;
};

/*!
 * \brief add a link to the structure with a unique site identifier which 
 * represent the uid of the site at the other side of the link. Nevertheless,
 * and contrarily to the view arrays, this can be null if the peer holding the
 * pending array is initiating the handshake (hence, it does not know which
 * peer will accept it).
 * \param uid the unique identifier of the site at the other side of the link
 * \param link the link which connects two peers
 */
PendingArray.prototype.add = function(uid, link){
    this.array.push(new ViewEntry(uid,link,0));
};

/*!
 * \brief exactly the same as the one of view array except that it does not
 * kill the link between the peer when it removes it from the array
 * \param index the index of the link to remove from the pending list
 */
PendingArray.prototype.del = function(index){
    this.array.arr.splice(index,1);
};

/*!
 * \brief remove the link associated with the unique site identifier in 
 * argument
 * \brief uid the unique identifier of the site at the other side of the link
 * to remove
 */
PendingArray.prototype.delObject = function(uid){    
    this.del(this.indexOf(uid));
};

/*!
 * \brief check in the array if the link associated with the uid in argument
 * does exist.
 * \param uid the unique site identifier
 * \return true if the array contains a link with the uid, false otherwise
 */
PendingArray.prototype.contains = function(uid){
    return (this.indexOf(uid) !== -1);
};

/*!
 * \brief search within the array for the unique site identifier in argument.
 * \param uid the unique site identifier to search
 * \return the index of the object in the array if found, -1 otherwise.
 */
PendingArray.prototype.indexOf = function(uid){
    var i = 0, found = false;
    while (i < this.array.arr.length && !found){
        if ((this.get(i).uid !== null)&&(this.get(i).uid === uid)){
            found = true;
        } else {
            ++i
        };
    };
    if (!found){ i = -1; };
    return i;
};

/*!
 * \brief get the ViewEntry in the array at the specified index.
 * \param index the index of the ViewEntry to return
 * \return a ViewEntry containing uid, link, weight
 */
PendingArray.prototype.get = function(index){
    return this.array.arr[index];
};

/*!
 * \brief get the ViewEntry with uid in argument
 * \param uid the unique site identifier of the entry to retrieve
 */
PendingArray.prototype.getObject = function(uid){
    return this.get(this.indexOf(uid));
};

/*!
 * \brief get the index of the viewEntry in the array with the link 
 * containing the counter in argument (this counter is locally monotonically
 * increasing and therefore unique).
 * \param counter the counter to search
 * \return the index of the link in the array, -1 if not found
 */
PendingArray.prototype.indexOfLinkWithCounter = function(counter){
    return this.array.indexOf(counter);
};


module.exports = PendingArray;
