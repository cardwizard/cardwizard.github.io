---
layout: page
title: The Python ecosystem is messed up and here's why
description: A study of security vulnerabilities in the Python Ecosystem.
img: /assets/img/mask.jpg
importance: 1
---

The popularity of Python has risen rapidly over the past 15 years.
It is a major language in some of the most exciting technologies
today. This popularity has led to a large ecosystem of third party
packages available via the pip package registry which hosts more
than 200,000 packages. These third party packages can be reused
by simply importing the package after installing using package managers like pip. 
The ease of reuse of third party software comes with
security risks putting millions of users in danger. In this project, we
study the ecosystem to analyze this threat.  


The mature ecosystem of Python has multiple weak spots that
we highlight in our project. First, we demonstrate how trivial it is
to exploit the Python ecosystem. Then, we systematically analyze
dependencies amongst packages, maintainers and publicly reported
security issues. Most attacks are possible only if users install malicious packages. We thus try to analyze and evaluate different methods used by attackers to force incorrect downloads. We quantify
our ideas by estimating the potential threat that can be caused by
exploiting a popular Python package. We also discuss methods used
in the industry to defend against such attacks

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        <a href="http://www.arxiv-vanity.com/papers/2102.06301/"> <img class="img-fluid rounded z-depth-1" 
        src="{{ '/assets/img/QLeEVLC_.jpg' | relative_url }}" alt="" 
        title="Arxiv Link"/> </a>
    </div>
    <div class="col-sm mt-3 mt-md-0">
        <a href="https://www.youtube.com/watch?v=RSKu0qgRKH4&feature=youtu.be"> <img class="img-fluid rounded z-depth-1" 
        src="{{ '/assets/img/youtube.jpg' | relative_url }}" alt="" title="Link to the Youtube Talk"/>
        </a>
    </div>
    <div class="col-sm mt-3 mt-md-0">
        <a href="https://seam.cs.umd.edu/Posters/aadesh.pdf"> 
        <img class="img-fluid rounded z-depth-1" height="19%" src="{{ '/assets/img/RSA.jpeg' | relative_url }}" alt="" 
        title="Link to the poster presented at the RSA conference"/></a>
    </div>
</div>
<div class="caption">
    Links to the paper on arxiv, talk on youtube and poster presentation at the RSA conference can be found above!
</div>


## Other Mentions:
1. William Bengtson's [blog](https://medium.com/@williambengtson/python-typosquatting-for-fun-not-profit-99869579c35d)  
2. RSA Conference Poster Pitch-off [Talk](https://www.youtube.com/watch?v=6OrMSMsC3kk).  