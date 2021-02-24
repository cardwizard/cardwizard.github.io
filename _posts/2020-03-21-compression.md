---
layout: post
title:  8. Thinking outside the box - Why was compression removed from TLS?
date: 2020-03-21 21:01:00
description: The DEFLATE attack
---
When a user accesses a web page, packets of information are fetched by the client and rendered by the browser. Similarly, requests are sent from the client to the server. In an effort to reduce latency and network congestion, browsers started to compress (before encryption) data using techniques like GZIP and DEFLATE. If data has repeated patterns, the size of the packet will be smaller, thanks to compression.

However, this was exploited in attack called CRIME. If a user visits a malicious page, the web page can start sending requests to legitimate websites. Browser adds session cookies by default in those requests. Now, the malicious web page can start guessing the session tokens and monitoring the size of the requests going out. The closer the guess is to the actualy cookie, the smaller the size of the packet sent!

This attack in the fundamental design of TLS made most modern browsers like Chrome, Firefox disable compression.