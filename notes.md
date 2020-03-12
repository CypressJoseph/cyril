- okay, several design constraints kind of fighting each other
- we want to be declarative so we don't have to worry about async things
  and so that we have a model/map to work through 
- strong types are great ofc but part of the value here is also as a utility belt
- maybe that's not as critical here? 
- i think the idea is to tease apart the 'horizontal' layer that's just concerned with
"declarative monadic links" that store their structure/specifications/lenses etc and automatically
assemble these into an ambient environment that can be used/verified easily
- if we want a 'utility-belt' version of this, it should be possible to make a narrow/limited
  layer on top that synchronously verifies expectations/performs lensing operations/etc

- monadic link apis support 'lensing' -- deep property access, method invocations, filter/find/map-style querying, regex...
- furthermore, they blend into semantic modelling -- test case design structures (matcher apis) tend to be heavily monadic-link or at least intentionally 'fluent' -- the idea is to support end-to-end 'reasoning at a linguistic level', if not all the way down the pyramid to static checks and type inference, etc

- most of the links we care about typing are simple lenses: access this property, through this series of operations -- 
- other links that are interesting to type permit computation/side-effects 'within' the monadic link: take an element/property/component and interact with it, compare it, send something in a network request/do a file operation/perform complex math/crypto etc

you get the idea, this is a fully general model of computation, borrowing heavily from functional programming principles but also trying to achieve something like lisp-y/ruby/coffee-style DX with powerful high-level "reflective-feeling" concerns about language and programming conventions that mean these APIs are more like *grammars*

in other words, at some point a *language-driven development* model may be appropriate, where we directly interrogate programmer mental models and maybe even analyze real-world programming in a laboratory setting (this seems basically impossible but i can imagine a few useful proxies/simulations for such a thing)

