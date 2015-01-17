var ViewEntry = require("./viewentry.js");
require("./util.js");

/*!
 * \brief Ordered array which contains the unique site identifier, the link
 * and the weight.
 */
function ViewArray(){
    this.array = [];
    this.totalWeight = 0;
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
    var viewEntry, position, weight = 1;
    if (this.array.length!==0){ weight = this.totalWeight/this.array.length; };
    viewEntry = new ViewEntry(uid,link,weight);
    position = this.array.binaryIndexOf(viewEntry);
    this.array.splice(-position,0,viewEntry);
    this.totalWeight += weight;
};

/*!
 * \brief remove the link at index and close the connection
 * \param index the index of the object to remove
 */
ViewArray.prototype.del = function(index){
    this.totalWeight -= this.array[index].weight
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

/*!
 * \brief update the weight of the entry at the given index
 * \param index the index to update
 * \param weight the weight value to set
 * \return true if the value has changed, false otherwise
 */
ViewArray.prototype.updateWeight = function(index, weight){
    var isUpdated = (weight !== this.get(index).weight);
    if (isUpdated){
        this.totalWeight = this.totalWeight - this.get(index).weight + weight;
        this.get(index).weight = weight;
    };
    return isUpdated;
};

/*!
 * \brief update the weight of the link with the given uid
 * \param uid the uid of the entry to update
 * \param weight the new value for the weight
 * \return true if the weight has been updated, false otherwise
 */
ViewArray.prototype.updateWeightObject = function(uid, weight){
    var entry = this.getObject(uid), isUpdated = (weight !== entry.weight);
    if (isUpdated){
        this.totalWeight = this.totalWeight - entry.weight + weight
        entry.weight = weight;
    };
    return isUpdated;
}

/*!
 * \brief normalize the weight of all entries within the array
 * \return a list of the index of updated entries
 */
ViewArray.prototype.normalizeWeights = function(){
    var isUpdated, result = [];
    for (var i=0; i<this.length(); ++i){
        isUpdated = this.updateWeight(i, this.get(i).weight/this.totalWeight);
        if (isUpdated) { result.push(i); };
    };
    return result;
};

module.exports = ViewArray;
