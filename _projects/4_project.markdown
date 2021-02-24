---
layout: page
title: SafeDB Architecture and Structure
description: Course project for CMSC 634
img:
importance: 3
---

AnyLog is a decentralized platform for data publishing, sharing, and querying IoT data that enables an unlimited number of independent participants to publish and access the contents of IoT datasets stored across the participants. The AnyLog system has three entities, a Publisher (an entity owning data but limited compute), a Contractor (an entity having compute but no data) and a client who queries and pays for the data. The client pays the Contractor who then divides the amount amongst various Publishers based on the amount of data that is queried per Publisher. However, the Contractor maybe untrusted and can report incorrect numbers to the Publisher to pay them less. 
We show an alternate method to solve this problem by relaxing the assumption of returning accurate data and forcing the Contractor to send additional data for increased security. We enable the Contractor to run queries on an encrypted dataset by running them on "projections" which partially reveal information. We show the additional overhead incurred by our system and compute provable upper bounds on the extra data that is returned. Ultimately, we propose methods to minimize the data skew by optimizing for data distribution and query patterns. 

Contact aadesh@umd.edu for full report!