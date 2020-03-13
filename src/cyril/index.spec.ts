import cyr from "."

// let { log, }

describe("Cyril", () => {
    beforeEach(() => cyr.reset())
    afterEach(() => cyr.verify())

    describe("basics", () => {
        describe('verifies links', () => {
            it('numbers', () => cyr.expect(2+2).toBe(4))
            it('arrays',  () => cyr.wrap([1 + 2, 3 + 4]).expect().toBe([3, 7]))
            it('strings', () => cyr.wrap("hello " + "world").expect().toBe('hello world'))
            it('objects', () => cyr.wrap({ a: 1 }).expect().toBe({ a: 1 })) // won't accept { b: 1 } etc
            it('complex structures', () => cyr.wrap(process).expect('env').its('USER').toBe(process.env.USER)) // 1
        })

        describe('simple lenses', () => {
            it('properties', () => cyr.wrap({ a: 1 }).expect('a').toBe(1))
            it('methods', () => cyr.expect({ a: { fn: () => 'hi' } }).its('a').invokes('fn').toBe('hi'))
            it('gloms', () => cyr.wrap({ a: { nested: { prop: 'val' }}})
                                 .expect().glom('a', 'nested', 'prop').toBe('val'))
        });

        it.skip('throws on failure', () => cyr.expect(2 + 2).toBe(5))

        it('verifies a link with a promise', () => {
            let two = new Promise<number>((resolve) => setTimeout(() => resolve(2), 500))
            cyr.expect(two).toBe(2)
        })
    })

    describe('scenarios', () => {
        it('logs', () => {
            cyr.log("hi there, world")
            cyr.output.expect().toMatch("hi there")
        })

        it.only('bdd', () => {
            cyr.describe('a feature', () => {
                cyr.log("within describe")
                cyr.it('works', () => {
                    cyr.log("within it")
                    cyr.log('ok')
                    cyr.expect(4 * 4).toBe(16)
                })
            })

            // the below causes a ton of confusing output but verifies rough control-flow expectations about bdd
            // cyr.processAmbient()
            // cyr.verifySpecs()
            // cyr.output.expect().toMatch("within describe")
            // cyr.output.expect().toMatch("within it")
            // todo tests to say: when i have a feature that fails i get an error etc, the suite fails etc
            // (these might be easier stated as "here have these specs..." )
        })

        xit('mixing commands and expectations', () => {
            let count = 0;
            let counter = cyr.wrap({ count, increment: () => count++ })
            counter.expect('count').toBe(0)
            counter.invokes('increment')
            counter.expect('count').toBe(1)
        })
    })
})