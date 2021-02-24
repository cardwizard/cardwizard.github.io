---
layout: post
title: 2. Thinking outside the box - Column-oriented Databases
date: 2020-02-10 11:12:00-0400
description: Why Column Oriented databases are brilliant?
---

Databases are always thought of as row-stores. Features or parameters are the columns and data items are stored as rows. They are stored on disk as rows, with the fundamental idea being that it is faster to write to a contiguous memory location.

However, the same idea crumbles when you want to create a store that needs to support a heavy read workload. Reading a single column still requires the seek function to go through all the columns since the next item in the column will be placed after "n" blocks where "n" is the number of columns.

Here is an absurd idea - Store data in form of columns There are systems that have implemented this and have achieved throughput (for read queries) which is more than 1000 times that of traditional systems!

But what major benefits do we get by storing data items in the form of columns?
Since the data type of all elements of a column will be the same, you can achieve higher levels of compression (reducing disk access). Moreover, data for a column is placed adjacent to each other, thus, speeding up the read operation.

This idea was proposed in https://lnkd.in/f_UQTbf and has been commercialized by many OLAP systems like VerticaDB, etc.