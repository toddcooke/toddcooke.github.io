---
title: "Name Checker"
date: 2023-08-04T09:47:35-04:00
draft: false
---

I just created a tool called [Name Checker](https://namechecker.vercel.app/).

The idea is if you want to create a new project and don't want to check all the places (npm, apt, GitHub) for a name collision, you can just use this tool instead.

I started working on this because I noticed on HN folks sometimes create a new company and SAAS and they didn't notice that the name was already taken. I intentionally have not checked (the irony) to see if a tool like this exists, because it seems like with over 8 billion people on the planet there will always be someone that got there more quickly. That shouldn't prevent me from making something even better, but it tends to discourage me from even starting. So... check, but don't check :)

I didn't run into much difficulty making this, it really just hits a bunch of APIs which are publicly accessible. Only GitHub required me to use an access token. Some of the APIs returned CORs errors which I avoided by using next.js server side requests. 

Hopefully folks find it useful. https://namechecker.vercel.app


![Name Checker screenshot](https://user-images.githubusercontent.com/7469379/258436103-287ca76d-507b-402f-ab2c-299258f089ed.png )