# rtc-SCAMP-mbr

<i>Keywords: SCAMP, scalable membership, gossip, WebRTC</i>

This project is a Nodejs implementation of the Scalable Membership
Protocol (SCAMP) [1] which is a gossip that automatically resizes its
neighbourhood tables in order to fit with the size of the network using local
knowledge only. For instance, a peer within a large network knows only
a small subset of the peers. Still, the links between the peers create a
connected graph.

The project rtc-SCAMP-mbr uses [WebRTC](http://www.webrtc.org) which allows
creating peer-to-peer connections within the browser. To our knowledge,
there do not exist any implementations which do not rely on a central server
to ease the initialisation phase of the membership. Thus, this project aims
to fill this gap. Such implementation would allow building distributed
network by only manually sharing a piece of data (e.g. by mail, via URL...).

## Installation

You can use the node packet manager to get the
module: ```$ npm install rtc-SCAMP-mbr```

## Usage

This membership protocol implements and provides
the [p2pnetwork API](http://https://github.com/justayak/network).

## Example

An example is available at the
[rtc-SCAMP project page](http://github.com/chat-wane/rtc-SCAMP) which uses
the SCAMP membership protocol with a simple broadcast mechanism. This
composition creates a working network within your browser.

## References

[1] [Peer-to-Peer Membership Management for Gossip-Based Protocols](http://pages.saclay.inria.fr/laurent.massoulie/ieee_tocs.pdf)
