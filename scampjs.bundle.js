require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports.c = 0;
module.exports.partialViewSize = 10;
module.exports.inViewSize = 10; 
module.exports.heartbeat = 30000; 

},{}],2:[function(require,module,exports){
/*!
 * MessageAcceptedSubscription(uid,counter,destUid,destCounter,offer)
 * MessageSubscription(uid,counter,offer)
 * MessageOfferRequest(uid,destUid,k)
 * MessageOfferResponse(uid,destUid,offers)
 * MessageHeartbeat(uid)
 */



/*!
 * \brief object that represents an accepted subscription message containing
 * the destination and the offer
 * \param uid the unique site identifier of the peer which accepts the offer
 * \param coutner the local counter of the site that emitted the accept
 * \param destUid the unique site identifier of the peer that wanted to sub
 * \param destCounter the local counter of the peer when it wanted to sub
 * \param offer the required webRTC data necessary to establish the p2p link
 */

function MessageAcceptedSubscription(uid,counter, destUid, destCounter, offer){
    this.type = "MessageAcceptedSubscription";
    this.uid = uid;
    this.counter = counter;
    this.destUid = destUid;
    this.destCounter = destCounter;
    this.offer = offer;
};

module.exports.MessageAcceptedSubscription = MessageAcceptedSubscription;

/*!
 * \brief object which represents a subscription message from a peer to the
 * network
 * \param uid the unique identifier of the peer that created the message
 * \param counter the local counter of the sender peer to ensure uniqueness
 * \param offer the webrtc data required to open the connection. These data
 * are the output of the Stun server.
 */
function MessageSubscription(uid, counter, offer){
    this.type = "MessageSubscription";
    this.uid = uid;
    this.counter = counter;
    this.offer = offer;
};

module.exports.MessageSubscription = MessageSubscription;

/*!
 * \brief object representing a message that request a number of offers in
 * order to contact the receiving peer
 * \param uid the unique site identifier that request the offers
 * \param destUid the unique site identifier that must provides these offers
 * \param k the number of offers to provide
 */
function MessageOfferRequest(uid, destUid, k){
    this.type = "MessageOfferRequest";
    this.uid = uid;
    this.destUid = destUid;
    this.k = k;
};

module.exports.MessageOfferRequest = MessageOfferRequest;

/*!
 * \brief object that represents a response message to an offer request. It
 * contains the k offers
 * \param uid the unique site identifier that provide the offers
 * \param destUid the unique site identifier that requested the offers
 * \param offers the list of offers provided
 */
function MessageOfferResponse(uid, destUid, offers){
    this.type = "MessageOfferResponse";
    this.uid = uid;
    this.destUid = destUid;
    this.offers = offers;
};

module.exports.MessageOfferResponse = MessageOfferResponse;

/*!
 * \brief object that represent an heartbeat message which only notify the
 * receiving peer that the sender is still alive. Thus, the receiving peer
 * does not remove it from the its inView.
 * \param uid the unique site identifier of the sender
 */
function MessageHeartbeat(uid){
    this.type = "MessageHeartbeat";
    this.uid = uid;
};

module.exports.MessageHeartbeat = MessageHeartbeat;

},{}],3:[function(require,module,exports){

function binaryIndexOf(){

/**
 * \from: [https://gist.github.com/Wolfy87/5734530]
 * Performs a binary search on the host array. This method can either be
 * injected into Array.prototype or called with a specified scope like this:
 * binaryIndexOf.call(someArray, searchElement);
 *
 *
 * @param {*} searchElement The item to search for within the array.
 * @return {Number} The index of the element which defaults to -1 when not
 * found.
 */
Array.prototype.binaryIndexOf = function(searchElement) {
    var minIndex = 0;
    var maxIndex = this.length - 1;
    var currentIndex;
    var currentElement;

    while (minIndex <= maxIndex) {
        currentIndex = Math.floor((minIndex + maxIndex) / 2);
        currentElement = this[currentIndex];
        if (currentElement.compare(searchElement) < 0) {
            minIndex = currentIndex + 1;
        }
        else if (currentElement.compare(searchElement) > 0) {
            maxIndex = currentIndex - 1;
        }
        else {
            return currentIndex;
        }
    };
    return ~maxIndex;
};

}

module.exports = binaryIndexOf();
},{}],4:[function(require,module,exports){

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
ViewEntry.prototype.compare = function(o){
    var uid = null;
    if (o instanceof ViewEntry){ uid = o.uid; } else { uid = o; };
    if (this.uid < uid){ return -1; };
    if (this.uid > uid){ return 1; };
    return 0;
};

module.exports = ViewEntry;

},{}],5:[function(require,module,exports){

module.exports.VV = require("./lib/versionvector.js");
module.exports.IVV =  require("./lib/intervalversionvector.js");
module.exports.VVwE = require("./lib/versionvectorwithexcept.js");

},{"./lib/intervalversionvector.js":6,"./lib/versionvector.js":9,"./lib/versionvectorwithexcept.js":10}],6:[function(require,module,exports){
var IVVEntry = require('./ivventry.js');
require('./util.js');

/**
 * \class IVV
 * \brief the interval version vector useful for tracking semantically
 * dependent events only. Making independant events non-blocking 
 * \param e the entry chosen by the local site (1 entry <-> 1 site)
 */
function IVV(e){
    this.local = new IVVEntry(e);
    this.vector = [];
    this.vector.push(this.local);
};


/**
 * \brief increment the entry of the vector on local update
 * \return {_e: entry, _c: counter} uniquely identifying the operation
 */
IVV.prototype.increment = function(){
    this.local.increment();
    return {_e: this.local.e, _c: this.local.v};
};


/**
 * \brief increment from a remote operation
 * \param ec the entry and clock of the received event to add supposedly rdy
 * the type is {_e: entry, _c: counter}
 */
IVV.prototype.incrementFrom = function (ec){
    // #0 find the entry within the array of IVVEntries
    var position = this.vector.binaryIndexOf(ec._e);
    // #1 if the entry does not exist, initialize it
    if (position < 0 || (position==0 && this.vector[0].compare(ec._e)!=0)){
	this.vector.splice(-position, 0, new IVVEntry(ec._e));
	position = -position;
    };
    // #2 increment the entry
    this.vector[position].incrementFrom(ec._c);
};


/**
 * \brief check if this vector is causally ready 
 * \param ec the site clock that happen-before the current event
 */
IVV.prototype.isRdy = function(ec){
    var rdy = (ec === null);
    if (!rdy){
	var position = this.vector.binaryIndexOf(ec._e);
	if (position>0 || (position==0 && this.vector[0].compare(ec._e)==0)) {
	    rdy = this.vector[position].contains(ec._c);
	};
    };
    return rdy;
};

/**
 * \brief check if the message contains information already delivered
 * \param ec the site clock to check
 */
IVV.prototype.isLower = function(ec){
    return (ec!==null) && (this.isRdy(ec));
};

module.exports = IVV;


},{"./ivventry.js":7,"./util.js":8}],7:[function(require,module,exports){
var BI = require('BigInt');

/*!
  \brief create an entry of the interval version vector containing the
  index of the entry, the value v that creates a contiguous interval
  from 0 to v, a bit array that define whether or not the operation has been
  received
  \param e the entry in the interval version vector
*/
function IVVEntry(e){
    this.e = e;
    this.v = 0;
    this.o = new BI.int2bigInt(0,0,0);
};

/*!
 * \brief local counter incremented
 */
IVVEntry.prototype.increment = function(){
    this.v += 1;
};

/**
 * \brief increment from a remote operation
 * \param c the counter of the operation to add to this 
 */
IVVEntry.prototype.incrementFrom = function(c){
    // #1 update the omen vector
    if (c > this.v){
	var power = BI.int2bigInt(1, c-this.v, 1);
	BI.leftShift_(power, c-this.v-1);
	this.o = BI.add(this.o, power);
    };
    // #2 shift if the lowest bit is set to 1
    while(!BI.isZero(this.o) && (BI.modInt(this.o,2)!=0)){
	this.v += 1;
	BI.rightShift_(this.o, 1);
    };
};

/*!
 * \brief check if this entry contains the counter in argument
 * \return true if it contains the counter, false otherwise
 */
IVVEntry.prototype.contains = function(c){
    // #1 is the counter within the interval 0..v
    var contains = (c <= this.v);
    // #2 is the counter within the bit array
    if (!contains){
	var duplicate = BI.dup(this.o);
	BI.rightShift_(duplicate, c-this.v-1);
	contains = (BI.modInt(duplicate,2)==1);
    };
    return contains;
};

/*!
 * \brief function that allow to order entries in the array and search an entry
 * \param o the other IVVEntry or an entry to find
 */
IVVEntry.prototype.compare = function(o){
    var otherEntry = null;
    if (o instanceof IVVEntry) {otherEntry = o.e;} else {otherEntry = o;}
    if (this.e < otherEntry){ return -1; }
    if (this.e > otherEntry){ return  1; }
    return 0;
};

module.exports = IVVEntry;

},{"BigInt":12}],8:[function(require,module,exports){
module.exports=require(3)
},{"/Users/chat-wane/Desktop/project/SCAMPjs/lib/util.js":3}],9:[function(require,module,exports){

/**
 * \class VV
 * \brief the well-known version vector that characterizes causality between
 * updates
 * \param e the entry chosen by the local site (1 entry <-> 1 site)
 */
function VV(e){
    this._e = e;
    this._v = [];
};


/**
 * \brief increment the entry of the vector on local update
 * \return {_e: entry, _c: counter} uniquely identifying the operation
 */
VV.prototype.increment = function(){
    if (!(this._e in this._v)){ this._v[this._e] = 0;  };
    this._v[this._e] += 1;
    return {_e: this._e, _c: this._v[this._e]};
};


/**
 * \brief increment the version vector with the incoming pair representing the
 * operation 
 * \param ec the entry clock of the received operation supposedly ready
 */
VV.prototype.incrementFrom = function (ec){
    this._v[ec._e] = ec._c; // if ready, it means + 1 on the entry
};


/**
 * \brief check if the target VV is causally ready 
 * \param vv the version vector to check
 */
VV.prototype.isRdy = function(vv){
    var ready = true;

    // #1 verify that all entry of this._v exists in vv
    var keys = Object.keys(this._v);
    var i = 0;
    while (ready && i<keys.length){
	if (!(keys[i] in vv._v) ||
	    (this._v[keys[i]] > vv._v[keys[i]])){
	    ready = false;
	};
	++i;
    };

    // #2 verify that all entry of vv._v exists in this._v
    var keys = Object.keys(vv._v);
    var i = 0;
    while (ready && i<keys.length){
	if ((keys[i]!=vv._e) &&
	    (!(keys[i] in this._v) ||
	     (this._v[keys[i]] > vv._v[keys[i]]))){
	    ready = false;
	};
	++i;
    };

    ready = (ready &&
	     ((vv._v[vv._e]==1) ||
	      ((vv._e in this._v) && (vv._v[vv._e] == (this._v[vv._e] +1) ))));
    
    return ready;
};

/**
 * \brief check if the target ec is strictly lower than the local one. Probably
 * meaning that the information linked to it has already been delivered
 * \param ec the entry and counter which identifies an operation
 */
VV.prototype.isLower = function(ec){
    return ((ec._e in this._v) && (ec._c <= this._v[ec._e]));
};



module.exports = VV;

},{}],10:[function(require,module,exports){
var VVwEEntry = require('./vvweentry.js');
require('./util.js');

/**
 * \class VVwE
 * \brief class version vector with exception keeps track of events in a 
 * concise way
 * \param e the entry chosen by the local site (1 entry <-> 1 site)
 */
function VVwE(e){
    this.local = new VVwEEntry(e);
    this.vector = [];
    this.vector.push(this.local);
};


/**
 * \brief increment the entry of the vector on local update
 * \return {_e: entry, _c: counter} uniquely identifying the operation
 */
VVwE.prototype.increment = function(){
    this.local.increment();
    return {_e: this.local.e, _c:this.local.v}; 
};


/**
 * \brief increment from a remote operation
 * \param ec the entry and clock of the received event to add supposedly rdy
 * the type is {_e: entry, _c: counter}
 */
VVwE.prototype.incrementFrom = function (ec){
    // #0 find the entry within the array of VVwEntries
    var position = this.vector.binaryIndexOf(ec._e);
    // #1 if the entry does not exist, initialize it
    if (position < 0 || (position==0 && this.vector[0].compare(ec._e)!=0)){
	this.vector.splice(-position, 0, new VVwEEntry(ec._e));
	position = -position;
    };
    // #2 increment the entry
    this.vector[position].incrementFrom(ec._c);
};


/**
 * \brief check if the argument are causally ready regards to this vector
 * \param ec the site clock that happen-before the current event
 */
VVwE.prototype.isRdy = function(ec){
    var ready = (ec===null);
    if (!ready){
	var position = this.vector.binaryIndexOf(ec._e);
	ready =((position>0||(position==0 && this.vector[position].e==ec._e))&&
		((ec._c <= this.vector[position].v) &&
		 (this.vector[position].x.indexOf(ec._c)<0)));
    };
    return ready;
};

/**
 * \brief check if the message contains information already delivered
 * \param ec the site clock to check
 */
VVwE.prototype.isLower = function(ec){
    return ((ec!==null) && this.isRdy(ec));
};

module.exports = VVwE;


},{"./util.js":8,"./vvweentry.js":11}],11:[function(require,module,exports){
var BI = require('BigInt');

/*!
  \brief create an entry of the version vector with exceptions containing the
  index of the entry, the value v that creates a contiguous interval
  from 0 to v, an array of integers that contain the operations lower to v that
  have not been received yet
  \param e the entry in the interval version vector
*/
function VVwEEntry(e){
    this.e = e;   
    this.v = 0;
    this.x = [];
};

/*!
 * \brief local counter incremented
 */
VVwEEntry.prototype.increment = function(){
    this.v += 1;
};

/**
 * \brief increment from a remote operation
 * \param c the counter of the operation to add to this 
 */
VVwEEntry.prototype.incrementFrom = function(c){
    // #1 check if the counter is included in the exceptions
    if (c < this.v){
	var index = this.x.indexOf(c);
	if (index>=0){ // the exception is found
	    this.x.splice(index, 1);
	};
    };
    // #2 if the value is +1 compared to the current value of the vector
    if (c == (this.v + 1)){
	this.v += 1;
    };
    // #3 otherwise exception are made
    if (c > (this.v + 1)){
	for (var i = (this.v + 1); i<c; ++i){
	    this.x.push(i);
	};
	this.v = c;
    };
};

/*!
 * \brief function that allows to order the entries in the array and search
 * an entry
 * \param o the other VVwEEntry or an entry to find
 */
VVwEEntry.prototype.compare = function(o){
    var otherEntry = null;
    if (o instanceof VVwEEntry) {otherEntry = o.e;} else {otherEntry = o;}
    if (this.e < otherEntry){ return -1; }
    if (this.e > otherEntry){ return  1; }
    return 0;
};

module.exports = VVwEEntry;

},{"BigInt":12}],12:[function(require,module,exports){
// Vjeux: Customized bigInt2str and str2bigInt in order to accept custom base.

////////////////////////////////////////////////////////////////////////////////////////
// Big Integer Library v. 5.4
// Created 2000, last modified 2009
// Leemon Baird
// www.leemon.com
//
// Version history:
// v 5.4  3 Oct 2009
//   - added "var i" to greaterShift() so i is not global. (Thanks to P�ter Szab� for finding that bug)
//
// v 5.3  21 Sep 2009
//   - added randProbPrime(k) for probable primes
//   - unrolled loop in mont_ (slightly faster)
//   - millerRabin now takes a bigInt parameter rather than an int
//
// v 5.2  15 Sep 2009
//   - fixed capitalization in call to int2bigInt in randBigInt
//     (thanks to Emili Evripidou, Reinhold Behringer, and Samuel Macaleese for finding that bug)
//
// v 5.1  8 Oct 2007
//   - renamed inverseModInt_ to inverseModInt since it doesn't change its parameters
//   - added functions GCD and randBigInt, which call GCD_ and randBigInt_
//   - fixed a bug found by Rob Visser (see comment with his name below)
//   - improved comments
//
// This file is public domain.   You can use it for any purpose without restriction.
// I do not guarantee that it is correct, so use it at your own risk.  If you use
// it for something interesting, I'd appreciate hearing about it.  If you find
// any bugs or make any improvements, I'd appreciate hearing about those too.
// It would also be nice if my name and URL were left in the comments.  But none
// of that is required.
//
// This code defines a bigInt library for arbitrary-precision integers.
// A bigInt is an array of integers storing the value in chunks of bpe bits,
// little endian (buff[0] is the least significant word).
// Negative bigInts are stored two's complement.  Almost all the functions treat
// bigInts as nonnegative.  The few that view them as two's complement say so
// in their comments.  Some functions assume their parameters have at least one
// leading zero element. Functions with an underscore at the end of the name put
// their answer into one of the arrays passed in, and have unpredictable behavior
// in case of overflow, so the caller must make sure the arrays are big enough to
// hold the answer.  But the average user should never have to call any of the
// underscored functions.  Each important underscored function has a wrapper function
// of the same name without the underscore that takes care of the details for you.
// For each underscored function where a parameter is modified, that same variable
// must not be used as another argument too.  So, you cannot square x by doing
// multMod_(x,x,n).  You must use squareMod_(x,n) instead, or do y=dup(x); multMod_(x,y,n).
// Or simply use the multMod(x,x,n) function without the underscore, where
// such issues never arise, because non-underscored functions never change
// their parameters; they always allocate new memory for the answer that is returned.
//
// These functions are designed to avoid frequent dynamic memory allocation in the inner loop.
// For most functions, if it needs a BigInt as a local variable it will actually use
// a global, and will only allocate to it only when it's not the right size.  This ensures
// that when a function is called repeatedly with same-sized parameters, it only allocates
// memory on the first call.
//
// Note that for cryptographic purposes, the calls to Math.random() must
// be replaced with calls to a better pseudorandom number generator.
//
// In the following, "bigInt" means a bigInt with at least one leading zero element,
// and "integer" means a nonnegative integer less than radix.  In some cases, integer
// can be negative.  Negative bigInts are 2s complement.
//
// The following functions do not modify their inputs.
// Those returning a bigInt, string, or Array will dynamically allocate memory for that value.
// Those returning a boolean will return the integer 0 (false) or 1 (true).
// Those returning boolean or int will not allocate memory except possibly on the first
// time they're called with a given parameter size.
//
// bigInt  add(x,y)               //return (x+y) for bigInts x and y.
// bigInt  addInt(x,n)            //return (x+n) where x is a bigInt and n is an integer.
// string  bigInt2str(x,base)     //return a string form of bigInt x in a given base, with 2 <= base <= 95
// int     bitSize(x)             //return how many bits long the bigInt x is, not counting leading zeros
// bigInt  dup(x)                 //return a copy of bigInt x
// boolean equals(x,y)            //is the bigInt x equal to the bigint y?
// boolean equalsInt(x,y)         //is bigint x equal to integer y?
// bigInt  expand(x,n)            //return a copy of x with at least n elements, adding leading zeros if needed
// Array   findPrimes(n)          //return array of all primes less than integer n
// bigInt  GCD(x,y)               //return greatest common divisor of bigInts x and y (each with same number of elements).
// boolean greater(x,y)           //is x>y?  (x and y are nonnegative bigInts)
// boolean greaterShift(x,y,shift)//is (x <<(shift*bpe)) > y?
// bigInt  int2bigInt(t,n,m)      //return a bigInt equal to integer t, with at least n bits and m array elements
// bigInt  inverseMod(x,n)        //return (x**(-1) mod n) for bigInts x and n.  If no inverse exists, it returns null
// int     inverseModInt(x,n)     //return x**(-1) mod n, for integers x and n.  Return 0 if there is no inverse
// boolean isZero(x)              //is the bigInt x equal to zero?
// boolean millerRabin(x,b)       //does one round of Miller-Rabin base integer b say that bigInt x is possibly prime? (b is bigInt, 1<b<x)
// boolean millerRabinInt(x,b)    //does one round of Miller-Rabin base integer b say that bigInt x is possibly prime? (b is int,    1<b<x)
// bigInt  mod(x,n)               //return a new bigInt equal to (x mod n) for bigInts x and n.
// int     modInt(x,n)            //return x mod n for bigInt x and integer n.
// bigInt  mult(x,y)              //return x*y for bigInts x and y. This is faster when y<x.
// bigInt  multMod(x,y,n)         //return (x*y mod n) for bigInts x,y,n.  For greater speed, let y<x.
// boolean negative(x)            //is bigInt x negative?
// bigInt  powMod(x,y,n)          //return (x**y mod n) where x,y,n are bigInts and ** is exponentiation.  0**0=1. Faster for odd n.
// bigInt  randBigInt(n,s)        //return an n-bit random BigInt (n>=1).  If s=1, then the most significant of those n bits is set to 1.
// bigInt  randTruePrime(k)       //return a new, random, k-bit, true prime bigInt using Maurer's algorithm.
// bigInt  randProbPrime(k)       //return a new, random, k-bit, probable prime bigInt (probability it's composite less than 2^-80).
// bigInt  str2bigInt(s,b,n,m)    //return a bigInt for number represented in string s in base b with at least n bits and m array elements
// bigInt  sub(x,y)               //return (x-y) for bigInts x and y.  Negative answers will be 2s complement
// bigInt  trim(x,k)              //return a copy of x with exactly k leading zero elements
//
//
// The following functions each have a non-underscored version, which most users should call instead.
// These functions each write to a single parameter, and the caller is responsible for ensuring the array
// passed in is large enough to hold the result.
//
// void    addInt_(x,n)          //do x=x+n where x is a bigInt and n is an integer
// void    add_(x,y)             //do x=x+y for bigInts x and y
// void    copy_(x,y)            //do x=y on bigInts x and y
// void    copyInt_(x,n)         //do x=n on bigInt x and integer n
// void    GCD_(x,y)             //set x to the greatest common divisor of bigInts x and y, (y is destroyed).  (This never overflows its array).
// boolean inverseMod_(x,n)      //do x=x**(-1) mod n, for bigInts x and n. Returns 1 (0) if inverse does (doesn't) exist
// void    mod_(x,n)             //do x=x mod n for bigInts x and n. (This never overflows its array).
// void    mult_(x,y)            //do x=x*y for bigInts x and y.
// void    multMod_(x,y,n)       //do x=x*y  mod n for bigInts x,y,n.
// void    powMod_(x,y,n)        //do x=x**y mod n, where x,y,n are bigInts (n is odd) and ** is exponentiation.  0**0=1.
// void    randBigInt_(b,n,s)    //do b = an n-bit random BigInt. if s=1, then nth bit (most significant bit) is set to 1. n>=1.
// void    randTruePrime_(ans,k) //do ans = a random k-bit true random prime (not just probable prime) with 1 in the msb.
// void    sub_(x,y)             //do x=x-y for bigInts x and y. Negative answers will be 2s complement.
//
// The following functions do NOT have a non-underscored version.
// They each write a bigInt result to one or more parameters.  The caller is responsible for
// ensuring the arrays passed in are large enough to hold the results.
//
// void addShift_(x,y,ys)       //do x=x+(y<<(ys*bpe))
// void carry_(x)               //do carries and borrows so each element of the bigInt x fits in bpe bits.
// void divide_(x,y,q,r)        //divide x by y giving quotient q and remainder r
// int  divInt_(x,n)            //do x=floor(x/n) for bigInt x and integer n, and return the remainder. (This never overflows its array).
// int  eGCD_(x,y,d,a,b)        //sets a,b,d to positive bigInts such that d = GCD_(x,y) = a*x-b*y
// void halve_(x)               //do x=floor(|x|/2)*sgn(x) for bigInt x in 2's complement.  (This never overflows its array).
// void leftShift_(x,n)         //left shift bigInt x by n bits.  n<bpe.
// void linComb_(x,y,a,b)       //do x=a*x+b*y for bigInts x and y and integers a and b
// void linCombShift_(x,y,b,ys) //do x=x+b*(y<<(ys*bpe)) for bigInts x and y, and integers b and ys
// void mont_(x,y,n,np)         //Montgomery multiplication (see comments where the function is defined)
// void multInt_(x,n)           //do x=x*n where x is a bigInt and n is an integer.
// void rightShift_(x,n)        //right shift bigInt x by n bits.  0 <= n < bpe. (This never overflows its array).
// void squareMod_(x,n)         //do x=x*x  mod n for bigInts x,n
// void subShift_(x,y,ys)       //do x=x-(y<<(ys*bpe)). Negative answers will be 2s complement.
//
// The following functions are based on algorithms from the _Handbook of Applied Cryptography_
//    powMod_()           = algorithm 14.94, Montgomery exponentiation
//    eGCD_,inverseMod_() = algorithm 14.61, Binary extended GCD_
//    GCD_()              = algorothm 14.57, Lehmer's algorithm
//    mont_()             = algorithm 14.36, Montgomery multiplication
//    divide_()           = algorithm 14.20  Multiple-precision division
//    squareMod_()        = algorithm 14.16  Multiple-precision squaring
//    randTruePrime_()    = algorithm  4.62, Maurer's algorithm
//    millerRabin()       = algorithm  4.24, Miller-Rabin algorithm
//
// Profiling shows:
//     randTruePrime_() spends:
//         10% of its time in calls to powMod_()
//         85% of its time in calls to millerRabin()
//     millerRabin() spends:
//         99% of its time in calls to powMod_()   (always with a base of 2)
//     powMod_() spends:
//         94% of its time in calls to mont_()  (almost always with x==y)
//
// This suggests there are several ways to speed up this library slightly:
//     - convert powMod_ to use a Montgomery form of k-ary window (or maybe a Montgomery form of sliding window)
//         -- this should especially focus on being fast when raising 2 to a power mod n
//     - convert randTruePrime_() to use a minimum r of 1/3 instead of 1/2 with the appropriate change to the test
//     - tune the parameters in randTruePrime_(), including c, m, and recLimit
//     - speed up the single loop in mont_() that takes 95% of the runtime, perhaps by reducing checking
//       within the loop when all the parameters are the same length.
//
// There are several ideas that look like they wouldn't help much at all:
//     - replacing trial division in randTruePrime_() with a sieve (that speeds up something taking almost no time anyway)
//     - increase bpe from 15 to 30 (that would help if we had a 32*32->64 multiplier, but not with JavaScript's 32*32->32)
//     - speeding up mont_(x,y,n,np) when x==y by doing a non-modular, non-Montgomery square
//       followed by a Montgomery reduction.  The intermediate answer will be twice as long as x, so that
//       method would be slower.  This is unfortunate because the code currently spends almost all of its time
//       doing mont_(x,x,...), both for randTruePrime_() and powMod_().  A faster method for Montgomery squaring
//       would have a large impact on the speed of randTruePrime_() and powMod_().  HAC has a couple of poorly-worded
//       sentences that seem to imply it's faster to do a non-modular square followed by a single
//       Montgomery reduction, but that's obviously wrong.
////////////////////////////////////////////////////////////////////////////////////////

(function () {
//globals
bpe=0;         //bits stored per array element
mask=0;        //AND this with an array element to chop it down to bpe bits
radix=mask+1;  //equals 2^bpe.  A single 1 bit to the left of the last bit of mask.

//the digits for converting to different bases
digitsStr='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_=!@#$%^&*()[]{}|;:,.<>/?`~ \\\'\"+-';

//initialize the global variables
for (bpe=0; (1<<(bpe+1)) > (1<<bpe); bpe++);  //bpe=number of bits in the mantissa on this platform
bpe>>=1;                   //bpe=number of bits in one element of the array representing the bigInt
mask=(1<<bpe)-1;           //AND the mask with an integer to get its bpe least significant bits
radix=mask+1;              //2^bpe.  a single 1 bit to the left of the first bit of mask
one=int2bigInt(1,1,1);     //constant used in powMod_()

//the following global variables are scratchpad memory to
//reduce dynamic memory allocation in the inner loop
t=new Array(0);
ss=t;       //used in mult_()
s0=t;       //used in multMod_(), squareMod_()
s1=t;       //used in powMod_(), multMod_(), squareMod_()
s2=t;       //used in powMod_(), multMod_()
s3=t;       //used in powMod_()
s4=t; s5=t; //used in mod_()
s6=t;       //used in bigInt2str()
s7=t;       //used in powMod_()
T=t;        //used in GCD_()
sa=t;       //used in mont_()
mr_x1=t; mr_r=t; mr_a=t;                                      //used in millerRabin()
eg_v=t; eg_u=t; eg_A=t; eg_B=t; eg_C=t; eg_D=t;               //used in eGCD_(), inverseMod_()
md_q1=t; md_q2=t; md_q3=t; md_r=t; md_r1=t; md_r2=t; md_tt=t; //used in mod_()

primes=t; pows=t; s_i=t; s_i2=t; s_R=t; s_rm=t; s_q=t; s_n1=t;
  s_a=t; s_r2=t; s_n=t; s_b=t; s_d=t; s_x1=t; s_x2=t, s_aa=t; //used in randTruePrime_()

rpprb=t; //used in randProbPrimeRounds() (which also uses "primes")

////////////////////////////////////////////////////////////////////////////////////////


//return array of all primes less than integer n
function findPrimes(n) {
  var i,s,p,ans;
  s=new Array(n);
  for (i=0;i<n;i++)
    s[i]=0;
  s[0]=2;
  p=0;    //first p elements of s are primes, the rest are a sieve
  for(;s[p]<n;) {                  //s[p] is the pth prime
    for(i=s[p]*s[p]; i<n; i+=s[p]) //mark multiples of s[p]
      s[i]=1;
    p++;
    s[p]=s[p-1]+1;
    for(; s[p]<n && s[s[p]]; s[p]++); //find next prime (where s[p]==0)
  }
  ans=new Array(p);
  for(i=0;i<p;i++)
    ans[i]=s[i];
  return ans;
}


//does a single round of Miller-Rabin base b consider x to be a possible prime?
//x is a bigInt, and b is an integer, with b<x
function millerRabinInt(x,b) {
  if (mr_x1.length!=x.length) {
    mr_x1=dup(x);
    mr_r=dup(x);
    mr_a=dup(x);
  }

  copyInt_(mr_a,b);
  return millerRabin(x,mr_a);
}

//does a single round of Miller-Rabin base b consider x to be a possible prime?
//x and b are bigInts with b<x
function millerRabin(x,b) {
  var i,j,k,s;

  if (mr_x1.length!=x.length) {
    mr_x1=dup(x);
    mr_r=dup(x);
    mr_a=dup(x);
  }

  copy_(mr_a,b);
  copy_(mr_r,x);
  copy_(mr_x1,x);

  addInt_(mr_r,-1);
  addInt_(mr_x1,-1);

  //s=the highest power of two that divides mr_r
  k=0;
  for (i=0;i<mr_r.length;i++)
    for (j=1;j<mask;j<<=1)
      if (x[i] & j) {
        s=(k<mr_r.length+bpe ? k : 0);
         i=mr_r.length;
         j=mask;
      } else
        k++;

  if (s)
    rightShift_(mr_r,s);

  powMod_(mr_a,mr_r,x);

  if (!equalsInt(mr_a,1) && !equals(mr_a,mr_x1)) {
    j=1;
    while (j<=s-1 && !equals(mr_a,mr_x1)) {
      squareMod_(mr_a,x);
      if (equalsInt(mr_a,1)) {
        return 0;
      }
      j++;
    }
    if (!equals(mr_a,mr_x1)) {
      return 0;
    }
  }
  return 1;
}

//returns how many bits long the bigInt is, not counting leading zeros.
function bitSize(x) {
  var j,z,w;
  for (j=x.length-1; (x[j]==0) && (j>0); j--);
  for (z=0,w=x[j]; w; (w>>=1),z++);
  z+=bpe*j;
  return z;
}

//return a copy of x with at least n elements, adding leading zeros if needed
function expand(x,n) {
  var ans=int2bigInt(0,(x.length>n ? x.length : n)*bpe,0);
  copy_(ans,x);
  return ans;
}

//return a k-bit true random prime using Maurer's algorithm.
function randTruePrime(k) {
  var ans=int2bigInt(0,k,0);
  randTruePrime_(ans,k);
  return trim(ans,1);
}

//return a k-bit random probable prime with probability of error < 2^-80
function randProbPrime(k) {
  if (k>=600) return randProbPrimeRounds(k,2); //numbers from HAC table 4.3
  if (k>=550) return randProbPrimeRounds(k,4);
  if (k>=500) return randProbPrimeRounds(k,5);
  if (k>=400) return randProbPrimeRounds(k,6);
  if (k>=350) return randProbPrimeRounds(k,7);
  if (k>=300) return randProbPrimeRounds(k,9);
  if (k>=250) return randProbPrimeRounds(k,12); //numbers from HAC table 4.4
  if (k>=200) return randProbPrimeRounds(k,15);
  if (k>=150) return randProbPrimeRounds(k,18);
  if (k>=100) return randProbPrimeRounds(k,27);
              return randProbPrimeRounds(k,40); //number from HAC remark 4.26 (only an estimate)
}

//return a k-bit probable random prime using n rounds of Miller Rabin (after trial division with small primes)
function randProbPrimeRounds(k,n) {
  var ans, i, divisible, B;
  B=30000;  //B is largest prime to use in trial division
  ans=int2bigInt(0,k,0);

  //optimization: try larger and smaller B to find the best limit.

  if (primes.length==0)
    primes=findPrimes(30000);  //check for divisibility by primes <=30000

  if (rpprb.length!=ans.length)
    rpprb=dup(ans);

  for (;;) { //keep trying random values for ans until one appears to be prime
    //optimization: pick a random number times L=2*3*5*...*p, plus a
    //   random element of the list of all numbers in [0,L) not divisible by any prime up to p.
    //   This can reduce the amount of random number generation.

    randBigInt_(ans,k,0); //ans = a random odd number to check
    ans[0] |= 1;
    divisible=0;

    //check ans for divisibility by small primes up to B
    for (i=0; (i<primes.length) && (primes[i]<=B); i++)
      if (modInt(ans,primes[i])==0 && !equalsInt(ans,primes[i])) {
        divisible=1;
        break;
      }

    //optimization: change millerRabin so the base can be bigger than the number being checked, then eliminate the while here.

    //do n rounds of Miller Rabin, with random bases less than ans
    for (i=0; i<n && !divisible; i++) {
      randBigInt_(rpprb,k,0);
      while(!greater(ans,rpprb)) //pick a random rpprb that's < ans
        randBigInt_(rpprb,k,0);
      if (!millerRabin(ans,rpprb))
        divisible=1;
    }

    if(!divisible)
      return ans;
  }
}

//return a new bigInt equal to (x mod n) for bigInts x and n.
function mod(x,n) {
  var ans=dup(x);
  mod_(ans,n);
  return trim(ans,1);
}

//return (x+n) where x is a bigInt and n is an integer.
function addInt(x,n) {
  var ans=expand(x,x.length+1);
  addInt_(ans,n);
  return trim(ans,1);
}

//return x*y for bigInts x and y. This is faster when y<x.
function mult(x,y) {
  var ans=expand(x,x.length+y.length);
  mult_(ans,y);
  return trim(ans,1);
}

//return (x**y mod n) where x,y,n are bigInts and ** is exponentiation.  0**0=1. Faster for odd n.
function powMod(x,y,n) {
  var ans=expand(x,n.length);
  powMod_(ans,trim(y,2),trim(n,2),0);  //this should work without the trim, but doesn't
  return trim(ans,1);
}

//return (x-y) for bigInts x and y.  Negative answers will be 2s complement
function sub(x,y) {
  var ans=expand(x,(x.length>y.length ? x.length+1 : y.length+1));
  sub_(ans,y);
  return trim(ans,1);
}

//return (x+y) for bigInts x and y.
function add(x,y) {
  var ans=expand(x,(x.length>y.length ? x.length+1 : y.length+1));
  add_(ans,y);
  return trim(ans,1);
}

//return (x**(-1) mod n) for bigInts x and n.  If no inverse exists, it returns null
function inverseMod(x,n) {
  var ans=expand(x,n.length);
  var s;
  s=inverseMod_(ans,n);
  return s ? trim(ans,1) : null;
}

//return (x*y mod n) for bigInts x,y,n.  For greater speed, let y<x.
function multMod(x,y,n) {
  var ans=expand(x,n.length);
  multMod_(ans,y,n);
  return trim(ans,1);
}

//generate a k-bit true random prime using Maurer's algorithm,
//and put it into ans.  The bigInt ans must be large enough to hold it.
function randTruePrime_(ans,k) {
  var c,m,pm,dd,j,r,B,divisible,z,zz,recSize;

  if (primes.length==0)
    primes=findPrimes(30000);  //check for divisibility by primes <=30000

  if (pows.length==0) {
    pows=new Array(512);
    for (j=0;j<512;j++) {
      pows[j]=Math.pow(2,j/511.-1.);
    }
  }

  //c and m should be tuned for a particular machine and value of k, to maximize speed
  c=0.1;  //c=0.1 in HAC
  m=20;   //generate this k-bit number by first recursively generating a number that has between k/2 and k-m bits
  recLimit=20; //stop recursion when k <=recLimit.  Must have recLimit >= 2

  if (s_i2.length!=ans.length) {
    s_i2=dup(ans);
    s_R =dup(ans);
    s_n1=dup(ans);
    s_r2=dup(ans);
    s_d =dup(ans);
    s_x1=dup(ans);
    s_x2=dup(ans);
    s_b =dup(ans);
    s_n =dup(ans);
    s_i =dup(ans);
    s_rm=dup(ans);
    s_q =dup(ans);
    s_a =dup(ans);
    s_aa=dup(ans);
  }

  if (k <= recLimit) {  //generate small random primes by trial division up to its square root
    pm=(1<<((k+2)>>1))-1; //pm is binary number with all ones, just over sqrt(2^k)
    copyInt_(ans,0);
    for (dd=1;dd;) {
      dd=0;
      ans[0]= 1 | (1<<(k-1)) | Math.floor(Math.random()*(1<<k));  //random, k-bit, odd integer, with msb 1
      for (j=1;(j<primes.length) && ((primes[j]&pm)==primes[j]);j++) { //trial division by all primes 3...sqrt(2^k)
        if (0==(ans[0]%primes[j])) {
          dd=1;
          break;
        }
      }
    }
    carry_(ans);
    return;
  }

  B=c*k*k;    //try small primes up to B (or all the primes[] array if the largest is less than B).
  if (k>2*m)  //generate this k-bit number by first recursively generating a number that has between k/2 and k-m bits
    for (r=1; k-k*r<=m; )
      r=pows[Math.floor(Math.random()*512)];   //r=Math.pow(2,Math.random()-1);
  else
    r=.5;

  //simulation suggests the more complex algorithm using r=.333 is only slightly faster.

  recSize=Math.floor(r*k)+1;

  randTruePrime_(s_q,recSize);
  copyInt_(s_i2,0);
  s_i2[Math.floor((k-2)/bpe)] |= (1<<((k-2)%bpe));   //s_i2=2^(k-2)
  divide_(s_i2,s_q,s_i,s_rm);                        //s_i=floor((2^(k-1))/(2q))

  z=bitSize(s_i);

  for (;;) {
    for (;;) {  //generate z-bit numbers until one falls in the range [0,s_i-1]
      randBigInt_(s_R,z,0);
      if (greater(s_i,s_R))
        break;
    }                //now s_R is in the range [0,s_i-1]
    addInt_(s_R,1);  //now s_R is in the range [1,s_i]
    add_(s_R,s_i);   //now s_R is in the range [s_i+1,2*s_i]

    copy_(s_n,s_q);
    mult_(s_n,s_R);
    multInt_(s_n,2);
    addInt_(s_n,1);    //s_n=2*s_R*s_q+1

    copy_(s_r2,s_R);
    multInt_(s_r2,2);  //s_r2=2*s_R

    //check s_n for divisibility by small primes up to B
    for (divisible=0,j=0; (j<primes.length) && (primes[j]<B); j++)
      if (modInt(s_n,primes[j])==0 && !equalsInt(s_n,primes[j])) {
        divisible=1;
        break;
      }

    if (!divisible)    //if it passes small primes check, then try a single Miller-Rabin base 2
      if (!millerRabinInt(s_n,2)) //this line represents 75% of the total runtime for randTruePrime_
        divisible=1;

    if (!divisible) {  //if it passes that test, continue checking s_n
      addInt_(s_n,-3);
      for (j=s_n.length-1;(s_n[j]==0) && (j>0); j--);  //strip leading zeros
      for (zz=0,w=s_n[j]; w; (w>>=1),zz++);
      zz+=bpe*j;                             //zz=number of bits in s_n, ignoring leading zeros
      for (;;) {  //generate z-bit numbers until one falls in the range [0,s_n-1]
        randBigInt_(s_a,zz,0);
        if (greater(s_n,s_a))
          break;
      }                //now s_a is in the range [0,s_n-1]
      addInt_(s_n,3);  //now s_a is in the range [0,s_n-4]
      addInt_(s_a,2);  //now s_a is in the range [2,s_n-2]
      copy_(s_b,s_a);
      copy_(s_n1,s_n);
      addInt_(s_n1,-1);
      powMod_(s_b,s_n1,s_n);   //s_b=s_a^(s_n-1) modulo s_n
      addInt_(s_b,-1);
      if (isZero(s_b)) {
        copy_(s_b,s_a);
        powMod_(s_b,s_r2,s_n);
        addInt_(s_b,-1);
        copy_(s_aa,s_n);
        copy_(s_d,s_b);
        GCD_(s_d,s_n);  //if s_b and s_n are relatively prime, then s_n is a prime
        if (equalsInt(s_d,1)) {
          copy_(ans,s_aa);
          return;     //if we've made it this far, then s_n is absolutely guaranteed to be prime
        }
      }
    }
  }
}

//Return an n-bit random BigInt (n>=1).  If s=1, then the most significant of those n bits is set to 1.
function randBigInt(n,s) {
  var a,b;
  a=Math.floor((n-1)/bpe)+2; //# array elements to hold the BigInt with a leading 0 element
  b=int2bigInt(0,0,a);
  randBigInt_(b,n,s);
  return b;
}

//Set b to an n-bit random BigInt.  If s=1, then the most significant of those n bits is set to 1.
//Array b must be big enough to hold the result. Must have n>=1
function randBigInt_(b,n,s) {
  var i,a;
  for (i=0;i<b.length;i++)
    b[i]=0;
  a=Math.floor((n-1)/bpe)+1; //# array elements to hold the BigInt
  for (i=0;i<a;i++) {
    b[i]=Math.floor(Math.random()*(1<<(bpe-1)));
  }
  b[a-1] &= (2<<((n-1)%bpe))-1;
  if (s==1)
    b[a-1] |= (1<<((n-1)%bpe));
}

//Return the greatest common divisor of bigInts x and y (each with same number of elements).
function GCD(x,y) {
  var xc,yc;
  xc=dup(x);
  yc=dup(y);
  GCD_(xc,yc);
  return xc;
}

//set x to the greatest common divisor of bigInts x and y (each with same number of elements).
//y is destroyed.
function GCD_(x,y) {
  var i,xp,yp,A,B,C,D,q,sing;
  if (T.length!=x.length)
    T=dup(x);

  sing=1;
  while (sing) { //while y has nonzero elements other than y[0]
    sing=0;
    for (i=1;i<y.length;i++) //check if y has nonzero elements other than 0
      if (y[i]) {
        sing=1;
        break;
      }
    if (!sing) break; //quit when y all zero elements except possibly y[0]

    for (i=x.length;!x[i] && i>=0;i--);  //find most significant element of x
    xp=x[i];
    yp=y[i];
    A=1; B=0; C=0; D=1;
    while ((yp+C) && (yp+D)) {
      q =Math.floor((xp+A)/(yp+C));
      qp=Math.floor((xp+B)/(yp+D));
      if (q!=qp)
        break;
      t= A-q*C;   A=C;   C=t;    //  do (A,B,xp, C,D,yp) = (C,D,yp, A,B,xp) - q*(0,0,0, C,D,yp)
      t= B-q*D;   B=D;   D=t;
      t=xp-q*yp; xp=yp; yp=t;
    }
    if (B) {
      copy_(T,x);
      linComb_(x,y,A,B); //x=A*x+B*y
      linComb_(y,T,D,C); //y=D*y+C*T
    } else {
      mod_(x,y);
      copy_(T,x);
      copy_(x,y);
      copy_(y,T);
    }
  }
  if (y[0]==0)
    return;
  t=modInt(x,y[0]);
  copyInt_(x,y[0]);
  y[0]=t;
  while (y[0]) {
    x[0]%=y[0];
    t=x[0]; x[0]=y[0]; y[0]=t;
  }
}

//do x=x**(-1) mod n, for bigInts x and n.
//If no inverse exists, it sets x to zero and returns 0, else it returns 1.
//The x array must be at least as large as the n array.
function inverseMod_(x,n) {
  var k=1+2*Math.max(x.length,n.length);

  if(!(x[0]&1)  && !(n[0]&1)) {  //if both inputs are even, then inverse doesn't exist
    copyInt_(x,0);
    return 0;
  }

  if (eg_u.length!=k) {
    eg_u=new Array(k);
    eg_v=new Array(k);
    eg_A=new Array(k);
    eg_B=new Array(k);
    eg_C=new Array(k);
    eg_D=new Array(k);
  }

  copy_(eg_u,x);
  copy_(eg_v,n);
  copyInt_(eg_A,1);
  copyInt_(eg_B,0);
  copyInt_(eg_C,0);
  copyInt_(eg_D,1);
  for (;;) {
    while(!(eg_u[0]&1)) {  //while eg_u is even
      halve_(eg_u);
      if (!(eg_A[0]&1) && !(eg_B[0]&1)) { //if eg_A==eg_B==0 mod 2
        halve_(eg_A);
        halve_(eg_B);
      } else {
        add_(eg_A,n);  halve_(eg_A);
        sub_(eg_B,x);  halve_(eg_B);
      }
    }

    while (!(eg_v[0]&1)) {  //while eg_v is even
      halve_(eg_v);
      if (!(eg_C[0]&1) && !(eg_D[0]&1)) { //if eg_C==eg_D==0 mod 2
        halve_(eg_C);
        halve_(eg_D);
      } else {
        add_(eg_C,n);  halve_(eg_C);
        sub_(eg_D,x);  halve_(eg_D);
      }
    }

    if (!greater(eg_v,eg_u)) { //eg_v <= eg_u
      sub_(eg_u,eg_v);
      sub_(eg_A,eg_C);
      sub_(eg_B,eg_D);
    } else {                   //eg_v > eg_u
      sub_(eg_v,eg_u);
      sub_(eg_C,eg_A);
      sub_(eg_D,eg_B);
    }

    if (equalsInt(eg_u,0)) {
      if (negative(eg_C)) //make sure answer is nonnegative
        add_(eg_C,n);
      copy_(x,eg_C);

      if (!equalsInt(eg_v,1)) { //if GCD_(x,n)!=1, then there is no inverse
        copyInt_(x,0);
        return 0;
      }
      return 1;
    }
  }
}

//return x**(-1) mod n, for integers x and n.  Return 0 if there is no inverse
function inverseModInt(x,n) {
  var a=1,b=0,t;
  for (;;) {
    if (x==1) return a;
    if (x==0) return 0;
    b-=a*Math.floor(n/x);
    n%=x;

    if (n==1) return b; //to avoid negatives, change this b to n-b, and each -= to +=
    if (n==0) return 0;
    a-=b*Math.floor(x/n);
    x%=n;
  }
}

//this deprecated function is for backward compatibility only.
function inverseModInt_(x,n) {
   return inverseModInt(x,n);
}


//Given positive bigInts x and y, change the bigints v, a, and b to positive bigInts such that:
//     v = GCD_(x,y) = a*x-b*y
//The bigInts v, a, b, must have exactly as many elements as the larger of x and y.
function eGCD_(x,y,v,a,b) {
  var g=0;
  var k=Math.max(x.length,y.length);
  if (eg_u.length!=k) {
    eg_u=new Array(k);
    eg_A=new Array(k);
    eg_B=new Array(k);
    eg_C=new Array(k);
    eg_D=new Array(k);
  }
  while(!(x[0]&1)  && !(y[0]&1)) {  //while x and y both even
    halve_(x);
    halve_(y);
    g++;
  }
  copy_(eg_u,x);
  copy_(v,y);
  copyInt_(eg_A,1);
  copyInt_(eg_B,0);
  copyInt_(eg_C,0);
  copyInt_(eg_D,1);
  for (;;) {
    while(!(eg_u[0]&1)) {  //while u is even
      halve_(eg_u);
      if (!(eg_A[0]&1) && !(eg_B[0]&1)) { //if A==B==0 mod 2
        halve_(eg_A);
        halve_(eg_B);
      } else {
        add_(eg_A,y);  halve_(eg_A);
        sub_(eg_B,x);  halve_(eg_B);
      }
    }

    while (!(v[0]&1)) {  //while v is even
      halve_(v);
      if (!(eg_C[0]&1) && !(eg_D[0]&1)) { //if C==D==0 mod 2
        halve_(eg_C);
        halve_(eg_D);
      } else {
        add_(eg_C,y);  halve_(eg_C);
        sub_(eg_D,x);  halve_(eg_D);
      }
    }

    if (!greater(v,eg_u)) { //v<=u
      sub_(eg_u,v);
      sub_(eg_A,eg_C);
      sub_(eg_B,eg_D);
    } else {                //v>u
      sub_(v,eg_u);
      sub_(eg_C,eg_A);
      sub_(eg_D,eg_B);
    }
    if (equalsInt(eg_u,0)) {
      if (negative(eg_C)) {   //make sure a (C)is nonnegative
        add_(eg_C,y);
        sub_(eg_D,x);
      }
      multInt_(eg_D,-1);  ///make sure b (D) is nonnegative
      copy_(a,eg_C);
      copy_(b,eg_D);
      leftShift_(v,g);
      return;
    }
  }
}


//is bigInt x negative?
function negative(x) {
  return ((x[x.length-1]>>(bpe-1))&1);
}


//is (x << (shift*bpe)) > y?
//x and y are nonnegative bigInts
//shift is a nonnegative integer
function greaterShift(x,y,shift) {
  var i, kx=x.length, ky=y.length;
  k=((kx+shift)<ky) ? (kx+shift) : ky;
  for (i=ky-1-shift; i<kx && i>=0; i++)
    if (x[i]>0)
      return 1; //if there are nonzeros in x to the left of the first column of y, then x is bigger
  for (i=kx-1+shift; i<ky; i++)
    if (y[i]>0)
      return 0; //if there are nonzeros in y to the left of the first column of x, then x is not bigger
  for (i=k-1; i>=shift; i--)
    if      (x[i-shift]>y[i]) return 1;
    else if (x[i-shift]<y[i]) return 0;
  return 0;
}

//is x > y? (x and y both nonnegative)
function greater(x,y) {
  var i;
  var k=(x.length<y.length) ? x.length : y.length;

  for (i=x.length;i<y.length;i++)
    if (y[i])
      return 0;  //y has more digits

  for (i=y.length;i<x.length;i++)
    if (x[i])
      return 1;  //x has more digits

  for (i=k-1;i>=0;i--)
    if (x[i]>y[i])
      return 1;
    else if (x[i]<y[i])
      return 0;
  return 0;
}

//divide x by y giving quotient q and remainder r.  (q=floor(x/y),  r=x mod y).  All 4 are bigints.
//x must have at least one leading zero element.
//y must be nonzero.
//q and r must be arrays that are exactly the same length as x. (Or q can have more).
//Must have x.length >= y.length >= 2.
function divide_(x,y,q,r) {
  var kx, ky;
  var i,j,y1,y2,c,a,b;
  copy_(r,x);
  for (ky=y.length;y[ky-1]==0;ky--); //ky is number of elements in y, not including leading zeros

  //normalize: ensure the most significant element of y has its highest bit set
  b=y[ky-1];
  for (a=0; b; a++)
    b>>=1;
  a=bpe-a;  //a is how many bits to shift so that the high order bit of y is leftmost in its array element
  leftShift_(y,a);  //multiply both by 1<<a now, then divide both by that at the end
  leftShift_(r,a);

  //Rob Visser discovered a bug: the following line was originally just before the normalization.
  for (kx=r.length;r[kx-1]==0 && kx>ky;kx--); //kx is number of elements in normalized x, not including leading zeros

  copyInt_(q,0);                      // q=0
  while (!greaterShift(y,r,kx-ky)) {  // while (leftShift_(y,kx-ky) <= r) {
    subShift_(r,y,kx-ky);             //   r=r-leftShift_(y,kx-ky)
    q[kx-ky]++;                       //   q[kx-ky]++;
  }                                   // }

  for (i=kx-1; i>=ky; i--) {
    if (r[i]==y[ky-1])
      q[i-ky]=mask;
    else
      q[i-ky]=Math.floor((r[i]*radix+r[i-1])/y[ky-1]);

    //The following for(;;) loop is equivalent to the commented while loop,
    //except that the uncommented version avoids overflow.
    //The commented loop comes from HAC, which assumes r[-1]==y[-1]==0
    //  while (q[i-ky]*(y[ky-1]*radix+y[ky-2]) > r[i]*radix*radix+r[i-1]*radix+r[i-2])
    //    q[i-ky]--;
    for (;;) {
      y2=(ky>1 ? y[ky-2] : 0)*q[i-ky];
      c=y2>>bpe;
      y2=y2 & mask;
      y1=c+q[i-ky]*y[ky-1];
      c=y1>>bpe;
      y1=y1 & mask;

      if (c==r[i] ? y1==r[i-1] ? y2>(i>1 ? r[i-2] : 0) : y1>r[i-1] : c>r[i])
        q[i-ky]--;
      else
        break;
    }

    linCombShift_(r,y,-q[i-ky],i-ky);    //r=r-q[i-ky]*leftShift_(y,i-ky)
    if (negative(r)) {
      addShift_(r,y,i-ky);         //r=r+leftShift_(y,i-ky)
      q[i-ky]--;
    }
  }

  rightShift_(y,a);  //undo the normalization step
  rightShift_(r,a);  //undo the normalization step
}

//do carries and borrows so each element of the bigInt x fits in bpe bits.
function carry_(x) {
  var i,k,c,b;
  k=x.length;
  c=0;
  for (i=0;i<k;i++) {
    c+=x[i];
    b=0;
    if (c<0) {
      b=-(c>>bpe);
      c+=b*radix;
    }
    x[i]=c & mask;
    c=(c>>bpe)-b;
  }
}

//return x mod n for bigInt x and integer n.
function modInt(x,n) {
  var i,c=0;
  for (i=x.length-1; i>=0; i--)
    c=(c*radix+x[i])%n;
  return c;
}

//convert the integer t into a bigInt with at least the given number of bits.
//the returned array stores the bigInt in bpe-bit chunks, little endian (buff[0] is least significant word)
//Pad the array with leading zeros so that it has at least minSize elements.
//There will always be at least one leading 0 element.
function int2bigInt(t,bits,minSize) {
  var i,k;
  k=Math.ceil(bits/bpe)+1;
  k=minSize>k ? minSize : k;
  buff=new Array(k);
  copyInt_(buff,t);
  return buff;
}

//return the bigInt given a string representation in a given base.
//Pad the array with leading zeros so that it has at least minSize elements.
//If base=-1, then it reads in a space-separated list of array elements in decimal.
//The array will always have at least one leading zero, unless base=-1.
function str2bigInt(s,b,minSize) {
  var d, i, j, base, str, x, y, kk;
  if (typeof b === 'string') {
	  base = b.length;
	  str = b;
  } else {
	  base = b;
	  str = digitsStr;
  }
  var k=s.length;
  if (base==-1) { //comma-separated list of array elements in decimal
    x=new Array(0);
    for (;;) {
      y=new Array(x.length+1);
      for (i=0;i<x.length;i++)
        y[i+1]=x[i];
      y[0]=parseInt(s,10);
      x=y;
      d=s.indexOf(',',0);
      if (d<1)
        break;
      s=s.substring(d+1);
      if (s.length==0)
        break;
    }
    if (x.length<minSize) {
      y=new Array(minSize);
      copy_(y,x);
      return y;
    }
    return x;
  }

  x=int2bigInt(0,base*k,0);
  for (i=0;i<k;i++) {
    d=str.indexOf(s.substring(i,i+1),0);
//    if (base<=36 && d>=36)  //convert lowercase to uppercase if base<=36
//      d-=26;
    if (d>=base || d<0) {   //ignore illegal characters
      continue;
    }
    multInt_(x,base);
    addInt_(x,d);
  }

  for (k=x.length;k>0 && !x[k-1];k--); //strip off leading zeros
  k=minSize>k+1 ? minSize : k+1;
  y=new Array(k);
  kk=k<x.length ? k : x.length;
  for (i=0;i<kk;i++)
    y[i]=x[i];
  for (;i<k;i++)
    y[i]=0;
  return y;
}

//is bigint x equal to integer y?
//y must have less than bpe bits
function equalsInt(x,y) {
  var i;
  if (x[0]!=y)
    return 0;
  for (i=1;i<x.length;i++)
    if (x[i])
      return 0;
  return 1;
}

//are bigints x and y equal?
//this works even if x and y are different lengths and have arbitrarily many leading zeros
function equals(x,y) {
  var i;
  var k=x.length<y.length ? x.length : y.length;
  for (i=0;i<k;i++)
    if (x[i]!=y[i])
      return 0;
  if (x.length>y.length) {
    for (;i<x.length;i++)
      if (x[i])
        return 0;
  } else {
    for (;i<y.length;i++)
      if (y[i])
        return 0;
  }
  return 1;
}

//is the bigInt x equal to zero?
function isZero(x) {
  var i;
  for (i=0;i<x.length;i++)
    if (x[i])
      return 0;
  return 1;
}

//convert a bigInt into a string in a given base, from base 2 up to base 95.
//Base -1 prints the contents of the array representing the number.
function bigInt2str(x,b) {
  var i,t,base,str,s="";
  if (typeof b === 'string') {
	  base = b.length;
	  str = b;
  } else {
	  base = b;
	  str = digitsStr;
  }

  if (s6.length!=x.length)
    s6=dup(x);
  else
    copy_(s6,x);

  if (base==-1) { //return the list of array contents
    for (i=x.length-1;i>0;i--)
      s+=x[i]+',';
    s+=x[0];
  }
  else { //return it in the given base
    while (!isZero(s6)) {
      t=divInt_(s6,base);  //t=s6 % base; s6=floor(s6/base);
      s=str.substring(t,t+1)+s;
    }
  }
  if (s.length==0)
    s=str[0];
  return s;
}

//returns a duplicate of bigInt x
function dup(x) {
  var i;
  buff=new Array(x.length);
  copy_(buff,x);
  return buff;
}

//do x=y on bigInts x and y.  x must be an array at least as big as y (not counting the leading zeros in y).
function copy_(x,y) {
  var i;
  var k=x.length<y.length ? x.length : y.length;
  for (i=0;i<k;i++)
    x[i]=y[i];
  for (i=k;i<x.length;i++)
    x[i]=0;
}

//do x=y on bigInt x and integer y.
function copyInt_(x,n) {
  var i,c;
  for (c=n,i=0;i<x.length;i++) {
    x[i]=c & mask;
    c>>=bpe;
  }
}

//do x=x+n where x is a bigInt and n is an integer.
//x must be large enough to hold the result.
function addInt_(x,n) {
  var i,k,c,b;
  x[0]+=n;
  k=x.length;
  c=0;
  for (i=0;i<k;i++) {
    c+=x[i];
    b=0;
    if (c<0) {
      b=-(c>>bpe);
      c+=b*radix;
    }
    x[i]=c & mask;
    c=(c>>bpe)-b;
    if (!c) return; //stop carrying as soon as the carry is zero
  }
}

//right shift bigInt x by n bits.  0 <= n < bpe.
function rightShift_(x,n) {
  var i;
  var k=Math.floor(n/bpe);
  if (k) {
    for (i=0;i<x.length-k;i++) //right shift x by k elements
      x[i]=x[i+k];
    for (;i<x.length;i++)
      x[i]=0;
    n%=bpe;
  }
  for (i=0;i<x.length-1;i++) {
    x[i]=mask & ((x[i+1]<<(bpe-n)) | (x[i]>>n));
  }
  x[i]>>=n;
}

//do x=floor(|x|/2)*sgn(x) for bigInt x in 2's complement
function halve_(x) {
  var i;
  for (i=0;i<x.length-1;i++) {
    x[i]=mask & ((x[i+1]<<(bpe-1)) | (x[i]>>1));
  }
  x[i]=(x[i]>>1) | (x[i] & (radix>>1));  //most significant bit stays the same
}

//left shift bigInt x by n bits.
function leftShift_(x,n) {
  var i;
  var k=Math.floor(n/bpe);
  if (k) {
    for (i=x.length; i>=k; i--) //left shift x by k elements
      x[i]=x[i-k];
    for (;i>=0;i--)
      x[i]=0;
    n%=bpe;
  }
  if (!n)
    return;
  for (i=x.length-1;i>0;i--) {
    x[i]=mask & ((x[i]<<n) | (x[i-1]>>(bpe-n)));
  }
  x[i]=mask & (x[i]<<n);
}

//do x=x*n where x is a bigInt and n is an integer.
//x must be large enough to hold the result.
function multInt_(x,n) {
  var i,k,c,b;
  if (!n)
    return;
  k=x.length;
  c=0;
  for (i=0;i<k;i++) {
    c+=x[i]*n;
    b=0;
    if (c<0) {
      b=-(c>>bpe);
      c+=b*radix;
    }
    x[i]=c & mask;
    c=(c>>bpe)-b;
  }
}

//do x=floor(x/n) for bigInt x and integer n, and return the remainder
function divInt_(x,n) {
  var i,r=0,s;
  for (i=x.length-1;i>=0;i--) {
    s=r*radix+x[i];
    x[i]=Math.floor(s/n);
    r=s%n;
  }
  return r;
}

//do the linear combination x=a*x+b*y for bigInts x and y, and integers a and b.
//x must be large enough to hold the answer.
function linComb_(x,y,a,b) {
  var i,c,k,kk;
  k=x.length<y.length ? x.length : y.length;
  kk=x.length;
  for (c=0,i=0;i<k;i++) {
    c+=a*x[i]+b*y[i];
    x[i]=c & mask;
    c>>=bpe;
  }
  for (i=k;i<kk;i++) {
    c+=a*x[i];
    x[i]=c & mask;
    c>>=bpe;
  }
}

//do the linear combination x=a*x+b*(y<<(ys*bpe)) for bigInts x and y, and integers a, b and ys.
//x must be large enough to hold the answer.
function linCombShift_(x,y,b,ys) {
  var i,c,k,kk;
  k=x.length<ys+y.length ? x.length : ys+y.length;
  kk=x.length;
  for (c=0,i=ys;i<k;i++) {
    c+=x[i]+b*y[i-ys];
    x[i]=c & mask;
    c>>=bpe;
  }
  for (i=k;c && i<kk;i++) {
    c+=x[i];
    x[i]=c & mask;
    c>>=bpe;
  }
}

//do x=x+(y<<(ys*bpe)) for bigInts x and y, and integers a,b and ys.
//x must be large enough to hold the answer.
function addShift_(x,y,ys) {
  var i,c,k,kk;
  k=x.length<ys+y.length ? x.length : ys+y.length;
  kk=x.length;
  for (c=0,i=ys;i<k;i++) {
    c+=x[i]+y[i-ys];
    x[i]=c & mask;
    c>>=bpe;
  }
  for (i=k;c && i<kk;i++) {
    c+=x[i];
    x[i]=c & mask;
    c>>=bpe;
  }
}

//do x=x-(y<<(ys*bpe)) for bigInts x and y, and integers a,b and ys.
//x must be large enough to hold the answer.
function subShift_(x,y,ys) {
  var i,c,k,kk;
  k=x.length<ys+y.length ? x.length : ys+y.length;
  kk=x.length;
  for (c=0,i=ys;i<k;i++) {
    c+=x[i]-y[i-ys];
    x[i]=c & mask;
    c>>=bpe;
  }
  for (i=k;c && i<kk;i++) {
    c+=x[i];
    x[i]=c & mask;
    c>>=bpe;
  }
}

//do x=x-y for bigInts x and y.
//x must be large enough to hold the answer.
//negative answers will be 2s complement
function sub_(x,y) {
  var i,c,k,kk;
  k=x.length<y.length ? x.length : y.length;
  for (c=0,i=0;i<k;i++) {
    c+=x[i]-y[i];
    x[i]=c & mask;
    c>>=bpe;
  }
  for (i=k;c && i<x.length;i++) {
    c+=x[i];
    x[i]=c & mask;
    c>>=bpe;
  }
}

//do x=x+y for bigInts x and y.
//x must be large enough to hold the answer.
function add_(x,y) {
  var i,c,k,kk;
  k=x.length<y.length ? x.length : y.length;
  for (c=0,i=0;i<k;i++) {
    c+=x[i]+y[i];
    x[i]=c & mask;
    c>>=bpe;
  }
  for (i=k;c && i<x.length;i++) {
    c+=x[i];
    x[i]=c & mask;
    c>>=bpe;
  }
}

//do x=x*y for bigInts x and y.  This is faster when y<x.
function mult_(x,y) {
  var i;
  if (ss.length!=2*x.length)
    ss=new Array(2*x.length);
  copyInt_(ss,0);
  for (i=0;i<y.length;i++)
    if (y[i])
      linCombShift_(ss,x,y[i],i);   //ss=1*ss+y[i]*(x<<(i*bpe))
  copy_(x,ss);
}

//do x=x mod n for bigInts x and n.
function mod_(x,n) {
  if (s4.length!=x.length)
    s4=dup(x);
  else
    copy_(s4,x);
  if (s5.length!=x.length)
    s5=dup(x);
  divide_(s4,n,s5,x);  //x = remainder of s4 / n
}

//do x=x*y mod n for bigInts x,y,n.
//for greater speed, let y<x.
function multMod_(x,y,n) {
  var i;
  if (s0.length!=2*x.length)
    s0=new Array(2*x.length);
  copyInt_(s0,0);
  for (i=0;i<y.length;i++)
    if (y[i])
      linCombShift_(s0,x,y[i],i);   //s0=1*s0+y[i]*(x<<(i*bpe))
  mod_(s0,n);
  copy_(x,s0);
}

//do x=x*x mod n for bigInts x,n.
function squareMod_(x,n) {
  var i,j,d,c,kx,kn,k;
  for (kx=x.length; kx>0 && !x[kx-1]; kx--);  //ignore leading zeros in x
  k=kx>n.length ? 2*kx : 2*n.length; //k=# elements in the product, which is twice the elements in the larger of x and n
  if (s0.length!=k)
    s0=new Array(k);
  copyInt_(s0,0);
  for (i=0;i<kx;i++) {
    c=s0[2*i]+x[i]*x[i];
    s0[2*i]=c & mask;
    c>>=bpe;
    for (j=i+1;j<kx;j++) {
      c=s0[i+j]+2*x[i]*x[j]+c;
      s0[i+j]=(c & mask);
      c>>=bpe;
    }
    s0[i+kx]=c;
  }
  mod_(s0,n);
  copy_(x,s0);
}

//return x with exactly k leading zero elements
function trim(x,k) {
  var i,y;
  for (i=x.length; i>0 && !x[i-1]; i--);
  y=new Array(i+k);
  copy_(y,x);
  return y;
}

//do x=x**y mod n, where x,y,n are bigInts and ** is exponentiation.  0**0=1.
//this is faster when n is odd.  x usually needs to have as many elements as n.
function powMod_(x,y,n) {
  var k1,k2,kn,np;
  if(s7.length!=n.length)
    s7=dup(n);

  //for even modulus, use a simple square-and-multiply algorithm,
  //rather than using the more complex Montgomery algorithm.
  if ((n[0]&1)==0) {
    copy_(s7,x);
    copyInt_(x,1);
    while(!equalsInt(y,0)) {
      if (y[0]&1)
        multMod_(x,s7,n);
      divInt_(y,2);
      squareMod_(s7,n);
    }
    return;
  }

  //calculate np from n for the Montgomery multiplications
  copyInt_(s7,0);
  for (kn=n.length;kn>0 && !n[kn-1];kn--);
  np=radix-inverseModInt(modInt(n,radix),radix);
  s7[kn]=1;
  multMod_(x ,s7,n);   // x = x * 2**(kn*bp) mod n

  if (s3.length!=x.length)
    s3=dup(x);
  else
    copy_(s3,x);

  for (k1=y.length-1;k1>0 & !y[k1]; k1--);  //k1=first nonzero element of y
  if (y[k1]==0) {  //anything to the 0th power is 1
    copyInt_(x,1);
    return;
  }
  for (k2=1<<(bpe-1);k2 && !(y[k1] & k2); k2>>=1);  //k2=position of first 1 bit in y[k1]
  for (;;) {
    if (!(k2>>=1)) {  //look at next bit of y
      k1--;
      if (k1<0) {
        mont_(x,one,n,np);
        return;
      }
      k2=1<<(bpe-1);
    }
    mont_(x,x,n,np);

    if (k2 & y[k1]) //if next bit is a 1
      mont_(x,s3,n,np);
  }
}


//do x=x*y*Ri mod n for bigInts x,y,n,
//  where Ri = 2**(-kn*bpe) mod n, and kn is the
//  number of elements in the n array, not
//  counting leading zeros.
//x array must have at least as many elemnts as the n array
//It's OK if x and y are the same variable.
//must have:
//  x,y < n
//  n is odd
//  np = -(n^(-1)) mod radix
function mont_(x,y,n,np) {
  var i,j,c,ui,t,ks;
  var kn=n.length;
  var ky=y.length;

  if (sa.length!=kn)
    sa=new Array(kn);

  copyInt_(sa,0);

  for (;kn>0 && n[kn-1]==0;kn--); //ignore leading zeros of n
  for (;ky>0 && y[ky-1]==0;ky--); //ignore leading zeros of y
  ks=sa.length-1; //sa will never have more than this many nonzero elements.

  //the following loop consumes 95% of the runtime for randTruePrime_() and powMod_() for large numbers
  for (i=0; i<kn; i++) {
    t=sa[0]+x[i]*y[0];
    ui=((t & mask) * np) & mask;  //the inner "& mask" was needed on Safari (but not MSIE) at one time
    c=(t+ui*n[0]) >> bpe;
    t=x[i];

    //do sa=(sa+x[i]*y+ui*n)/b   where b=2**bpe.  Loop is unrolled 5-fold for speed
    j=1;
    for (;j<ky-4;) { c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++;
                     c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++;
                     c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++;
                     c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++;
                     c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++; }
    for (;j<ky;)   { c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++; }
    for (;j<kn-4;) { c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++;
                     c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++;
                     c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++;
                     c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++;
                     c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++; }
    for (;j<kn;)   { c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++; }
    for (;j<ks;)   { c+=sa[j];                  sa[j-1]=c & mask;   c>>=bpe;   j++; }
    sa[j-1]=c & mask;
  }

  if (!greater(n,sa))
    sub_(sa,n);
  copy_(x,sa);
}

if (typeof module === 'undefined') {
	module = {};
}
BigInt = module.exports = {
	'add': add, 'addInt': addInt, 'bigInt2str': bigInt2str, 'bitSize': bitSize,
	'dup': dup, 'equals': equals, 'equalsInt': equalsInt, 'expand': expand,
	'findPrimes': findPrimes, 'GCD': GCD, 'greater': greater,
	'greaterShift': greaterShift, 'int2bigInt': int2bigInt,
	'inverseMod': inverseMod, 'inverseModInt': inverseModInt, 'isZero': isZero,
	'millerRabin': millerRabin, 'millerRabinInt': millerRabinInt, 'mod': mod,
	'modInt': modInt, 'mult': mult, 'multMod': multMod, 'negative': negative,
	'powMod': powMod, 'randBigInt': randBigInt, 'randTruePrime': randTruePrime,
	'randProbPrime': randProbPrime, 'str2bigInt': str2bigInt, 'sub': sub,
	'trim': trim, 'addInt_': addInt_, 'add_': add_, 'copy_': copy_,
	'copyInt_': copyInt_, 'GCD_': GCD_, 'inverseMod_': inverseMod_, 'mod_': mod_,
	'mult_': mult_, 'multMod_': multMod_, 'powMod_': powMod_,
	'randBigInt_': randBigInt_, 'randTruePrime_': randTruePrime_, 'sub_': sub_,
	'addShift_': addShift_, 'carry_': carry_, 'divide_': divide_,
	'divInt_': divInt_, 'eGCD_': eGCD_, 'halve_': halve_, 'leftShift_': leftShift_,
	'linComb_': linComb_, 'linCombShift_': linCombShift_, 'mont_': mont_,
	'multInt_': multInt_, 'rightShift_': rightShift_, 'squareMod_': squareMod_,
	'subShift_': subShift_, 'powMod_': powMod_, 'eGCD_': eGCD_,
	'inverseMod_': inverseMod_, 'GCD_': GCD_, 'mont_': mont_, 'divide_': divide_,
	'squareMod_': squareMod_, 'randTruePrime_': randTruePrime_,
	'millerRabin': millerRabin
};

})();

},{}],13:[function(require,module,exports){
module.exports = Peer

var debug = require('debug')('simple-peer')
var EventEmitter = require('events').EventEmitter
var extend = require('extend.js')
var hat = require('hat')
var inherits = require('inherits')
var isTypedArray = require('is-typedarray')
var once = require('once')
var stream = require('stream')
var toBuffer = require('typedarray-to-buffer')

var RTCPeerConnection = typeof window !== 'undefined' &&
    (window.mozRTCPeerConnection
  || window.RTCPeerConnection
  || window.webkitRTCPeerConnection)

var RTCSessionDescription = typeof window !== 'undefined' &&
    (window.mozRTCSessionDescription
  || window.RTCSessionDescription
  || window.webkitRTCSessionDescription)

var RTCIceCandidate = typeof window !== 'undefined' &&
    (window.mozRTCIceCandidate
  || window.RTCIceCandidate
  || window.webkitRTCIceCandidate)

inherits(Peer, EventEmitter)

/**
 * A WebRTC peer connection.
 * @param {Object} opts
 */
function Peer (opts) {
  if (!(this instanceof Peer)) return new Peer(opts)
  EventEmitter.call(this)

  opts = extend({
    initiator: false,
    stream: false,
    config: Peer.config,
    constraints: Peer.constraints,
    channelName: (opts && opts.initiator) ? hat(160) : null,
    trickle: true
  }, opts)

  extend(this, opts)

  debug('new peer initiator: %s channelName: %s', this.initiator, this.channelName)

  this.destroyed = false
  this.ready = false
  this._pcReady = false
  this._channelReady = false
  this._dataStreams = []
  this._iceComplete = false // done with ice candidate trickle (got null candidate)

  this._pc = new RTCPeerConnection(this.config, this.constraints)
  this._pc.oniceconnectionstatechange = this._onIceConnectionStateChange.bind(this)
  this._pc.onsignalingstatechange = this._onSignalingStateChange.bind(this)
  this._pc.onicecandidate = this._onIceCandidate.bind(this)

  this._channel = null

  if (this.stream)
    this._setupVideo(this.stream)

  if (this.initiator) {
    this._setupData({ channel: this._pc.createDataChannel(this.channelName) })

    this._pc.onnegotiationneeded = once(function () {
      this._pc.createOffer(function (offer) {
        this._pc.setLocalDescription(offer)
        var sendOffer = function () {
          this.emit('signal', this._pc.localDescription || offer)
        }.bind(this)
        if (this.trickle || this._iceComplete) sendOffer()
        else this.once('_iceComplete', sendOffer) // wait for candidates
      }.bind(this), this._onError.bind(this))
    }.bind(this))

    if (window.mozRTCPeerConnection) {
      // Firefox does not trigger this event automatically
      setTimeout(this._pc.onnegotiationneeded.bind(this._pc), 0)
    }
  } else {
    this._pc.ondatachannel = this._setupData.bind(this)
  }
}

/**
 * Expose config and constraints for overriding all Peer instances. Otherwise, just
 * set opts.config and opts.constraints when constructing a Peer.
 */
Peer.config = { iceServers: [ { url: 'stun:23.21.150.121' } ] }
Peer.constraints = {}

Peer.prototype.send = function (data, cb) {
  if (!this._channelReady) return this.once('ready', this.send.bind(this, data, cb))
  debug('send %s', data)

  if (isTypedArray.strict(data) || data instanceof ArrayBuffer ||
      data instanceof Blob || typeof data === 'string') {
    this._channel.send(data)
  } else {
    this._channel.send(JSON.stringify(data))
  }
  if (cb) cb(null)
}

Peer.prototype.signal = function (data) {
  if (this.destroyed) return
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch (err) {
      data = {}
    }
  }
  debug('signal %s', JSON.stringify(data))
  if (data.sdp) {
    this._pc.setRemoteDescription(new RTCSessionDescription(data), function () {
      var needsAnswer = this._pc.remoteDescription.type === 'offer'
      if (needsAnswer) {
        this._pc.createAnswer(function (answer) {
          this._pc.setLocalDescription(answer)
          var sendAnswer = function () {
            this.emit('signal', this._pc.localDescription || answer)
          }.bind(this)
          if (this.trickle || this._iceComplete) sendAnswer()
          else this.once('_iceComplete', sendAnswer)
        }.bind(this), this._onError.bind(this))
      }
    }.bind(this), this._onError.bind(this))
  }
  if (data.candidate) {
    try {
      this._pc.addIceCandidate(new RTCIceCandidate(data.candidate))
    } catch (err) {
      this.destroy(new Error('error adding candidate, ' + err.message))
    }
  }
  if (!data.sdp && !data.candidate)
    this.destroy(new Error('signal() called with invalid signal data'))
}

Peer.prototype.destroy = function (err, onclose) {
  if (this.destroyed) return
  debug('destroy (error: %s)', err && err.message)
  this.destroyed = true
  this.ready = false

  if (typeof err === 'function') {
    onclose = err
    err = null
  }

  if (onclose) this.once('close', onclose)

  if (this._pc) {
    try {
      this._pc.close()
    } catch (err) {}

    this._pc.oniceconnectionstatechange = null
    this._pc.onsignalingstatechange = null
    this._pc.onicecandidate = null
  }

  if (this._channel) {
    try {
      this._channel.close()
    } catch (err) {}

    this._channel.onmessage = null
    this._channel.onopen = null
    this._channel.onclose = null
  }
  this._pc = null
  this._channel = null

  this._dataStreams.forEach(function (stream) {
    if (err) stream.emit('error', err)
    if (!stream._readableState.ended) stream.push(null)
    if (!stream._writableState.finished) stream.end()
  })
  this._dataStreams = []

  if (err) this.emit('error', err)
  this.emit('close')
}

Peer.prototype.getDataStream = function (opts) {
  if (this.destroyed) throw new Error('peer is destroyed')
  var dataStream = new DataStream(extend({ _peer: this }, opts))
  this._dataStreams.push(dataStream)
  return dataStream
}

Peer.prototype._setupData = function (event) {
  this._channel = event.channel
  this.channelName = this._channel.label

  this._channel.binaryType = 'arraybuffer'
  this._channel.onmessage = this._onChannelMessage.bind(this)
  this._channel.onopen = this._onChannelOpen.bind(this)
  this._channel.onclose = this._onChannelClose.bind(this)
}

Peer.prototype._setupVideo = function (stream) {
  this._pc.addStream(stream)
  this._pc.onaddstream = this._onAddStream.bind(this)
}

Peer.prototype._onIceConnectionStateChange = function () {
  var iceGatheringState = this._pc.iceGatheringState
  var iceConnectionState = this._pc.iceConnectionState
  this.emit('iceConnectionStateChange', iceGatheringState, iceConnectionState)
  debug('iceConnectionStateChange %s %s', iceGatheringState, iceConnectionState)
  if (iceConnectionState === 'connected' || iceConnectionState === 'completed') {
    this._pcReady = true
    this._maybeReady()
  }
  if (iceConnectionState === 'disconnected' || iceConnectionState === 'closed')
    this.destroy()
}

Peer.prototype._maybeReady = function () {
  debug('maybeReady pc %s channel %s', this._pcReady, this._channelReady)
  if (!this.ready && this._pcReady && this._channelReady) {
    debug('ready')
    this.ready = true
    this.emit('ready')
  }
}

Peer.prototype._onSignalingStateChange = function () {
  this.emit('signalingStateChange', this._pc.signalingState)
  debug('signalingStateChange %s', this._pc.signalingState)
}

Peer.prototype._onIceCandidate = function (event) {
  if (event.candidate && this.trickle) {
    this.emit('signal', { candidate: event.candidate })
  } else if (!event.candidate) {
    this._iceComplete = true
    this.emit('_iceComplete')
  }
}

Peer.prototype._onChannelMessage = function (event) {
  if (this.destroyed) return
  var data = event.data
  debug('receive %s', data)

  if (data instanceof ArrayBuffer) {
    data = toBuffer(new Uint8Array(data))
    this.emit('message', data)
  } else {
    try {
      this.emit('message', JSON.parse(data))
    } catch (err) {
      this.emit('message', data)
    }
  }
  this._dataStreams.forEach(function (stream) {
    stream.push(data)
  })
}

Peer.prototype._onChannelOpen = function () {
  this._channelReady = true
  this._maybeReady()
}

Peer.prototype._onChannelClose = function () {
  this._channelReady = false
  this.destroy()
}

Peer.prototype._onAddStream = function (event) {
  this.emit('stream', event.stream)
}

Peer.prototype._onError = function (err) {
  debug('error %s', err.message)
  this.destroy(err)
}

// Duplex Stream for data channel

inherits(DataStream, stream.Duplex)

function DataStream (opts) {
  stream.Duplex.call(this, opts)
  this._peer = opts._peer
  debug('new stream')
}

DataStream.prototype.destroy = function () {
  this._peer.destroy()
}

DataStream.prototype._read = function () {}

DataStream.prototype._write = function (chunk, encoding, cb) {
  this._peer.send(chunk, cb)
}

},{"debug":14,"events":28,"extend.js":17,"hat":18,"inherits":19,"is-typedarray":20,"once":22,"stream":43,"typedarray-to-buffer":23}],14:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // This hackery is required for IE8,
  // where the `console.log` function doesn't have 'apply'
  return 'object' == typeof console
    && 'function' == typeof console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      localStorage.removeItem('debug');
    } else {
      localStorage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = localStorage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

},{"./debug":15}],15:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":16}],16:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  var match = /^((?:\d+)?\.?\d+) *(ms|seconds?|s|minutes?|m|hours?|h|days?|d|years?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 's':
      return n * s;
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],17:[function(require,module,exports){
/**
 * Extend an object with another.
 *
 * @param {Object, ...} src, ...
 * @return {Object} merged
 * @api private
 */

module.exports = function(src) {
  var objs = [].slice.call(arguments, 1), obj;

  for (var i = 0, len = objs.length; i < len; i++) {
    obj = objs[i];
    for (var prop in obj) {
      src[prop] = obj[prop];
    }
  }

  return src;
}

},{}],18:[function(require,module,exports){
var hat = module.exports = function (bits, base) {
    if (!base) base = 16;
    if (bits === undefined) bits = 128;
    if (bits <= 0) return '0';
    
    var digits = Math.log(Math.pow(2, bits)) / Math.log(base);
    for (var i = 2; digits === Infinity; i *= 2) {
        digits = Math.log(Math.pow(2, bits / i)) / Math.log(base) * i;
    }
    
    var rem = digits - Math.floor(digits);
    
    var res = '';
    
    for (var i = 0; i < Math.floor(digits); i++) {
        var x = Math.floor(Math.random() * base).toString(base);
        res = x + res;
    }
    
    if (rem) {
        var b = Math.pow(base, rem);
        var x = Math.floor(Math.random() * b).toString(base);
        res = x + res;
    }
    
    var parsed = parseInt(res, base);
    if (parsed !== Infinity && parsed >= Math.pow(2, bits)) {
        return hat(bits, base)
    }
    else return res;
};

hat.rack = function (bits, base, expandBy) {
    var fn = function (data) {
        var iters = 0;
        do {
            if (iters ++ > 10) {
                if (expandBy) bits += expandBy;
                else throw new Error('too many ID collisions, use more bits')
            }
            
            var id = hat(bits, base);
        } while (Object.hasOwnProperty.call(hats, id));
        
        hats[id] = data;
        return id;
    };
    var hats = fn.hats = {};
    
    fn.get = function (id) {
        return fn.hats[id];
    };
    
    fn.set = function (id, value) {
        fn.hats[id] = value;
        return fn;
    };
    
    fn.bits = bits || 128;
    fn.base = base || 16;
    return fn;
};

},{}],19:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],20:[function(require,module,exports){
module.exports      = isTypedArray
isTypedArray.strict = isStrictTypedArray
isTypedArray.loose  = isLooseTypedArray

var toString = Object.prototype.toString
var names = {
    '[object Int8Array]': true
  , '[object Int16Array]': true
  , '[object Int32Array]': true
  , '[object Uint8Array]': true
  , '[object Uint16Array]': true
  , '[object Uint32Array]': true
  , '[object Float32Array]': true
  , '[object Float64Array]': true
}

function isTypedArray(arr) {
  return (
       isStrictTypedArray(arr)
    || isLooseTypedArray(arr)
  )
}

function isStrictTypedArray(arr) {
  return (
       arr instanceof Int8Array
    || arr instanceof Int16Array
    || arr instanceof Int32Array
    || arr instanceof Uint8Array
    || arr instanceof Uint16Array
    || arr instanceof Uint32Array
    || arr instanceof Float32Array
    || arr instanceof Float64Array
  )
}

function isLooseTypedArray(arr) {
  return names[toString.call(arr)]
}

},{}],21:[function(require,module,exports){
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}

},{}],22:[function(require,module,exports){
var wrappy = require('wrappy')
module.exports = wrappy(once)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

},{"wrappy":21}],23:[function(require,module,exports){
(function (Buffer){
/**
 * Convert a typed array to a Buffer without a copy
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install typedarray-to-buffer`
 */

module.exports = function (arr) {
  if (typeof Buffer._augment === 'function' && Buffer.TYPED_ARRAY_SUPPORT) {
    // If `Buffer` is from the `buffer` module and this browser supports typed arrays,
    // then augment it with all the `Buffer` methods.
    return Buffer._augment(arr)
  } else {
    // Otherwise, fallback to creating a `Buffer` with a copy.
    return new Buffer(arr)
  }
}

}).call(this,require("buffer").Buffer)
},{"buffer":24}],24:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number')
    length = subject > 0 ? subject >>> 0 : 0
  else if (type === 'string') {
    if (encoding === 'base64')
      subject = base64clean(subject)
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new TypeError('must start with number, buffer, array or string')

  if (this.length > kMaxLength)
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
      'size: 0x' + kMaxLength.toString(16) + ' bytes')

  var buf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
    throw new TypeError('Arguments must be Buffers')

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase)
          throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function (b) {
  if(!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max)
      str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0)
    throw new RangeError('offset is not uint')
  if (offset + ext > length)
    throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80))
    return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  if (end < start) throw new TypeError('sourceEnd < sourceStart')
  if (target_start < 0 || target_start >= target.length)
    throw new TypeError('targetStart out of bounds')
  if (start < 0 || start >= source.length) throw new TypeError('sourceStart out of bounds')
  if (end < 0 || end > source.length) throw new TypeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new TypeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new TypeError('start out of bounds')
  if (end < 0 || end > this.length) throw new TypeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":25,"ieee754":26,"is-array":27}],25:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],26:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],27:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],28:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],29:[function(require,module,exports){
