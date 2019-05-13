import { Event, EventEmitter, WorkspaceFolder } from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import {
    TestAdapter,
    TestLoadStartedEvent,
    TestLoadFinishedEvent,
    TestRunStartedEvent,
    TestRunFinishedEvent,
    TestSuiteEvent,
    TestEvent,
} from 'vscode-test-adapter-api';

export class LanguageClientAdapter implements TestAdapter {
    private disposables: { dispose(): void }[] = [];

    private readonly testsEmitter = new EventEmitter<
        TestLoadStartedEvent | TestLoadFinishedEvent
    >();

    private readonly testStatesEmitter = new EventEmitter<
        TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent
    >();

    private readonly autorunEmitter = new EventEmitter<void>();

    get tests(): Event<TestLoadStartedEvent | TestLoadFinishedEvent> {
        return this.testsEmitter.event;
    }

    get testStates(): Event<
        TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent
    > {
        return this.testStatesEmitter.event;
    }

    get autorun(): Event<void> | undefined {
        return this.autorunEmitter.event;
    }

    // retire?: Event<RetireEvent>;

    constructor(
        public workspaceFolder: WorkspaceFolder,
        private client: LanguageClient
    ) {
        this.listenTestLoadFinishedEvent();
        this.listenTestRunStartedEvent();
        this.listenTestRunFinishedEvent();
    }

    load(): Promise<void> {
        this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' });

        return this.sendRequest('TestLoadStartedEvent');
    }

    run(tests: string[]): Promise<void> {
        return this.sendRequest('TestRunStartedEvent', { tests });
    }

    // debug?(tests: string[]): Promise<void> {
    //     console.log(tests);
    //     throw new Error('Method not implemented.');
    // }

    cancel(): void {
        throw new Error('Method not implemented.');
    }

    dispose(): void {
        // this.cancel();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }

    private listenTestRunFinishedEvent() {
        this.onRequest(
            'TestRunFinishedEvent',
            ({ events }): any => {
                this.updateEvents(events);
                this.testStatesEmitter.fire(<TestRunFinishedEvent>{
                    type: 'finished',
                });
            }
        );
    }

    private listenTestRunStartedEvent() {
        this.onRequest(
            'TestRunStartedEvent',
            ({ tests, events }): any => {
                this.testStatesEmitter.fire(<TestRunStartedEvent>{
                    type: 'started',
                    tests,
                });
                this.updateEvents(events);
            }
        );
    }

    private listenTestLoadFinishedEvent() {
        this.onRequest(
            'TestLoadFinishedEvent',
            ({ suite }): any => {
                this.testsEmitter.fire(<TestLoadFinishedEvent>{
                    type: 'finished',
                    suite: suite,
                });
            }
        );
    }

    private async sendRequest(
        requestType: string,
        params: any = {}
    ): Promise<any> {
        await this.client.onReady();

        return await this.client.sendRequest(requestType, params);
    }

    private async onRequest(
        requestType: string,
        cb: (params?: any) => {}
    ): Promise<any> {
        await this.client.onReady();

        return this.client.onRequest(requestType, cb);
    }

    private updateEvents(events: (TestSuiteEvent | TestEvent)[]) {
        events.forEach((event: TestSuiteEvent | TestEvent) => {
            event.type === 'suite'
                ? this.testStatesEmitter.fire(<TestSuiteEvent>event)
                : this.testStatesEmitter.fire(<TestEvent>event);
        });
    }
}