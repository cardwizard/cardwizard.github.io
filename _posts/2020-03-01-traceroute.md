---
layout: post
title:  5. Thinking outside the box - Tracing your network packet
date: 2020-03-01 21:01:00
description: How to trace your network packet using TTL?
---
Traceroute is an amazing utility that tells you the hops that your network packet has gone through before reaching the destination. These hops could be routers, DNS servers, etc. A sender normally has the information for just the next hop it is connecting to. Then how does traceroute manage to trace the entire route?

Traceroute uses a simple concept called TTL (Time to live). Every network packet has a TTL field embedded inside it. TTL reduces by 1 as the packet hops to the next destination. When the TTL becomes 0, the router where the TTL dropped to 0 sends back an ICMP packet to the sender (which is you in this case) with a message "Destination unreachable". The "sender" of this ICMP packet is the "hop" where the TTL became zero!

Traceroute uses this simple idea to send packets with TTL=1, TTL=2, TTL=3 and so on. Every time the TTL becomes zero, it receives an ICMP packet containing the IP of the intermediate hop. It then translates IP into a human-readable format and shows it to you as the "trace" of your packet! A simple but elegant solution.

[Traceroute original paper](https://lnkd.in/eJKQyEf)