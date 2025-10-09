/**
 * checks if both the passed parameters are same
 * @param {any} A
 * @param {any} B
 * @returns boolean - if both passed parameters matches
 */
function equals(A, B) {

    // check if strictly equal (covers both primitive & reference)
    if (A === B)
        return true;

    // check if either value is null or not an object
    if (A == null || B == null || typeof A !== 'object' || typeof B !== 'object')
        return false;

    // Arrays: check both are array, same length and recursively check every element
    if (Array.isArray(A) && Array.isArray(B)) {
        if (A.length !== B.length)
            return false;

        for (let i = 0; i < A.length; i++)
            if (!equals(A[i], B[i]))
                return false;

        return true;
    }

    // check if one is array & other isn't (arrays are also objects in JS)
    if (Array.isArray(A) !== Array.isArray(B))
        return false;

    // Objects: check keys and recursively check each corresponding value
    let keysA = Object.keys(A);
    let keysB = Object.keys(B);
    if (keysA.length !== keysB.length)
        return false;

    for (const key of keysA)
        if (keysB.includes(key) && !equals(A[key], B[key]))
            return false;

    return true;
}

/**
 * actual test function
 * @param {string} msg - name of check
 * @param {Object} a - json object for matching
 * @param {Object} b - json object for matching
 * @param {boolean} verbose - to log the passed values for check
 */
export function isJsonEqual(msg, a, b, verbose = false) {
    if (verbose) {
        console.log(a);
        console.log(b);
    }
    if (equals(a, b))
        console.log(`\x1b[32m passed: ${msg}`); // colored green
    else
        console.log(`\x1b[31m failed: ${msg}`); // colored red
    console.log("\x1b[0m"); // reset color
}
