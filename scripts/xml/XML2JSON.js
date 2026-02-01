import { ParserValidator } from "../ParserValidator.js";

const constructorKey = Symbol("XML2JSON");
/**
 * XML2JSON
 * --------
 * Public API for parsing JSON from XML like string.
 *
 * Supports reading from string only.
 *
 * Features:
 * - Preserves attributes if requested
 * - Validates well-formed XML before parsing
 * - Converts XML elements to nested JSON objects
 * - Handles multiple children with the same tag by converting them to arrays
 * - Collects element text content under `#text` key
 *
 * Example:
 * ```js
 * const parser = XML2JSON.from(xmlFileInput);
 * const jsonData = parser
 *     .preserveAttributes()
 *     .load();
 * console.log(jsonData);
 * ```
 */
export class XML2JSON {

    // updated when file is read
    #data = null;

    // set by user
    #preserveAttributes = false;

    /**
     * @private
     * Creates a new XML2JSON instance.
     * Do not call directly — use {@link XML2JSON.from}.
     */
    constructor(passedKey) {
        if (passedKey !== constructorKey)
            HTMLOutput.showError("Cannot call XML2JSON with 'new'. Call static function from().");
        return this;
    }

    // SETTER
    /**
     * Preserve XML attributes in the output JSON.
     *
     * Attributes will be stored under keys prefixed with `@`, e.g.,
     * `<person age="30">` → `{ "person": { "@age": "30" } }`
     * @returns {XML2JSON} this (for chaining)
     */
    preserveAttributes() {
        this.#preserveAttributes = true;
        return this;
    }

    // MAIN CODE STARTS HERE
    /**
     * Reads XML input from a string.
     * @param {string} xmlString
     * @returns {XML2JSON} A configured parser instance.
     * @throws Error if input is invalid or not an XML file.
     */
    static from(xmlString) {
        ParserValidator.validateDataType(xmlString, ParserValidator.dataTypes.string);
        const tmpObj = new XML2JSON(constructorKey);
        tmpObj.#data = (new DOMParser()).parseFromString(xmlString, "application/xml");
        XML2JSON.#validateWellFormedness(tmpObj.#data);
        return tmpObj;
    }

    /**
     * @private
     * Validates that the XML DOM is well-formed.
     * @param {Document} dom - Parsed XML DOM
     * @throws Error if XML contains parsing errors
     */
    static #validateWellFormedness(dom) {
        const errorDOM = dom.getElementsByTagName("parsererror");
        if (errorDOM.length > 0)
            HTMLOutput.showError(`\nError in parsing XML : ${errorDOM[0].textContent}`);
    }

    /**
     * Converts the loaded XML into JSON.
     *
     * Rules:
     * - Node names are keys
     * - Text content stored under `#text`
     * - Attributes (if preserved) stored under `@attributeName`
     * - Multiple children with same tag → array of objects
     *
     * After parsing, configuration resets to defaults incase another load is required.
     * @returns {Object} JSON representation of the XML
     */
    load() {
        const result = this.#createJSON(this.#data.documentElement);
        this.#preserveAttributes = false;
        return result;
    }

    /**
     * @private
     * Recursively converts an XML DOM node to JSON.
     *
     * Rules:
     * - Node names are keys
     * - Text content stored under `#text`
     * - Attributes (if preserved) stored under `@attributeName`
     * - Multiple children with same tag → array of objects
     *
     * @param {Element} dom - XML DOM element
     * @returns {Object} JSON object for this node
     */
    #createJSON(dom) {
        const obj = {};
        const domNodeName = dom.nodeName;

        if (this.#preserveAttributes === true && dom.attributes.length > 0) {
            obj[domNodeName] = {};
            Array.from(dom.attributes)
                .forEach(attr => obj[domNodeName][`@${attr.nodeName}`] = attr.nodeValue);
        }

        if (dom.children.length === 0) {
            if (obj.hasOwnProperty(domNodeName))
                obj[domNodeName][`#text`] = dom.textContent;
            else
                obj[domNodeName] = dom.textContent;
        }
        else {
            let fullContent = dom.innerHTML;    // taking all the inner html
            const currentObj = obj[domNodeName] || {};

            for (const child of dom.children) {
                fullContent = fullContent.replace(child.outerHTML, "");     // replacing the html contents of children with empty string

                const childName = child.nodeName;
                const parsedChild = this.#createJSON(child);

                if (currentObj.hasOwnProperty(childName)) {
                    if (!Array.isArray(currentObj[childName])) {
                        currentObj[childName] = [currentObj[childName]];
                    }
                    currentObj[childName].push(parsedChild[childName]);
                }
                else {
                    currentObj[childName] = parsedChild[childName];
                }
            }
            currentObj["#text"] = (fullContent.trim().length > 0) ? fullContent : "";

            return { [domNodeName]: currentObj };
        }
        return obj;
    }
}
