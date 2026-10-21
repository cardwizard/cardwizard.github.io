---
layout: page
title: Newspaper
permalink: /newspaper/
description: Research Paper Cuts Daily — a daily AI newspaper.
nav: true
---

**Research Paper Cuts Daily** is a daily AI newspaper: a short, two-page edition of research papers and lab news, explained in plain language with the evidence and the caveats kept together. Every edition is reviewed and approved before it appears here.

{% assign editions = site.newspapers | sort: "date" | reverse %}
{% if editions.size > 0 %}
## Latest edition

{% assign latest = editions.first %}
[{{ latest.title }}]({{ latest.url | relative_url }}) — {{ latest.description }}

## All editions

{% for edition in editions %}
- [{{ edition.date | date: "%B %d, %Y" }}]({{ edition.url | relative_url }}) — {{ edition.description }}
{% endfor %}
{% else %}
No editions have been published yet.
{% endif %}
