import { ParserValidator } from "../ParserValidator.js";

const constructorKey = Symbol("JSON2JSON");
/**
 * JSONReader
 * ----------
 * Public API for reading and parsing JSON data.
 *
 * Supports reading JSON from string
 *
 * Usage:
 * ```js
 * const reader = JSONReader.from(fileInput);
 * const data = reader.load(); // returns parsed JSON object
 * ```
 */
export class JSON2JSON {

    // updated when file is read
    #data = null;

    /**
     * @private
     * Creates a new JSON2JSON instance.
     * Do not call directly — use {@link JSON2JSON.from}.
     */
    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot call JSON2JSON with 'new'. Call static function from().");
        return this;
    }

    /**
     * Reads JSON2JSON input from a string.
     *
     * @param {string} jsonString
     * @returns {JSON2JSON} A configured parser instance.
     * @throws Error if input is not a string.
     */
    static from(jsonString) {
        ParserValidator.validateDataType(jsonString, ParserValidator.dataTypes.string);
        const tmpObj = new JSON2JSON(constructorKey);
        tmpObj.#data = jsonString;
        return tmpObj;
    }

    /**
     * Parses the string to JSON.
     *
     * @returns {any} Parsed JSON object
     * @throws Error if the JSON string is invalid
     */
    load() {
        try {
            return JSON.parse(this.#data);
        } catch (e) {
            throw new Error("Invalid JSON format: " + e.message);
        }
    }
}
