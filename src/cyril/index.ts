import equal from 'deep-equal';
import assertNever from 'assert-never';
import chalk from 'chalk';

export namespace Cyril {
    type Property<Subject> = keyof Subject;
    type Method<Subject, K extends Property<Subject>> = ((...args: any[]) => any) & Subject[K];
    type A<T> = NonNullable<T>;

    interface Container<Subject> {}
    class NullSubject {}

    /**
     * Box implements a declarative monadic link builder.
     */
    export class Box<Subject> implements Container<Subject> {
        invokes(arg0: string) {
            throw new Error("Method not implemented.");
        }
        static empty() { return new Box(new NullSubject()) }
        static with<T>(e: T): Box<T> { return new Box(e) }
        constructor(protected entity: Subject) {}

        /**
         * Assert an expectation on the yielded value.
         * 
         * @param {string} key (optional) Property on a previously yielded subject
         * @example ```
         *   // Simple expect
         *   cyr.wrap(2+2).expect().toBe(4)
         * 
         *   // Pluck `my.value` from the wrapped subject
         *   cyr.wrap({ my: { value: 'here' }}).expect('my').its('value').toBe('here')
         * ```
         */
        public expect<K extends Property<Subject>>(key: K): Expectation<Subject[K]>;
        public expect(): Expectation<Subject>;
        public expect<K extends keyof Subject>(key?: K) {
            let expectation = new Expectation(this.entity);
            if (key) {
                expectation.its(key)
            }
            ambient.link(expectation)
            // console.log("AMBIENT IS WRAPPING EXPECT: " + JSON.stringify(ambient))
            if (key) {
                return expectation as unknown as Expectation<Subject[K]>
            } else {
                return expectation
            }
        }
    }

    type LensOperation = 'its' | 'invokes'
    type LensValue = string | number
    type LensArgs = any[]
    type Lens = [ LensOperation, LensValue, LensArgs? ]

    class ExactValue { constructor(public value: any) {} }
    class MatchValue { constructor(public value: any) {} }

    export class Expectation<Subject> implements Container<Subject> {
        public lenses: Lens[] = []
        private expectedValue!: ExactValue | MatchValue;

        static with<T>(e: T): Box<T> { return new Box(e) }
        constructor(protected entity: Subject) {}

        get actual() { return this.entity }
        get expected() { return this.expectedValue }

        /**
         * Assert deep-equality between yielded subject and expected value
         * 
         * @param expected value that should be deep-equal to actual value
         * @example ```
         * 
         *   // 2 + 2 == 4
         *   cyr.expect(2+2).toBe(4)
         * 
         *   // {a: 1} == {a: 1}
         *   cyr.expect({a: 1}).toBe({a: 1})
         * ```
         */
        public toBe(expected: Subject): void;
        // public toBe<U, T extends Subject & Promise<U>>(expected: U): void;
        public toBe(expected: Subject) { this.expectedValue = new ExactValue(expected); }

        // public toMatch<U extends string, T extends Subject & Promise<U>>(expected: U): void;
        public toMatch(expected: string): void;
        public toMatch(expected: string): void { this.expectedValue = new MatchValue(expected); }

        /**
         * Yield a named property on the subject.
         * @param {string} key Method name
         * @example ```
         *   // Pluck `my.value` from the wrapped subject
         *   cyr.wrap({ my: { value: 'here' }})
         *      .its('my').its('value')
         * ```
         */
        public its<K extends keyof Subject>(key: K): Expectation<Subject[K]>;
        public its<K extends Property<Subject>>(key: K) {
            this.lenses.push(['its', key as string | number])
            return this as unknown as Expectation<Subject[K]>;
        }

        /**
         * Yield the result of calling a named method with given arguments on the subject.
         * @param {string} key Method name
         * @param {any[]} args Argument list
         * @example ```
         *   // Invoke `my.fn` on the wrapped subject
         *   cyr.wrap({ my: { fn: () => 3 }}).expect('my').invokes('fn').toBe(3)
         * ```
         */
        public invokes<K extends Property<Subject>, F extends Method<Subject, K>, R=ReturnType<F>>(
            key: K,
            ...args: any[]
        ): Expectation<R> {
            this.lenses.push(['invokes', key as string, args])
            return this as unknown as Expectation<R>
        }


        /**
         *
         * Yield a nested property on the subject.
         *
         * @param {...string[]} path Property path
         * @example ```
         *  // Yield my.value
         *  cyr.wrap({ my: { value: 'here' }})
         *     .glom('my', 'value')
         *     .unwrap() // => 'here'
         * 
         *  // Yield by path
         *  cyr.wrap({ my: { value: 'here' }})
         *     .glom('my.value')
         *     .unwrap() // => 'here'
         * ```
         */
        public glom<
            T extends Subject,
            P1 extends keyof A<T>
        >(prop1: P1): Expectation<A<T>[P1]>;
        public glom<
            T extends Subject,
            P1 extends keyof A<T>,
            P2 extends keyof A<A<T>[P1]>
        >(prop1: P1, prop2: P2): Expectation<A<A<T>[P1]>[P2]>;
        public glom<
            T extends Subject,
            P1 extends keyof A<T>,
            P2 extends keyof A<A<T>[P1]>,
            P3 extends keyof A<A<A<T>[P1]>[P2]>
        >(prop1: P1, prop2: P2, prop3: P3): Expectation<A<A<A<T>[P1]>[P2]>[P3]>;
        public glom(...path: string[]): Expectation<any>;
        public glom(...path: string[]) {
            let traverse = (result: any, prop: string) => result == null
                ? undefined
                : result.its(prop)
            let destination = path.reduce(traverse, this);
            return destination;
        }

