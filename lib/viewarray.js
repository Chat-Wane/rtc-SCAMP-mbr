var ViewEntry = require("./viewentry.js");

/*!
 * \brief Ordered array which contains the unique site identifier, the link
 * and the weight.
 */
function ViewArray(){
    this.array = [];
};

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
 * \brief remove the entry with the unique site identifier of the remote site
 * \param uid the unique site identifier of the distant peer
 */
ViewArray.prototype.remove = function(uid){
    var position = this.array.binaryIndexOf(uid);
    this.array.splice(position,1);
};

/*!
 * \brief checks if the array contains a link with a distant peer with the
 * unique site identifier
 * \param uid the unique site identifier of the distant peer
 */
ViewArray.prototype.contains = function(uid){
    var position = this.array.binaryIndexOf(uid);
    return ((position>0) || ((position==0)&&this.array.length>0));
};

/*!
 * \brief return the ViewEntry in the array at the specified index.
 * \param index the index of the ViewEntry to return
 * \return a ViewEntry containing uid, link, weight
 */
ViewArray.prototype.get = function(index){
    return this.array[i];
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
