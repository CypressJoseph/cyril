# cyril

## synopsis

a strongly-typed declarative monadic link

## description

lots of libraries ship a "monadic link" -- a component that wraps around arbitrary entities, performs side-effects and computations,
can do complex property access (and sometimes 'store' these views into objects or 'deep operations' on them -- similar to lensing in FP).

at any rate the idea is that we should be able to enjoy strongly typed APIs of this form, and that typescript now supports a lot of the
things we would need to strongly-type (even a declarative API that isn't actually "doing" the operations at the time.)

so cyril sketches a number of monadic link approaches. chains like the following should be strongly typed at every link:

```
// reflect basic object structure
// the toBe below will insist on the shape { a: number } -- won't accept { b: 1 } etc
cyr.wrap({ a: 1 }).expect().toBe({ a: 1 }) 

// introspect complex ambient objects 
// here, toBe insists on string | undefined
cyr.wrap(process).expect('env').its('USER').toBe(process.env.USER) 
```