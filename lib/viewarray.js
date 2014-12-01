
var ViewEntry = require("./viewentry.js");
require("./util.js");

/*!
 * \brief Ordered array which contains the unique site identifier, the link
 * and the weight.
 */
function ViewArray(){
    this.array = [];
};

/*!
 * \brief getter of the size of the array
 * \return an integer which is the size of the array
 */
ViewArray.prototype.length = function(){
    return this.array.length;
}

/*!
 * \brief add the link into the array using the uid.
 * \param uid the unique site identifier at the other side of the link
 * \param link the link between the site with 'this' array and the remote site
 */
ViewArray.prototype.add = function(uid, link){
    var sumWeight = 0;
    for (var i = 0; i<this.array.length; ++i){
	sumWeight += this.array[i].weight
    };
    var weight = 1;
    if (this.array.length != 0){ weight = sumWeight/this.array.length;};
    var viewEntry = new ViewEntry(uid,link,weight);
    var position = this.array.binaryIndexOf(viewEntry);
    this.array.splice(-position,0,viewEntry);
};

/*!
 * \brief remove the link at index and close the connection
 * \param index the index of the object to remove
 */
ViewArray.prototype.del = function(index){
    this.array[index].link.destroy(true);
    this.array.splice(index,1);
};

/*!
 * \brief remove the entry with the unique site identifier of the remote site
 * and close the connection.
 * \param uid the unique site identifier of the distant peer
 */
ViewArray.prototype.delObject = function(uid){
    var position = this.array.binaryIndexOf(uid);
    this.del(position);
};

/*!
 * \brief checks if the array contains a link with a distant peer with the
 * unique site identifier
 * \param uid the unique site identifier of the distant peer
 */
ViewArray.prototype.contains = function(uid){
    var position = this.array.binaryIndexOf(uid);
    return ((position>0) ||
	    ((position==0)&&(this.array.length>0)&&(this.array[0].uid==uid)));
};

/*!
 * \brief return the ViewEntry in the array at the specified index.
 * \param index the index of the ViewEntry to return
 * \return a ViewEntry containing uid, link, weight
 */
ViewArray.prototype.get = function(index){
    return this.array[index];
};

/*!
 * \brief return the ViewEntry in the array containing the specified unique 
 * site identifier.
 * \param uid the unique site identifier of the distant peer
 * \return a ViewEntry containing uid, link, weight
 */
ViewArray.prototype.getObject = function(uid){
    var position = this.array.binaryIndexOf(uid);
    return this.array[-position];
};

module.exports = ViewArray;
