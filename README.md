# SCAMPjs

<i>Keywords: SCAMP, gossip, epidemic dissemination, WebRTC </i>

This project is an attempt to provide a full browser gossip protocol with
random peer sampling. More specifically, it implements the Scalable Membership
Protocol (SCAMP) [1] which is a gossip that automatically resizes its
neighbourhood tables in order to fit with the size of the network using local
knowledge only.

SCAMPjs uses [WebRTC](http://www.webrtc.org) which allows creating peer-to-peer
connections within the browser. To our knowledge, there do not exist any
implementations which do not rely on a central server to ease the
initialisation phase of the membership. Thus, this project aims to fill this
gap. Such implementation would allow building distributed network by only
manually sharing a piece of data (e.g. by mail).

## References

[1] [Peer-to-Peer Membership Management for Gossip-Based Protocols](http://pages.saclay.inria.fr/laurent.massoulie/ieee_tocs.pdf)
