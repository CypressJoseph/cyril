import equal from 'deep-equal';

export namespace Cyril {
    interface Container<Subject> {}
    class NullSubject {}

    export class Box<Subject> implements Container<Subject> {
        static empty() { return new Box(new NullSubject()) }
        static with<T>(e: T): Box<T> { return new Box(e) }
        constructor(protected entity: Subject) {}
        // expect(key?: keyof Subject) {
        expect(): Expectation<Subject> {
            let expectation = new Expectation(this.entity);
            ambient.wrap(expectation)
            return expectation
        }
    }

    export class Expectation<Subject> implements Container<Subject> {
        expectedValue: any;
        static with<T>(e: T): Box<T> { return new Box(e) }
        constructor(protected entity: Subject) {}
        get actual() { return this.entity }
        get expected() { return this.expectedValue }
        public toBe(value: any) {
            this.expectedValue = value;
            return this;
        }
    }

    export class Environment {
        private links: Container<any>[] = []
        public reset() { this.links = [] }

        public wrap<T>(arg: T): Box<T>;
        public wrap<U, T extends Promise<U>>(arg: T): Box<U>;
        public wrap<U,T extends Box<U>>(arg: T): Box<U>;
        public wrap(arg: any) {
            if (arg instanceof Box) {
                this.links.push(arg);
                return arg;
            } else if (arg instanceof Expectation) {
                this.links.push(arg);
                return arg;
            } else {
                let box = Box.with(arg);
                this.links.push(box);
                return box;
            }
        }

        public expect(value: any) {
            return this.wrap(value).expect()
        }
        
        public verify() {
            // console.log("Would verify " + this.links.length + " links...")
            this.links.forEach(link => this.verifyLink(link))
        }

        protected verifyLink<T>(link: Container<T>) {
            if (link instanceof Expectation) {
                let { expected, actual } = link;
                if (actual instanceof Promise) {
                    console.log("Actual value was promise...")
                    actual.then(value => {
                        console.log("CMP EQ ON RESOLVED PROMISED VALUE")
                        this.cmpEq(expected, value)
                    })
                } else {
                    this.cmpEq(expected, actual)
                }
            }
        }
 
        private cmpEq(expected: any, actual: any) {
            // console.log("Compare eq -- expected = " )
            if (equal(expected, actual)) {
                console.log("VALUES MATCH: " + actual + " == " + expected)
            } else {
                this.fail("Expected value to be " + expected + " but got " + actual)
            }
        }
        private fail(message: string) { throw new Error(message) }
    }

    export const ambient: Environment = new Environment()
}

const cyr = Cyril.ambient
export default cyr;