module.exports=require(19)
},{"/Users/chat-wane/Desktop/project/SCAMPjs/node_modules/simple-peer/node_modules/inherits/inherits_browser.js":19}],30:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],31:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],32:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":33}],33:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

}).call(this,require('_process'))
},{"./_stream_readable":35,"./_stream_writable":37,"_process":31,"core-util-is":38,"inherits":29}],34:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":36,"core-util-is":38,"inherits":29}],35:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = false;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // In streams that never have any data, and do push(null) right away,
  // the consumer can miss the 'end' event if they do some I/O before
  // consuming the stream.  So, we don't emit('end') until some reading
  // happens.
  this.calledRead = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (typeof chunk === 'string' && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null || chunk === undefined) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      // update the buffer info.
      state.length += state.objectMode ? 1 : chunk.length;
      if (addToFront) {
        state.buffer.unshift(chunk);
      } else {
        state.reading = false;
        state.buffer.push(chunk);
      }

      if (state.needReadable)
        emitReadable(stream);

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  var state = this._readableState;
  state.calledRead = true;
  var nOrig = n;
  var ret;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    ret = null;

    // In cases where the decoder did not receive enough data
    // to produce a full chunk, then immediately received an
    // EOF, state.buffer will contain [<Buffer >, <Buffer 00 ...>].
    // howMuchToRead will see this and coerce the amount to
    // read to zero (because it's looking at the length of the
    // first <Buffer > in state.buffer), and we'll end up here.
    //
    // This can only happen via state.decoder -- no other venue
    // exists for pushing a zero-length chunk into state.buffer
    // and triggering this behavior. In this case, we return our
    // remaining data and end the stream, if appropriate.
    if (state.length > 0 && state.decoder) {
      ret = fromList(n, state);
      state.length -= ret.length;
    }

    if (state.length === 0)
      endReadable(this);

    return ret;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;

  // if we currently have less than the highWaterMark, then also read some
  if (state.length - n <= state.highWaterMark)
    doRead = true;

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading)
    doRead = false;

  if (doRead) {
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read called its callback synchronously, then `reading`
  // will be false, and we need to re-evaluate how much data we
  // can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we happened to read() exactly the remaining amount in the
  // buffer, and the EOF has been seen at this point, then make sure
  // that we emit 'end' on the very next tick.
  if (state.ended && !state.endEmitted && state.length === 0)
    endReadable(this);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // if we've ended and we have some data left, then emit
  // 'readable' now to make sure it gets picked up.
  if (state.length > 0)
    emitReadable(stream);
  else
    endReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (state.emittedReadable)
    return;

  state.emittedReadable = true;
  if (state.sync)
    process.nextTick(function() {
      emitReadable_(stream);
    });
  else
    emitReadable_(stream);
}

