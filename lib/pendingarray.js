var ViewEntry = require('./viewentry.js');

/*!
 * \brief pending array contains the link waiting for the handshake
 */
function PendingArray(){
    this.array = [];
};

PendingArray.prototype.length = function(){
    return this.array.length;
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
    this.array.splice(index,1);
};

/*!
 * \brief remove the link associated with the unique site identifier in 
 * argument
 * \brief uid the unique identifier of the site at the other side of the link
 * to remove
 */
PendingArray.prototype.delObject = function(uid){    
    var index = this.indexOf(uid);
    this.del(index);
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
    var i = 0;
    var found = false;
    while (i < this.array.length && !found){
	if ((this.array[i].uid !== null) && (this.array[i].uid == uid)){
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
    return this.array[index];
};

/*!
 * \brief get the ViewEntry with uid in argument
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
    // (TODO) binary search
    var found = false;
    var i = 0;
    while (!found && i<this.array.length){
	if (this.array[i].link.counter == counter){
	    found = true;
	} else {
	    ++i;
	};
    };
    if (!found){ i = -1;};
    return i;
};


module.exports = PendingArray;
