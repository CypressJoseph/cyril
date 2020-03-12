import cyr from "."

describe("Cyril", () => {
    beforeEach(() => cyr.reset())

    it('verifies links', () => {
        cyr.wrap(2+2).expect().toBe(4)
        cyr.wrap("hello " + "world").expect().toBe('hello world')
        cyr.wrap({a: 1}).expect().toBe({a: 1})
        cyr.verify()
    })

    it('throws on failure', () => {
        cyr.wrap(2+2).expect().toBe(5)
        expect(() => cyr.verify()).toThrow()
    })

    it('verifies a link with a promise', () => {
        let two = new Promise((resolve) => setTimeout(() => resolve(100), 100))
        cyr.expect(two).toBe(2)
        cyr.verify()
    })
})