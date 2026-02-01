import { ParserValidator } from "../ParserValidator.js";

const constructorKey = Symbol("CSV2JSON");
/**
 * CSV2JSON
 * --------
 * Public API for parsing JSON from CSV like string.
 *
 * Supports reading from String data type only
 *
 * Features:
 * - Detects headers (default) or generates them if missing
 * - Handles duplicates & missing headers, text qualifiers
 * - Configurable separators (row, column) and skipped lines
 * - Collects malformed rows into a `rejects` list
 *
 * Example:
 * ```js
 * const parser = CSV2JSON.from(fileInput);
 * const { data, rejects } = parser
 *     .setColumnSeparator(";")
 *     .setTextQualifier('"')
 *     .load();
 * ```
 */
export class CSV2JSON {

    // updated when file is read
    #data = null;

    // set by user
    #hasHeader;
    #rowSeparator;
    #columnSeparator;
    #textQualifier;
    #skipFirstNLines;

    /**
     * @private
     * Creates a new CSV2JSON instance.
     * Do not call directly — use {@link CSV2JSON.from}.
     */
    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot call CSV2JSON with 'new'. Call static function from().");
        return this;
    }

    //  SETTERS
    /**
     * @private
     * reset the configurations for reading csv files
     */
    #resetConfig() {
        this.#hasHeader = true;  // by default header is present
        this.#rowSeparator = "\n";
        this.#columnSeparator = ",";
        this.#textQualifier = "";
        this.#skipFirstNLines = 0;
    }

    /**
     * Disable header detection.
     * Instead, auto-generate headers (`c0`, `c1`, …).
     * @returns {CSV2JSON} this (for chaining)
     */
    hasNoHeader() {
        this.#hasHeader = false;
        return this;
    }

    /**
     * Define a custom row separator.
     *
     * NOTE: `\r\n` & `\r` are replaced with `\n` here & in {@link CSV2JSON.load()} for consistency across systems
     * @param {string} value - e.g., "\n", ";" or "|"
     * @returns {CSV2JSON} this (for chaining)
     */
    setRowSeparator(value) {
        if (value === "\r\n" || value === "\r") {
            value = "\n";
        }
        ParserValidator.validateDataType(value, ParserValidator.dataTypes.string);
        this.#rowSeparator = value;
        return this;
    }

    /**
     * Define a custom column separator.
     * @param {string} value - e.g., ",", ";", "\t"
     * @returns {CSV2JSON} this (for chaining)
     */
    setColumnSeparator(value) {
        ParserValidator.validateDataType(value, ParserValidator.dataTypes.string);
        this.#columnSeparator = value;
        return this;
    }

    /**
     * Define a text qualifier (quote character) to allow separators inside quoted strings.
     * @param {string} value - e.g., `"`, `'`
     * @returns {CSV2JSON} this (for chaining)
     */
    setTextQualifier(value) {
        ParserValidator.validateDataType(value, ParserValidator.dataTypes.string);
        this.#textQualifier = value;
        return this;
    }

    /**
     * Skip a fixed number of lines before parsing.
     * @note **skipping** is done after **ROW separation**
     * @param {number} value - number of lines to skip (must be >= 0)
     * @returns {CSV2JSON} this (for chaining)
     */
    setSkipFirstNLines(value) {
        ParserValidator.validateDataType(value, ParserValidator.dataTypes.number);
        ParserValidator.customValidator(value < 0, "Can not skip negative lines");
        this.#skipFirstNLines = value;
        return this;
    }

    // MAIN CODE STARTS HERE
    /**
     * Initializes instance & takes a string for conversion.
     * @param {string} csvString
     * @returns {CSV2JSON} A configured parser instance.
     * @throws Error if input is not a string.
     */
    static from(csvString) {
        ParserValidator.validateDataType(csvString, ParserValidator.dataTypes.string);

        const tmpObj = new CSV2JSON(constructorKey);
        tmpObj.#resetConfig();  // initializing the configs for newly created objects
        tmpObj.#data = csvString;
        return tmpObj;
    }

    /**
     * @private
     * Extracts header row from the provided rows.
     *
     * Behavior:
     * - If `#hasHeader` is true:
     *   - Uses the first row as header
     *   - Converts all names to lowercase
     *   - Replaces empty headers with `"missing_header"`
     *   - Deduplicates headers by appending `_0`, `_1`, etc.
     * - If `#hasHeader` is false:
     *   - Creates default headers: `c0`, `c1`, …
     * @param {string[]} rows - Array of raw row strings (first row expected as header if present)
     * @returns {string[]} Normalized header array
     */
    #extractHeaderRow(rows) {
        let headerRow = [];
        if (this.#hasHeader) {
            headerRow = this.#smartSplit(
                rows[0]    // read first element
            ).map(item => {         // check for empty headers & convert to lowercase
                if (item === "") {
                    console.warn("Column name is empty. Changed it to 'missing_header'")
                    return "missing_header";
                }
                return item.toLowerCase()
            });

            // handling duplicates in header row [keys of objects]
            const seen = {};
            headerRow.forEach(item => seen[item] = false);
            headerRow.forEach((item, index) => {
                let suffix = 0;
                if (seen.hasOwnProperty(item)) {
                    if (seen[item] === true) {
                        let newColName = `${item}_${suffix}`;
                        while (seen.hasOwnProperty(newColName)) {
                            suffix++;
                            newColName = `${item}_${suffix}`;
                        }
                        console.warn(`Column name '${item}' in column-${index + 1} already exists changed it to ${newColName}`);
                        headerRow[index] = newColName;
                        seen[newColName] = true;
                    }
                    seen[item] = true;
                }
            });
        }
        else {
            const headerLength = this.#smartSplit(rows[0]).length;     // count length
            headerRow = Array.from({ length: headerLength }, (_, index) => `c${index}`);    // create array as c0, c1, ...
        }
        return headerRow;
    }

    // NOTE: handles column separator within text qualifiers & escape text qualifiers
    // TOOK FROM CHATGPT. UNDERSTOOD ONLY A LITTLE BIT.
    /**
     * @private
     * Splits a CSV row into columns, respecting text qualifiers.
     *
     * Features:
     * - Supports quoted values containing column separators
     * - Supports escaped text qualifiers (`""` → `"` if qualifier is `"`)
     * - Trims whitespace around column values
     *
     * Example:
     * ```csv
     * "John, Doe",25,"New York"
     * ```
     * → `["John, Doe", "25", "New York"]`
     * @param {string} row - Single CSV row string
     * @returns {string[]} Array of column values
     */
    #smartSplit(row) {
        const result = [];
        let current = "", insideQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const char = row[i];

            if (char === this.#textQualifier) {
                if (insideQuotes && row[i + 1] === this.#textQualifier) {
                    current += this.#textQualifier;
                    i++;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (char === this.#columnSeparator && !insideQuotes) {
                result.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    /**
     * Parses the loaded string data into JSON.
     *
     * Behavior:
     * - If headers are enabled, uses first row as keys.
     * - Empty headers become `"missing_header"`.
     * - Duplicate headers are renamed (`header`, `header_0`, …).
     * - If headers are disabled, columns are named `c0`, `c1`, …
     * - Malformed rows (wrong number of columns) are skipped and stored in `rejects`.
     *
     * After parsing, configuration resets to defaults incase another load is required.
     * @returns {{ data: Object[], rejects: string[] }}
     *   - `data`: Array of parsed row objects
     *   - `rejects`: Array of Strings containing skipped malformed rows
     */
    load() {

        // handling line end issue for windows "\r\n" & old mac "\r"
        let textData = this.#data.replace(/\r\n|\r/g, '\n');

        // initilaize with TRIMMED original STRING data
        textData = textData.trim();
        // split rows
        let rows = textData.split(this.#rowSeparator);
        // skip first N lines
        rows = rows.slice(this.#skipFirstNLines);

        // taking out headers for keys
        const headerRow = this.#extractHeaderRow(rows); // as reference is passed, so .shift() affects here as well; not good way to write but OK for this.
        const headerLength = headerRow.length;  // reference length

        // remove the first row if header present
        if (this.#hasHeader)
            rows = rows.slice(1);

        // CREATING OBJECT ARRAY USING headerRow AS KEYS
        const result = [];
        let rejects = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.length === 0)  // skip if row is empty
                continue;

            const rowElms = this.#smartSplit(row);
            if (rowElms.length !== headerLength) {
                console.warn(`Row ${i} number of columns does not equal header number of columns`);
                rejects.push(row);
                continue;
            }
            const objElm = {};
            for (let index = 0; index < headerRow.length; index++)
                objElm[headerRow[index]] = rowElms[index];      // put row elements in respective object keys

            result.push(objElm);
        }

        this.#resetConfig();    // reset configurations for reading csv with different configs

        return {
            rejects,
            data: result
        };
    }
}
