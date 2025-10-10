/**
 * checks if both the passed parameters are same
 * @param {any} A
 * @param {any} B
 * @param {boolean} ignoreArrayPosition - ignore positioning in arrays
 * @returns boolean - if both passed parameters matches
 */
function equals(A, B, ignoreArrayPosition) {

    // check if strictly equal (covers both primitive & reference) or both are NaN
    if ((A === B) || (Number.isNaN(A) && Number.isNaN(B)))
        return true;

    // null & undefined check
    if (A == null || B == null)
        return false;

    // get the types
    const typeA = getType(A);
    const typeB = getType(B);

    if (typeA !== typeB)
        return false;

    switch (typeA) {
        case "date":
            return A.getTime() === B.getTime();
        case "array":
            return compareArrays(A, B, ignoreArrayPosition);
        case "object":
            return compareObjects(A, B, ignoreArrayPosition);
        default:
            return false;
    }
}

function getType(data) {
    if (data instanceof Date) return "date";
    if (Array.isArray(data)) return "array";
    return typeof data;     // special objects are handled before this like 'date' & 'array'
}

function compareArrays(A, B, ignoreArrayPosition) {
    // Arrays: check both array same length and recursively check every element
    if (A.length !== B.length)
        return false;

    if (ignoreArrayPosition) {
        const usedIndex = new Set();
        for (let i = 0; i < A.length; i++) {
            let found = false;
            for (let j = 0; j < B.length; j++) {
                if (!usedIndex.has(j) && equals(A[i], B[j], ignoreArrayPosition)) {
                    usedIndex.add(j);
                    found = true;
                    break;
                }
            }
            if (!found)
                return false;
        }
        return true;

    } else {
        for (let i = 0; i < A.length; i++)
            if (!equals(A[i], B[i], ignoreArrayPosition))
                return false;
        return true;
    }
}

function compareObjects(A, B, ignoreArrayPosition) {
    // Objects: check keys and recursively check each corresponding value
    let keysA = Object.keys(A);
    let keysB = Object.keys(B);
    if (keysA.length !== keysB.length)
        return false;

    for (const key of keysA)
        if (!keysB.includes(key) || !equals(A[key], B[key], ignoreArrayPosition))
            return false;

    return true;
}


// lock for creating private constructor
const privateConstructorLock = Symbol("Lock for JsonEqual class");
/**
 * Class for JSON equality check.
 * Instantiate object with verbose & ignoreArrayPosition
 *
 * @param {boolean} verbose - logs all the values to be checked
 * @param {boolean} ignoreArrayPosition - ignores the positions in array when value is array
 */
export class JsonEqual {
    #verbose;
    #ignoreArrayPosition;
    constructor(lock) {
        if (lock !== privateConstructorLock) {
            throw new Error("Use create static method to create JsonEqual object");
        }
        this.#verbose = false;
        this.#ignoreArrayPosition = false;
        return this;
    }

    /**
     * creates & returns JsonEqual object
     * @returns JsonEqual object
     */
    static create() {
        return new JsonEqual(privateConstructorLock);
    }

    /**
     * sets verbose to true. shows the value on which equality is checked.
     * @returns JsonEqual object
     */
    verbose() {
        this.#verbose = true;
        return this;
    }

    /**
     * sets ignoreArrayPosition to true. ignores position of elemensts in array.
     * @returns JsonEqual object
     */
    ignoreArrayPosition() {
        this.#ignoreArrayPosition = true;
        return this;
    }

    /**
     * checks for the equality of the 2 values passed
     * @param {string} msg - message to print & identity in log
     * @param {any} a
     * @param {any} b
     */
    equals(msg, a, b) {
        if (this.#verbose) {
            console.log(a);
            console.log(b);
        }
        if (equals(a, b, this.#ignoreArrayPosition))
            console.log(`\x1b[32m passed: ${msg}`); // colored green
        else
            console.log(`\x1b[31m failed: ${msg}`); // colored red
        console.log("\x1b[0m--------------------------------------------------"); // reset color
    }
}
