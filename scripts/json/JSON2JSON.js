import { ParserValidator } from "../ParserValidator.js";

const constructorKey = Symbol("JSON2JSON");
/**
 * JSONReader
 * ----------
 * Public API for reading and parsing JSON data.
 *
 * Supports reading JSON from:
 * - File input elements (`<input type="file">`)
 * - Textarea elements (`<textarea>`)
 * - File paths / URLs (string)
 *
 * Usage:
 * ```js
 * const reader = await JSONReader.from(fileInput);
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
     * Reads JSON2JSON input from a file input, textarea, or URL string.
     *
     * @param {string} jsonString
     *        - File input element (`<input type="file">`)
     *        - Textarea element (`<textarea>`)
     *        - File path or URL (string)
     * @returns {Promise<JSON2JSON>} A configured parser instance.
     * @throws Error if input is invalid or not a json file.
     */
    static async from(jsonString) {
        ParserValidator.validateDataType(jsonString, ParserValidator.dataTypes.string);
        const tmpObj = new JSON2JSON(constructorKey);
        tmpObj.#data = jsonString;
        return tmpObj;
    }

    /**
     * Parses the stored JSON.
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