        /**
         * Verify this expectation.
         */
        public async verify() {
            console.log("Link.verify")
            let { actual, lenses } = this;
            let value = actual;
            if (actual instanceof Promise) {
                value = await actual;
            } else if (actual instanceof WrappedFunction) {
                value = actual.fn()
            }
            lenses.forEach(lens => {
                let [command, key, args] = lens;
                switch (command) {
                    case 'its': value = (value as any)[key]; break;
                    case 'invokes': 
                        if (args === undefined) {
                            value = (value as any)[key]();
                        } else {
                            value = (value as any)[key](...args);
                        }
                        break;
                    default: assertNever(command);
                }
            })
            if (this.expected instanceof ExactValue) {
                this.cmpEq(this.expected.value, value)
            } else {
                this.cmpMatch(this.expected.value, value)
            }
        }
 
        private cmpEq(expected: any, actual: any) {
           let fnName = "toBe"
           let message = "Objects are deep equal"
           if (equal(expected, actual)) {
               // great!
               process.stdout.write("\t" + chalk.green("✓") + " " + this.cmpMsg(expected, actual, message))
           } else {
               this.fail(expected, actual, fnName, message)
           }
        }

        private cmpMatch(expected: string, actual: any) {
           let fnName = "toMatch"
           let message = "Objects match"
           let match = actual.match(expected)
           if (match !== null) {
               // great!
               // process.stdout.write("\t" + chalk.green("✓") + " " + this.cmpMsg(expected, actual, message))
           } else {
               this.fail(expected, actual, fnName, message)
           }
        }

        private cmpMsg(expected: any, actual: any, fnName: string, comment?: string) {
           return chalk.gray(
                   "expect(" + chalk.red('actual') + ")." + chalk.white(fnName) + "(" + chalk.green('expected') + ")" +
                   (comment ? (" // " + comment) : "")
               ) +
               "\n\n" +
               "\tExpected:\t" + chalk.green(JSON.stringify(expected)) + "\n" +
               "\tActual:  \t" + chalk.red(JSON.stringify(actual)) + "\n\n"
        }

        private fail(expected: any, actual: any, fnName: string, comment?: string) {
            console.log("FAIL")
           let err = this.cmpMsg(expected, actual, fnName, comment)
           process.stdout.write("\t" + chalk.red("●") + "  " + err + "\n\n")
           throw new Error(err)
        }
    }

    class Specification {
        cases: TestCase[] = []
        constructor(public name: string, public fn: Function) {}
        addTest(tc: TestCase) { this.cases.push(tc) }
    }

    class TestCase {
        constructor(public name: string, public fn: Function) {}
    }

    type CommandOperation = 'log'
    type CommandValue = string | number
    /**
     * Commands are operations performed against an ambient environment (without a subject.)
     * 
     * Conceptually these are 'hard' side-effects: logging, reading files, network, etc.
     * 
     */
    export class Command {
        constructor(public op: CommandOperation, public value: CommandValue) {}
    }

    /**
     * WrappedFunctions are distinguished objects so that we can handle them
     * differently like promises. The idea is just that they are functions
     * where we can control when they are invoked.
     */
    export class WrappedFunction {
        constructor(public name: string, public fn: Function) {}
    }

    /**
     * Environment provides a space for tracking ambient links.
     */
    export class Environment {
        private logHistory: string[] = []
        private links: Container<any>[] = []
        private specs: Specification[] = [];
        private activeSpec!: Specification;

        /**
         * Factory-reset this environment (purge all commands, links, log output)
         */
        public reset(): void {
            this.links = []
            this.logHistory = []
        }

        /**
         * Manually add a monadic link expectation to this environment.
         * 
         * @param expectation the expectation to link
         */
        public link(expectation: Expectation<any>): void {
            this.links.push(expectation)
        }

        /**
         * Yield the given value.
         * 
         * @param {string} key (optional) Property on a previously yielded subject
         * @example ```
         *   // Simple wrap
         *   cyr.wrap(2+2).expect().toBe(4)
         * 
         *   // Pluck `env.user` from the wrapped subject
         *   cyr.wrap(process).expect('env').its('user').toBe(process.env.user)
         * ```
         */
        public wrap<T>(arg: T): Box<T>;
        // public wrap<U, T extends Promise<U>>(arg: T): Box<U>;
        public wrap<U,T extends Box<U>>(arg: T): Box<U>;
        public wrap(arg: any) {
            if (arg instanceof Box) {
                return arg;
            } else if (arg instanceof Expectation) {
                return arg;
            } else {
                let box = Box.with(arg);
                return box;
            }
        }

