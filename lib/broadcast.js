var IVV = require("causaltrack").IVV;

/*!
 * Implements the BroadcastDefinition interface using an underlying interval
 * version vector.
 */
function IVVBroadcast = function(uid){
    this.ivv = new IVV(uid);
};

/*!
 * \brief checks if the message has already been seen before.
 * \param message the message to check
 * \returns true if the message has been received before, false otherwise
 */
IVVBroadcast.prototype.stopPropagation = function(decoratedMessage){
    return this.ivv.isLower({_e:message.entry, _c:message.counter});
};


/*!
 * \brief add the necessary additional data to the original message.
 * \param originalMessage the original message
 * \returns the decorated message containing the original message
 */
IVVBroadcast.prototype.decorateBroadcastMessage = function(originalMessage){
    var pair = this.ivv.increment();
    var decoratedMessage = {entry: pair._e,
			    counter: pair._c,
			    payload: originalMessage};
    return decoratedMessage;
};

/*!
 * \brief opposite of decorateBroadcastMessage: remove the decoration of the
 * message and get the orginial message embedded.
 * \param message the decorated message
 * \returns the original message contained in the decorated message
 */
IVVBroadcast.prototype.removeDecoration = function(decoratedMessage){
    this.ivv.incrementFrom({_e:decoratedMessage.entry,
			    _c:decoratedMessage.counter});
    return decoratedMessage.payload;
};

module.exports = IVVBroadcast;
