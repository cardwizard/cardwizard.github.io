---
layout: page
title: Buffer Pool management with Reinforcement Learning
description: Learning page eviction strategies
img:
importance: 2
---

Buffer pool management is a popular area of research in Databases. 
For databases larger than memory, optimal buffer pool management can 
help in speeding up the processing of user queries. An optimal cache 
manager will avoid unnecessary operations, maximise the cache hit rate 
which results in fewer round trips to a slower backend storage system and 
minimize the size of storage needed to achieve a high hit rate. Buffer 
management is thus, critical for the efficiency of the page accesses to 
decide which pages are frequently used or will be used in near future for 
faster processing of upcoming queries. Various heuristic-based policies 
aiming at selecting the right page to evict have been proposed, however, 
existing database systems typically implement generalized heuristics for 
all workloads, without taking the workload structure into consideration. 
In this work, we explore the potential of reinforcement learning to learn 
a policy for buffer management. In particular, we propose a Q-Learning 
based framework focusing on page replacement task for a predictive workloads. 
During execution of a workload and when the buffer is full, our system 
proposes a page in the buffer for eviction. Our system learns from past 
execution and creates a generalized, easy to implement solution that 
databases can adopt. Our simulation results demonstrate that our approach 
outperforms existing algorithms in certain cases suggesting the benefit 
of bringing modern learning based techniques into traditional database 
system design.