function emitReadable_(stream) {
  stream.emit('readable');
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    if (readable !== src) return;
    cleanup();
  }

  function onend() {
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (!dest._writableState || dest._writableState.needDrain)
      ondrain();
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    // the handler that waits for readable events after all
    // the data gets sucked out in flow.
    // This would be easier to follow with a .once() handler
    // in flow(), but that is too slow.
    this.on('readable', pipeOnReadable);

    state.flowing = true;
    process.nextTick(function() {
      flow(src);
    });
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var dest = this;
    var state = src._readableState;
    state.awaitDrain--;
    if (state.awaitDrain === 0)
      flow(src);
  };
}

function flow(src) {
  var state = src._readableState;
  var chunk;
  state.awaitDrain = 0;

  function write(dest, i, list) {
    var written = dest.write(chunk);
    if (false === written) {
      state.awaitDrain++;
    }
  }

  while (state.pipesCount && null !== (chunk = src.read())) {

    if (state.pipesCount === 1)
      write(state.pipes, 0, null);
    else
      forEach(state.pipes, write);

    src.emit('data', chunk);

    // if anyone needs a drain, then we have to wait for that.
    if (state.awaitDrain > 0)
      return;
  }

  // if every destination was unpiped, either before entering this
  // function, or in the while loop, then stop flowing.
  //
  // NB: This is a pretty rare edge case.
  if (state.pipesCount === 0) {
    state.flowing = false;

    // if there were data event listeners added, then switch to old mode.
    if (EE.listenerCount(src, 'data') > 0)
      emitDataEvents(src);
    return;
  }

  // at this point, no one needed a drain, so we just ran out of data
  // on the next readable event, start it over again.
  state.ranOut = true;
}

