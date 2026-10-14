---
layout: page
title: Projects
permalink: /projects/
description: Security research, database experiments, and tools for everyday work.
nav: true
---

<ul class="project-list">
  {% assign projects = site.projects | sort: 'importance' %}
  {% for project in projects %}
  <li>
    <div>
      <h2><a href="{{ project.url | relative_url }}">{{ project.title }}</a></h2>
      <p class="muted">{{ project.description }}</p>
      <div class="link-row">
        <a href="{{ project.url | relative_url }}">Project notes &nearr;</a>
        {% if project.redirect %}<a href="{{ project.redirect }}">Repository &nearr;</a>{% endif %}
        {% if project.github %}<a href="{{ project.github }}">Source code &nearr;</a>{% endif %}
      </div>
    </div>
    {% if project.img %}<img src="{{ project.img | relative_url }}" alt="{{ project.title | escape }}" width="156" height="116" loading="lazy">{% endif %}
  </li>
  {% endfor %}
</ul>
