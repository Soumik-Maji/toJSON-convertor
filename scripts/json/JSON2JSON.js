import { HTMLOutput } from "../../outputs/HTMLOutput.js";
import { FileHandler } from "../FileHandler.js";

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
 * const reader = await JSONReader.readFile(fileInput);
 * const data = reader.load(); // returns parsed JSON object
 * ```
 */
export class JSON2JSON {

    // updated when file is read
    #data = null;

    // for private constructor creation
    static #isAllowed = false;

    /**
     * @private
     * Creates a new JSON2JSON instance.
     * Do not call directly — use {@link JSON2JSON.readFile}.
     */
    constructor() {
        if (!JSON2JSON.#isAllowed)
            HTMLOutput.showError("Cannot call JSON2JSON with 'new'. Call static function readFile().");
        JSON2JSON.#isAllowed = false;
        return this;
    }

    /**
     * @private
     * Validate that file has `.json` extension.
     *
     * @param {string} fileName - Input filename
     * @throws Error if file extension is invalid
     */
    static #checkJSON(fileName) {
        if (!fileName.endsWith(".json"))
            HTMLOutput.showError("Provided file is not of type json");
    }

    /**
     * Reads JSON2JSON input from a file input, textarea, or URL string.
     *
     * @param {HTMLInputElement|HTMLTextAreaElement|string} jsonInput
     *        - File input element (`<input type="file">`)
     *        - Textarea element (`<textarea>`)
     *        - File path or URL (string)
     * @returns {Promise<JSON2JSON>} A configured parser instance.
     * @throws Error if input is invalid or not a json file.
     */
    static async readFile(jsonInput) {
        JSON2JSON.#isAllowed = true;
        const tmpObj = new JSON2JSON();

        if ((jsonInput instanceof HTMLInputElement) && jsonInput.type === "file") {
            if (!jsonInput.files.length)
                HTMLOutput.showError("No input file given.");
            JSON2JSON.#checkJSON(jsonInput.files[0].name);
            tmpObj.#data = await FileHandler.readInputText(jsonInput);
        }
        else if (jsonInput instanceof HTMLTextAreaElement) {
            tmpObj.#data = jsonInput.value;
        }
        else if (typeof jsonInput === "string") {
            JSON2JSON.#checkJSON(jsonInput);
            tmpObj.#data = await FileHandler.readResourceText(jsonInput);
        }
        else {
            HTMLOutput.showError("None of the input types matched.");
        }
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
            HTMLOutput.showError("Invalid JSON format: " + e.message);
        }
    }
}
