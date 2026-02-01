import { ParserValidator } from "../ParserValidator.js";

const constructorKey = Symbol("XLSX2JSON");
/**
 * XLSX2JSON
 * --------
 * Public API for parsing JSON from XLSX data.
 *
 * Supports reading from ArrayBuffers only
 *
 * Features:
 * - List all the sheets present in xlsx file
 * - Read data from mentioned sheet only
 * - Detects headers (default) or generates them if missing
 * - Relaxed header check to read data more freely (gives almost complete data)
 * - Handles duplicates & missing headers
 * - Configurable cell locations (starting row & column bounds)
 *
 * Example:
 * ```js
 * const parser = await XLSX2JSON.from(data);
 * const data1 = await parser
 *      .setSheetName("groceries")
 *      .relaxValidation()
 *      .load();
 * const data2 = await parser
 *      .setSheetName("groceries")
 *      .setColumnBounds("B", "G")
 *      .setRowStart(8)
 *      .relaxValidation()
 *      .load();
 * ```
 */
export class XLSX2JSON {

    // these are updated when file is read
    #sheetMapping = { "": "xl/worksheets/sheet1.xml" };
    #entries = {};
    #sharedStrings = [];
    #textStyles = null;
    #standardFormatTypes = Object.freeze({
        14: 'date', 15: 'date', 16: 'date', 17: 'date', 18: 'date',
        19: 'date', 20: 'date', 21: 'date', 22: 'date', 27: 'date',
        30: 'date', 36: 'date', 45: 'date', 46: 'date', 47: 'date',
        9: 'percentage', 10: 'percentage',
        37: 'currency', 38: 'currency', 39: 'currency', 40: 'currency',
    });
    // set as per the excel data
    #mergedCells;

    // set by user
    #sheetName;
    #startingColumn;
    #endingColumn;
    #startingRow;
    #hasHeader;
    #relaxValidation;

    // PRIVATE STATIC HELPER FUNCTIONS
    static #columnNameToNumber(name) {
        if (!/^[A-Z]+$/i.test(name))       // check if column name is alphabet only
            throw new Error(`Invalid column name: '${name}'`);

        name = name.toUpperCase();
        let result = 0;
        for (let i = 0; i < name.length; i++)
            result = (result * 26) + (name.charCodeAt(i) - 64);

        return result;
    }

    static #columnNumberToName(num) {
        let result = "";
        while (num > 0) {
            const remainder = (num - 1) % 26;       // excel indexing is 1-based
            result = String.fromCharCode(remainder + 65) + result;
            num = Math.floor((num - 1) / 26);
        }
        return result;
    }

    // SETTERS
    #resetConfig() {
        this.#sheetName = "";   // empty points to default sheet1 in xlsx
        this.#startingColumn = XLSX2JSON.#columnNameToNumber("A");
        this.#endingColumn = null;
        this.#startingRow = 1;
        this.#hasHeader = true;  // default is header present
        this.#relaxValidation = false;  // relaxed checking for header row presence & incomplete rows in final JSON
        this.#mergedCells = [];     // needs to be reset for every load
    }

    /**
     * Provide sheet name need to read from.
     * Defaults to first sheet when not called or provided empty string.
     * @param {string} value sheet name
     * @returns {XLSX2JSON} this (for chaining)
     * @throws invalid sheet name throws error
     */
    setSheetName(value) {
        ParserValidator.customValidator(!this.#sheetMapping.hasOwnProperty(value), `No sheet named ${value} is in provided file.`);
        this.#sheetName = value;
        return this;
    }

    /**
     * Provide the column bounds within which data needs to be read.
     * @param {string} startingColumn
     * @param {string} endingColumn defaults to null, mean read everything
     * @returns {XLSX2JSON} this (for chaining)
     */
    setColumnBounds(startingColumn, endingColumn = null) {
        ParserValidator.validateDataType(startingColumn, ParserValidator.dataTypes.string);
        this.#startingColumn = XLSX2JSON.#columnNameToNumber(startingColumn);
        if (endingColumn) {
            ParserValidator.validateDataType(endingColumn, ParserValidator.dataTypes.string);
            this.#endingColumn = XLSX2JSON.#columnNameToNumber(endingColumn);
        }
        if (this.#endingColumn && this.#startingColumn > this.#endingColumn)
            throw new Error(`Starting column bound '${startingColumn}' cannot be greater than ending column bound '${endingColumn}'.`);
        return this;
    }

    /**
     * Provide starting row number from where reading data should start.
     * @param {number} rowStart
     * @returns {XLSX2JSON} this (for chaining)
     */
    setRowStart(rowStart) {
        ParserValidator.validateDataType(rowStart, ParserValidator.dataTypes.number);
        this.#startingRow = rowStart;
        return this;
    }

    /**
     * Boolean setter to relax the header checking process.
     * Gives almost identical data as in excel except empty lines,
     * @returns {XLSX2JSON} this (for chaining)
     */
    relaxValidation() {
        this.#relaxValidation = true;
        return this;
    }

    /**
     * Boolean setter to disable first row as header.
     * @returns {XLSX2JSON} this (for chaining)
     */
    hasNoHeader() {
        this.#hasHeader = false;
        return this;
    }

    // GETTERS
    /**
     * all sheet names present in excel
     * @returns {string[]}
     */
    getAllSheetNames() {
        return Object.keys(this.#sheetMapping);
    }

    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot call XLSX2JSON with 'new'. Call static function from().");
        return this;
    }

    // MAIN CODE STARTS HERE

    // READING RECOURCE & CREATING BASE OBJECT
    #setEntries(buffer) {
        const data = new Uint8Array(buffer);    // to read byte-by-byte
        const view = new DataView(buffer);      // read multi-byte values easily [like reading 4 bytes as a 32-bit integer]
        const zipLocalFileHeaderSignature = 0x04034b50; // IMPORTANT: required to know where the file ends

        let entries = {};
        for (let offset = 0; offset <= view.byteLength - 4;) {
            if (view.getUint32(offset, true) !== zipLocalFileHeaderSignature) {
                offset++;
                continue;
            }

            const nameLen = view.getUint16(offset + 26, true);      // length of filename
            const extraLen = view.getUint16(offset + 28, true);     // "extra" data length
            const compressedSize = view.getUint32(offset + 18, true);   // how many bytes of actual compressed data
            const compression = view.getUint16(offset + 8, true);   // compression method [none=0 & Deflate=8]

            let name = "";
            for (let i = 0; i < nameLen; i++)   // creating the file name from UTF-16 characters
                name += String.fromCharCode(data[offset + 30 + i]);     // starts immediately after the header

            const dataStart = offset + 30 + nameLen + extraLen;
            const dataEnd = dataStart + compressedSize;
            entries[name] = {
                compression,
                data: buffer.slice(dataStart, dataEnd)
            };

            offset = dataEnd;   // move to next file
        }
        this.#entries = entries;
    }

    async #decompressRaw(entry) {
        if (!entry)
            return null;

        if (entry.compression === 0)     // no compression present
            return new TextDecoder().decode(entry.data);

        const ds = new DecompressionStream("deflate-raw");
        const decompressedStream = new Response(entry.data).body.pipeThrough(ds);
        const text = await new Response(decompressedStream).text();
        return text;
    }

    async #getXMLdoc(key) {
        const xmlText = await this.#decompressRaw(this.#entries[key]);
        const xmlDoc = (new DOMParser()).parseFromString(xmlText, "application/xml");     // log this to better understand the xml structure
        return xmlDoc;
    }

    async #setSharedStrings() {
        // xlsx optimizes the string storage by storing in separate file & the index is shared with the actual worksheet
        const sharedString = "xl/sharedStrings.xml";
        let sharedStrings = [];

        if (this.#entries[sharedString] === undefined)
            throw new Error(`File is not proper xlsx. Cannot find ${sharedString}`);

        const ssDoc = await this.#getXMLdoc(sharedString);
        const siNodes = ssDoc.getElementsByTagName("si");
        for (const si of siNodes) {
            let t = si.getElementsByTagName("t")[0];
            sharedStrings.push(t ? t.textContent : "");
        }
        this.#sharedStrings = sharedStrings;
    }

    async #setSheetNameMapping() {
        const storedNames = "xl/workbook.xml",
            relatedSheets = "xl/_rels/workbook.xml.rels",
            nameMapping = {};

        if (this.#entries[storedNames] === undefined)
            throw new Error(`File is not proper xlsx. Cannot find ${storedNames}`);
        if (this.#entries[relatedSheets] === undefined)
            throw new Error(`File is not proper xlsx. Cannot find ${relatedSheets}`);

        let doc = await this.#getXMLdoc(storedNames);
        let nodes = doc.getElementsByTagName("sheet");
        for (const node of nodes) {
            const name = node.getAttribute("name"),
                id = node.getAttribute("r:id");
            nameMapping[id] = [name];
        }

        // checks & warns if excel file follows 1904-01-01 start date format. only relevant for old mac generated files.
        const workbookPr = doc.querySelector("workbookPr");
        if (workbookPr?.getAttribute("date1904") === "1")
            console.warn("Excel file is using 1904 as starting date. Dates might be off by ~4 years. Better convert file to modern excel format.");

        doc = await this.#getXMLdoc(relatedSheets);
        nodes = doc.getElementsByTagName("Relationship");
        for (const node of nodes) {
            const name = node.getAttribute("Target"),
                id = node.getAttribute("Id");
            if (nameMapping.hasOwnProperty(id))
                nameMapping[id].push(`xl/${name}`);
        }

        Object.values(nameMapping)
            .forEach(item => this.#sheetMapping[item[0]] = item[1]);
    }

    async #setStyleDoc() {
        const styleSheet = "xl/styles.xml";
        const styleDoc = await this.#getXMLdoc(styleSheet);
        const xfs = styleDoc.querySelectorAll("cellXfs > xf");
        this.#textStyles = xfs;
    }

    /**
     * Initializes instance & takes array buffer for conversion
     * @param {ArrayBuffer} xlsxArrayBuffer
     * @returns {Promise<XLSX2JSON>} for chaining
     */
    static async from(xlsxArrayBuffer) {
        const tmpObj = new XLSX2JSON(constructorKey);
        tmpObj.#resetConfig();
        const buffer = xlsxArrayBuffer;

        tmpObj.#setEntries(buffer);
        await tmpObj.#setSharedStrings();
        await tmpObj.#setSheetNameMapping();
        await tmpObj.#setStyleDoc();

        return tmpObj;
    }

    // CREATING JSON FROM XLSX XML DATA
    #applyStyle(styleIndex, value) {
        if (styleIndex === null || value === null || !this.#textStyles[styleIndex])
            return value;

        const xf = this.#textStyles[styleIndex];
        const applyNumFrmt = xf.getAttribute("applyNumberFormat") !== "0";   // default is true if missing
        const numFrmtId = parseInt(xf.getAttribute("numFmtId") ?? "0", 10);

        // Skip if applyNumberFormat explicitly false
        if (xf.hasAttribute("applyNumberFormat") && !applyNumFrmt)
            return value;

        // checking standard formats
        const type = this.#standardFormatTypes[numFrmtId];
        if (type === "date")
            return XLSX2JSON.#excelDateToJsDate(value);

        if (type === "percentage")
            return parseFloat(value) * 100 + "%";

        if (type === "currency")
            return "$ " + parseFloat(value).toFixed(2);

        // checking custom formats
        /*
            // WHAT THE FUCK IS THIS ChatGPT JARGON DOING ??
            const customFmt = this.#styles.numFmts?.find(f => parseInt(f.$.numFmtId, 10) === numFmtId);
            const fmtCode = customFmt?.$.formatCode;
            if (fmtCode) {
                const lowerFmt = fmtCode.toLowerCase();
                if (lowerFmt.includes("yy") || lowerFmt.includes("d") || lowerFmt.includes("m")) {
                    return this.#excelDateToJSDate(value);
                }
                if (lowerFmt.includes("%")) {
                    return parseFloat(value) * 100 + "%";
                }
                if (lowerFmt.includes("$") || lowerFmt.includes("¥") || lowerFmt.includes("€")) {
                    return `${fmtCode.includes("¥") ? "¥" : fmtCode.includes("€") ? "€" : "$"}${parseFloat(value).toFixed(2)}`;
                }
            }
        */

        // fallback for default
        return value;
    }

    static #excelDateToJsDate(excelSerial) {
        const jsEpoch = new Date(Date.UTC(1899, 11, 30));
        const isSerial = typeof excelSerial === "number" || !isNaN(excelSerial);
        const days = parseFloat(excelSerial);
        if (!isSerial || isNaN(days))
            return excelSerial;

        return new Date(jsEpoch.getTime() + days * 86400000);
    }

    #getDataFromTagName(tagName) {
        let value = tagName.getElementsByTagName("v")[0]?.textContent;  // value in string format
        const type = tagName.getAttribute("t");     // how to interpret value
        const styleIndex = tagName.getAttribute("s");    // styles on value like date, currency, etc
        const location = tagName.getAttribute("r"); // cell id/location

        if (this.#mergedCells.includes(location))  // short circuit if cell is merged
            return { value, location, inMerged: true };

        switch (type) {
            case "s":   // shared string
                value = this.#sharedStrings?.[value] ?? value;
                break;
            case "b":   // boolean
                value = value === "1" ? true : false;
                break;
            case "e":   // Error (e.g. #DIV/0!)
                value = `#ERROR(${value})`;
                break;
            case "inlineStr": // Inline string
                // Extract text from <is><t>value</t></is> structure
                const inlineStr = tagName.getElementsByTagName("is")[0];
                value = inlineStr?.getElementsByTagName("t")[0]?.textContent ?? "";
                break;
            default:    // handles null & "n" types as well
                break;
        }
        value = this.#applyStyle(styleIndex, value);

        return { value, location, inMerged: false };
    }

    #setMergedCells(doc) {
        const cellRegex = /^([A-Z]+)(\d+)$/i;
        const mergeElms = doc.querySelectorAll("mergeCells > mergeCell");
        for (const elm of mergeElms) {
            const attrs = elm.getAttribute("ref").split(":");
            const dataHolder = attrs[0];
            let [, startCol, startRow] = attrs[0].match(cellRegex);
            let [, endCol, endRow] = attrs[1].match(cellRegex);

            startCol = XLSX2JSON.#columnNameToNumber(startCol);
            startRow = Number(startRow);
            endCol = XLSX2JSON.#columnNameToNumber(endCol);
            endRow = Number(endRow);

            const minCol = Math.min(startCol, endCol);
            const maxCol = Math.max(startCol, endCol);
            const minRow = Math.min(startRow, endRow);
            const maxRow = Math.max(startRow, endRow);

            for (let col = minCol; col <= maxCol; col++) {
                const colLetter = XLSX2JSON.#columnNumberToName(col);
                for (let row = minRow; row <= maxRow; row++) {
                    const cellId = `${colLetter}${row}`;
                    if (cellId !== dataHolder)
                        this.#mergedCells.push(cellId);
                }
            }
        }
    }

    async #getJSON(xmlname) {
        const sheetDoc = await this.#getXMLdoc(xmlname);    // get the doc
        this.#setMergedCells(sheetDoc);

        const uniqueRowIdCol = Symbol("__row__");
        const rows = sheetDoc.getElementsByTagName("row");  // get all rows
        const jsonData = [];
        for (const row of rows) {
            const columns = row.getElementsByTagName("c");  // get all columns from a row
            const rowNumber = parseInt(row.getAttribute("r"));    // get row number

            if (rowNumber < this.#startingRow)  // skip all rows before starting row
                continue;

            const tmpObj = { [uniqueRowIdCol]: rowNumber };
            for (const column of columns) {
                let { value, location, inMerged } = this.#getDataFromTagName(column);
                if (inMerged)   // skip if cells are merged
                    continue;

                const cellCol = XLSX2JSON.#columnNameToNumber(location.replace(/\d+/, ""));    // get the cell column

                if (cellCol < this.#startingColumn ||
                    (this.#endingColumn && cellCol > this.#endingColumn)
                ) continue;     // skip all columns which are not in bound

                // will get nulls even after section ends because code continues to read rows
                // this is handled in load() function after the final json is created
                tmpObj[cellCol] = value;
            }
            jsonData.push(tmpObj);
        }

        // Removal of row number stored with Symbol as key is not required here.
        // Because Object.values() already filters out the Symbol keys & fetches only the string ones.
        return jsonData
            .sort((a, b) => a[uniqueRowIdCol] - b[uniqueRowIdCol]);     // sort the json to get proper row sequence
        // .map(({ uniqueRowIdCol, ...rest }) => rest);    // remove the row which was used for sorting
    }

    #formatJSON(data) {
        // skip everything if provided data array is empty (excel sheet is empty)
        if (!Array.isArray(data) || data.length === 0)
            return [];

        // add any extra columns to header row which might have missing column name
        const headerRow = this.#hasHeader ? data[0] : {};
        let missingColSuffix = 0;

        if (!this.#hasHeader || this.#relaxValidation) {
            for (let index = this.#hasHeader ? 1 : 0; index < data.length; index++) {
                Object.keys(data[index])
                    .forEach(id => {
                        if (!(headerRow.hasOwnProperty(id))) {
                            headerRow[id] = `missing_header_${missingColSuffix}`;
                            missingColSuffix++;
                        }
                    });
            }
        }

        // header row duplicate column name check [skip if no header]
        if (this.#hasHeader) {
            const seen = {};
            Object.values(headerRow).forEach(item => seen[item] = false);
            for (const key in headerRow) {
                const val = headerRow[key];
                let suffix = 0;
                if (seen.hasOwnProperty(val)) {
                    if (seen[val] === true) {
                        let newColName = `${val}_${suffix}`;
                        while (seen.hasOwnProperty(newColName)) {
                            suffix++;
                            newColName = `${val}_${suffix}`;
                        }
                        console.warn(`Column name '${val}' in column-${XLSX2JSON.#columnNumberToName(key)} already exists changed it to ${newColName}`);
                        headerRow[key] = newColName;
                        seen[newColName] = true;
                    }
                    seen[val] = true;
                }
            }
        }

        const headerKeys = Object.keys(headerRow);
        const arrObj = [];
        for (let index = this.#hasHeader ? 1 : 0; index < data.length; index++) {
            const tmpObj = {};
            for (const id of headerKeys)
                tmpObj[headerRow[id]] = data[index][id] ?? null;

            arrObj.push(tmpObj);
        }

        return arrObj;
    }

    /**
     * Parses the loaded array buffer into JSON.
     * @note Resets all configs set for this, so that new reads from same parser can be done with new configs.
     * @returns {Promise<Object>} JSON representation of XLSX
     */
    async load() {
        const sheetLocation = this.#sheetMapping[this.#sheetName];

        // CUSTOM STYLING REMAINING [maybe not needed]: READ STYLE SHEET TO GET PROPER STYLING
        let jsonData = await this.#getJSON(sheetLocation);

        // NOT ADDED: Prototype Pollution Risk (low but real)
        jsonData = this.#formatJSON(jsonData);

        // drop the rows which have null/empty-string/whitespace-only-string data in ALL COLUMNS
        jsonData = jsonData.filter(row =>
            !Object.values(row).every(val => val === null || (typeof val === "string" && val.trim() === ""))
        );

        // re-set for user [because contains many sheets unlike csv or xml]
        this.#resetConfig();

        return jsonData;
    }

    async #debugShowXML(xmlname) {
        console.log(xmlname);
        const sheetDoc = await this.#getXMLdoc(xmlname);
        console.log(sheetDoc);
    }

}
