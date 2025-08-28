const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
    sort(tests) {
        // Sort tests to run unit tests first, then integration, then e2e
        const testOrder = ['unit', 'integration', 'contract', 'e2e', 'performance'];

        return tests.sort((testA, testB) => {
            const getTestType = (test) => {
                const path = test.path;
                for (const type of testOrder) {
                    if (path.includes(`/${type}/`) || path.includes(`.${type}.`)) {
                        return testOrder.indexOf(type);
                    }
                }
                return testOrder.length; // Unknown tests go last
            };

            const typeA = getTestType(testA);
            const typeB = getTestType(testB);

            if (typeA !== typeB) {
                return typeA - typeB;
            }

            // If same type, sort alphabetically
            return testA.path.localeCompare(testB.path);
        });
    }
}

module.exports = CustomSequencer;