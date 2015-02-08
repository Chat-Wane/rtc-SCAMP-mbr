var SortedArray = require("sorted-cmp-array");

/*!
 * \brief array containing the callback functions corresponding to the call
 * of an answer. I.e. answer takes message and callback as arguments. Since 
 * the callbacks can be different each time, we must remember which callback
 * call when we have the answer
 */
function CallbackArray(){
    this.callbacks = new SortedArray(
        function(a,b){
            if (a.uid < b.uid) {return -1;};
            if (a.uid > b.uid) {return  1;};
            if (a.counter < b.counter){ return -1;};
            if (a.counter > b.counter){ return  1;};
            return 0;
        });
};

/*!
 * \brief add the callback into the array associated to a unique identifier
 * \param uid the unique site identifier of the message in arugment of "answer"
 * \param counter the counter of the message in argument of "answer"
 * \param callback the callback function for this particular message
 */
CallbackArray.prototype.add = function(uid, counter, callback){
    this.callbacks.insert({uid: uid, counter: counter, callback: callback});
};

/*!
 * \brief get the callback corresponding to a initial message
 * \param uid the unique site identifier of the message
 * \param counter the counter of the message
 */
CallbackArray.prototype.getCallback = function(uid, counter){
    var callback = this.callbacks.arr[
        this.callbacks.indexOf({uid: uid, counter: counter})].callback;
    this.callbacks.remove({uid: uid, counter: counter});
    return callback;
};

module.exports = CallbackArray;