        /**
         * Assert an expectation on the yielded value.
         * 
         * @param {string} key (optional) Property on a previously yielded subject
         * @example ```
         *   // Simple expect
         *   cyr.wrap(2+2).expect().toBe(4)
         * 
         *   // Pluck `my.value` from the wrapped subject
         *   cyr.wrap({ my: { value: 'here' }}).expect('my').its('value').toBe('here')
         * ```
         */
        public expect<T>(value: Promise<T>): Expectation<T>;
        public expect<T>(value: T): Expectation<T>;
        public expect(value: any) {
            return this.wrap(value).expect()
        }

        /**
         * Verify ambient links + specs.
         */
        public async verify() {
            // console.log("VERIFY ALL")
            await this.processAmbient();
            await this.verifySpecs();
            await this.verifyAmbient();
        }

        /**
         * Verify all ambient links in this environment.
         * 
         * @example
         * ```
         *   cyr.expect(2+2).toBe(4)
         *   await cyr.verifyAmbient() // ✓ okay
         * 
         *   cyr.expect(2+2).toBe(5)
         *   await cyr.verifyAmbient() // ✕ throws
         * ```
         */
        public async verifyAmbient() {
            // console.log("VERIFY AMBIENT")
            let ambientVerifiers = this.links.map(link => this.handleLink(link))
            await Promise.all(ambientVerifiers)
        }
        
        /**
         * Analyze the ambient environment (gathering any model specifications)
         */
        public async processAmbient() {
            // console.log("PROCESS AMBIENT")
            let ambientProcessors = this.links.map(link => this.processLink(link))
            await Promise.all(ambientProcessors)
        }

        /**
         * Verify all specs in this environment.
         * 
         * @example
         * ```
         *   cyr.describe('2+2', () => cyr.its('4', () => expect(2+2).toBe(4)))
         *   await cyr.verifySpecs() // ✓ 2+2 -> 4
         * 
         *   cyr.describe('2+2', () => cyr.its('5', () => expect(2+2).toBe(5)))
         *   await cyr.verifySpecs() // ✕ 2+2 -> 5
         * ```
         */
        public async verifySpecs() {
            // console.log("VERIFY SPECS")
            let specRunners = this.specs.map(spec => this.handleSpec(spec))
            await Promise.all(specRunners)
        }

        /**
         * Gather cyril's log output history.
         */
        public get output(): Box<WrappedFunction> {
            return new Box(new WrappedFunction("output()", () => {
                // console.log("CHECK OUTPUT")
                let history = this.logHistory.join('')
                return(history)
            }))
        }

        /**
         * Output a message to the log.
         * 
         * @param message value to write
         */
        log(message: string) {
            let cmd = new Command('log', message)
            this.links.push(cmd)
        }

        private logSync(message: string) {
            this.logHistory.push(message)
            process.stdout.write(
                chalk.magenta("cyril> ") + chalk.gray(message) + "\n\n"
            )
        }

        it(behaviorName: string, theTestCase: () => void) {
            if (this.activeSpec) {
                this.activeSpec.addTest(
                    new TestCase(behaviorName, theTestCase)
                )
            } else {
                throw new Error("Cyril.it -- must be called within describe");
            }
        }

        describe(featureName: string, theSpec: () => void) {
            this.links.push(
                new Specification(featureName, theSpec)
            )
        }

        protected async handleSpec(spec: Specification) {
            console.log("- " + spec.name)
            let testRunners = spec.cases.map(testCase => this.handleTestCase(testCase))
            await Promise.all(testRunners)
        }

        protected async handleTestCase(testCase: TestCase) {
            console.log("  * " + testCase.name)
            try {
                await testCase.fn()
            } catch(err) {
                console.log("FAILED: " + testCase.name)
            }
            let result: boolean = true
            await this.verifyAmbient()
            let message = testCase.name
            let sigil = result ? "✓" : "x"
            process.stdout.write([sigil, message].join(' '))
        }

        protected async handleLink<T>(link: Container<T>) {
            if (link instanceof Expectation) {
                console.log("Link is expectation...")
                await link.verify()
            } else if (link instanceof Command) {
                let { op } = link
                switch(op) {
                    case 'log': this.logSync(String(link.value)); break;
                    default: assertNever(op)
                }
            } else {
                // console.warn("Not handling non-expectation/command link: " + JSON.stringify(link))
            }
        }

        private async processLink<T>(link: Container<T>) {
            if (link instanceof Specification) {
                console.log("Process spec '" + link.name + "'")
                this.activeSpec = link
                link.fn()
                this.specs.push(link) //this.activeSpec)
                console.log("THE SPEC: " + JSON.stringify(link))
            } else {
                console.warn("Not processing non-spec link: " + JSON.stringify(link))
            }
        }
    }
    export const ambient: Environment = new Environment()
}

const cyril = Cyril.ambient
export default cyril;