function pipeOnReadable() {
  if (this._readableState.ranOut) {
    this._readableState.ranOut = false;
    flow(this);
  }
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data' && !this._readableState.flowing)
    emitDataEvents(this);

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        this.read(0);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  emitDataEvents(this);
  this.read(0);
  this.emit('resume');
};

Readable.prototype.pause = function() {
  emitDataEvents(this, true);
  this.emit('pause');
};

function emitDataEvents(stream, startPaused) {
  var state = stream._readableState;

  if (state.flowing) {
    // https://github.com/isaacs/readable-stream/issues/16
    throw new Error('Cannot switch to old mode now.');
  }

  var paused = startPaused || false;
  var readable = false;

  // convert to an old-style stream.
  stream.readable = true;
  stream.pipe = Stream.prototype.pipe;
  stream.on = stream.addListener = Stream.prototype.on;

  stream.on('readable', function() {
    readable = true;

    var c;
    while (!paused && (null !== (c = stream.read())))
      stream.emit('data', c);

    if (c === null) {
      readable = false;
      stream._readableState.needReadable = true;
    }
  });

  stream.pause = function() {
    paused = true;
    this.emit('pause');
  };

  stream.resume = function() {
    paused = false;
    if (readable)
      process.nextTick(function() {
        stream.emit('readable');
      });
    else
      this.read(0);
    this.emit('resume');
  };

  // now make it start, just in case it hadn't already.
  stream.emit('readable');
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    if (state.decoder)
      chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    //if (state.objectMode && util.isNullOrUndefined(chunk))
    if (state.objectMode && (chunk === null || chunk === undefined))
      return;
    else if (!state.objectMode && (!chunk || !chunk.length))
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof this[i] === 'undefined') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted && state.calledRead) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'))
},{"_process":31,"buffer":24,"core-util-is":38,"events":28,"inherits":29,"isarray":30,"stream":43,"string_decoder/":44}],36:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  var ts = this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('finish', function() {
    if ('function' === typeof this._flush)
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var rs = stream._readableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":33,"core-util-is":38,"inherits":29}],37:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Stream = require('stream');

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb))
    ret = writeOrBuffer(this, state, chunk, encoding, cb);

  return ret;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      cb(er);
    });
  else
    cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished && !state.bufferProcessing && state.buffer.length)
      clearBuffer(stream, state);

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  cb();
  if (finished)
    finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  for (var c = 0; c < state.buffer.length; c++) {
    var entry = state.buffer[c];
    var chunk = entry.chunk;
    var encoding = entry.encoding;
    var cb = entry.callback;
    var len = state.objectMode ? 1 : chunk.length;

    doWrite(stream, state, len, chunk, encoding, cb);

    // if we didn't call the onwrite immediately, then
    // it means that we need to wait until it does.
    // also, that means that the chunk and cb are currently
    // being processed, so move the buffer counter past them.
    if (state.writing) {
      c++;
      break;
    }
  }

  state.bufferProcessing = false;
  if (c < state.buffer.length)
    state.buffer = state.buffer.slice(c);
  else
    state.buffer.length = 0;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (typeof chunk !== 'undefined' && chunk !== null)
    this.write(chunk, encoding);

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    state.finished = true;
    stream.emit('finish');
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require('_process'))
},{"./_stream_duplex":33,"_process":31,"buffer":24,"core-util-is":38,"inherits":29,"stream":43}],38:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
}).call(this,require("buffer").Buffer)
},{"buffer":24}],39:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":34}],40:[function(require,module,exports){
var Stream = require('stream'); // hack to fix a circular dependency issue when used with browserify
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = Stream;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":33,"./lib/_stream_passthrough.js":34,"./lib/_stream_readable.js":35,"./lib/_stream_transform.js":36,"./lib/_stream_writable.js":37,"stream":43}],41:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":36}],42:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":37}],43:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":28,"inherits":29,"readable-stream/duplex.js":32,"readable-stream/passthrough.js":39,"readable-stream/readable.js":40,"readable-stream/transform.js":41,"readable-stream/writable.js":42}],44:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":24}],45:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],46:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":45,"_process":31,"inherits":29}],"scampjs":[function(require,module,exports){
var EventEmitter = require('events').EventEmitter;
var SimplePeer = require('simple-peer');
var Track = require('causaltrack').IVV;
var util = require('util');
require('./util.js');

var MessageAcceptedSubscription=
    require('./messages.js').MessageAcceptedSubscription;
var MessageOfferResponse = require('./messages.js').MessageOfferResponse;
var MessageOfferRequest = require('./messages.js').MessageOfferRequest;
var MessageSubscription = require('./messages.js').MessageSubscription;
var MessageHeartbeat = require('./messages.js').MessageHeartbeat;

var ViewEntry = require('./viewentry.js');
var Conf = require('./config.js');

util.inherits(Peer, EventEmitter);

/*!
 * \brief Represent a peer within a gossip-based protocol using SCAMP as
 * membership. Internally, it has two views representing the in/out peers.
 * When the peer sends a message, it sends it to all the peers in the
 * partialView. Also, each message received through the inView is forwarded
 * to the partialView.
 * \param uid the unique site identifier of this peer
 */
function Peer(uid){
    EventEmitter.call(this);
    // #1 uid x counter to ensure uniqueness of broadcast messages
    this.track = new Track(uid);

    // #2 neighbourhood partial views for the membership: uid -> link
    this.partialView = []; 
    this.inView = [];
    this.pending = [];

    // #3 webRTC pending messages (TODO) remove them when no pending anymore
    this.sub = [];

    // #4 heartbeat messages are sent regularly to update inView
    var self = this;
    setInterval(function(){
	if (self.partialView.length>0){
	    self.broadcast(new MessageHeartbeat(uid));
	}}, Conf.heartbeat);
};

/*!
 * \brief generate a number of offers and return the array of pending link
 * \param k the number of offers to generate
 */
Peer.prototype.generateOffers = function(k){
    var self = this;
    var length = this.sub.length;
    for (var i = 0; i<k; ++i){
	var pair = this.track.increment();
	var link = new SimplePeer({initiator:true});
	link.index = this.sub.length;
	this.sub.push(new MessageSubscription(pair._e,
					      pair._c,
					      []));
	this.pending.push(link);
	this.setLink(link);
    };
    
    setTimeout(function(){
	for (var i = length; i<self.sub.length; ++i){
	    self.emit("offer", self.sub[i]);
	};
    }, 3000);
};

/*! 
 * \brief first function that will initialize the network. The peer "this", is
 * outside of the gossip network. One of the peer inside gives him an offer to
 * enter inside. The outside peer create an offer back to establish the
 * connection.
 * \param uid the unique site identifier of the peer which created the offer
 * \param counter the local counter of the peer when it generated the offer
 * \param offer the data that represents the offer, i.e., the output of
 * the stun WebRTC server
 */
Peer.prototype.onContact = function(uid, counter, offer){
    var self = this;
    // #1 create the peer and signal it the incomming offer
    var firstLink = new SimplePeer();
    for (var i = 0; i<offer.length; ++i){firstLink.signal(offer[i]);};
    firstLink.index = this.sub.length;
    // #2 initialize the accept message and put the link in pending
    var pair = self.track.increment();
    this.sub.push(new MessageAcceptedSubscription(pair._e,
						  pair._c,
						  uid,
						  counter,
						  []));
    this.pending.push(firstLink);
    this.setLink(firstLink);
    // #3 preparing the link to send some offer into the network
    firstLink.on("message", function(message){
	if (message.type == "MessageOfferRequest"){
	    if (message.destUid == self.track.local.e){
		console.log("Ok friend! Here are the " + message.k +
			    "requested offers! :3");
	    };
	};
    });
    
    setTimeout(function(){self.emit("offer",self.sub[firstLink.index]);},3000);
};

/*!
 * \brief the first contact with an external peer has been established. The 
 * peer 'this' requests a bunch of new offers to allow peers within the
 * the network to contact the new peer.
 * \param uid the unique site identifier of the remote peer
 * \param counter the counter of 'this' peer when it generated the offer
 * \param offer the offer of the remote peer to establish a WebRTC link
 */
Peer.prototype.onContactAccepted = function(uid, counter, offer){
    var self = this;
    var position = counter-1;
    this.pending[position].on("ready", function(){
	console.log("Send me " + self.partialView.length + " offers, friend.");
	self.pending[position].send(
	    new MessageOfferRequest(self.track.local.e,
				    uid,
				    self.partialView.length));
    });
    for (var i = 0; i<offer.length; ++i){
	this.pending[position].signal(offer[i]);	
    };
};

/*!
 * \brief defines the behaviour of link using the event provided by simplepeer
 * \param link the link to setup
 */
Peer.prototype.setLink = function(link){
    var self = this;
    link.on('signal', function(data){
	self.sub[this.index].offer.push(data);
    });
    link.on('ready', function(){
	console.log("New friend, yaay ! :3");
    });
    link.on('message', function(message){
	self.receive(message);
    });
}

/*!
 * \brief redirect the processing of the message to the proper function (e.g.
 * a new subscription message will be redirected to the function onSubscription
 * \param message the received message
 */
Peer.prototype.receive = function(message){
/*    if (message typeof MessageHeartbeat){
	return;
    };
    if (message typeof MessageSubscription){
	return;
    };
    if (message typeof MessageAcceptedSubscription){
	return;
    };*/
};


/*!
 * \brief sends a message to all the peers in the neighbourhood. From one
 * neighbour to another, the message reaches all participants in the network 
 * with a high probability. Furthermore, messages are forwarded only once.
 * (Note: Heartbeat messages are not forwarded)
 * \param message the message to broadcast
 */
Peer.prototype.broadcast = function(message){
    // (TODO) change for a more reliable way to crawl the array
    // i.e., if a peer link dies, this function may crash
    // #0 verify if the message has already been seen (TODO)
    if (("uid" in message) && ("counter" in message) &&
	(message.uid != this.track.local.e) &&
	!this.track.isLower({_e:message.uid, _c:message.counter})) {
	// #1 browse the partialView and send the message
	for (var i = 0; i<this.partialView.length; ++i){
	    this.partialView[i].send(message);
	};
    };
};

/*!
 * \brief received a subscription message. This function choose if it keeps
 * the subscription in its partialView or it forwards it.
 * \param uid the unique site identifier which wants to enter in the network
 * \param dataList the informations to contact this peer directly via webRTC
 */
Peer.prototype.onSubscription = function(uid, dataList){
    // #1 forward the subscription to each peer in the partialView + c
    // additionnal copies of the subscription
    // (TODO) deterministically choose the peers + c at random
    var rn = Math.floor(Math.random()*this.partialView.length);
    this.partialView[rn].send(new MessageSubscription(uid, dataList));
};

/*!
 * \brief event called when this peer receive a forwarded subscription. This 
 * peer must decide if it keeps it or forwards it. When the size of the 
 * partial view of a peer increases, it decreases the probability of keeping 
 * the new subscription. All subscription must be eventually accepted.
 * \param uid the unique site identifier of the subscriber
 * \param dataList the necessary data required to establish the p2p link
 */
Peer.prototype.onForwardedSubscription = function(uid, dataList){
    var self = this;
    // #1 check if we add the subscription to our partialView
    if (Math.random() <  (1/(1+this.partialView.length))){
	// #2 check if the link is not already included
	var position = this.partialView.binaryIndexOf(uid);
	if (position < 0 || (position == 0 && this.partialView.length==0)){
	    // #3 create an offer to handshake
	    var contact = new SimplePeer();

	    for (var i = 0; i< dataList.length; ++i){
		contact.signal(dataList[i]);
	    };
	    contact.index = this.offers.length;
	    this.offers[this.offers.length] = [];

	    contact.on("signal", function(data){
		self.offers[this.index].push(data);
	    });

	    setTimeout(function(i){
		var pair = self.track.increment();
		self.broadcast(
		    new MessageAcceptedSubscription(pair._e, pair._c,
						    uid,
						    self.offers[i]));
	    }, 3000, contact.index);
	    
	    contact.on("ready", function(data){
		// (TODO) verify if it does not already exist
		var position = self.inView.binaryIndexOf(uid);
		var viewEntry = new ViewEntry(uid, this);
		self.inView.splice(position,0,viewEntry);
	    });
	};
    };
};


module.exports = Peer;

},{"./config.js":1,"./messages.js":2,"./util.js":3,"./viewentry.js":4,"causaltrack":5,"events":28,"simple-peer":13,"util":46}]},{},[]);
