import { HTMLOutput } from "../outputs/HTMLOutput.js";

/**
 * @internal
 * FileHandler
 * -----------
 * Internal utility class for reading and decoding files.
 *
 * Supports two main use cases:
 *   1. Fetching server resources (via fetch API).
 *   2. Reading user-selected files (via <input type="file">).
 *
 * Data can be returned either as raw binary (ArrayBuffer)
 * or decoded into text based on MIME type / charset.
 *
 * Notes:
 * - Default text decoding is UTF-8, unless a charset is provided.
 * - XLSX and other binary formats should be read as ArrayBuffer only.
 * - JSON, CSV, XML should be decoded as text.
 *
 * This class is intended for **internal use only** within the
 * data manipulation library. Its API may change at any time.
 */
export class FileHandler {

    /**
     * Fetches a resource from the given file path.
     * @param {string} filePath - Path to the resource.
     * @returns {Promise<[ArrayBuffer, string]>} Resolves with [binary data as ArrayBuffer, content-type string].
     * @throws {Error} if the request fails.
     */
    static async readResource(filePath) {
        const response = await fetch(filePath);     // I can fetch it because project is locally hosted
        if (!response.ok)
            HTMLOutput.showError(`HTTP error! Resource not found at ${filePath}. Status: ${response.status}`);

        return [
            await response.arrayBuffer(),
            response.headers.get("Content-Type") || ""
        ];
    }

    /**
     * Fetches a resource and decodes it as text.
     * Uses charset from Content-Type header if available, otherwise UTF-8.
     * @param {string} filePath - Path to the resource.
     * @returns {Promise<string>} Decoded text content.
     */
    static async readResourceText(filePath) {
        const [arrayBuffer, contentType] = await FileHandler.readResource(filePath);
        const decoder = FileHandler.#getDecoder(contentType);

        return decoder.decode(arrayBuffer);
    }

    /**
     * Returns a TextDecoder for the given content type.
     * Extracts charset= from MIME type or defaults to UTF-8.
     * @private
     * @param {string} contentType - MIME type (e.g. "text/html; charset=utf-8").
     * @returns {TextDecoder} Configured decoder instance.
     */
    static #getDecoder(contentType) {
        const match = contentType.match(/charset=([^;]+)/i);
        const encoding = match?.[1]?.toLowerCase() || "utf-8";
        const decoder = new TextDecoder(encoding);
        return decoder;
    }

    /**
     * Reads a file selected in an <input type="file"> as ArrayBuffer.
     * @param {HTMLInputElement} inputElement - File input element with a selected file.
     * @returns {Promise<ArrayBuffer>} Binary contents of the file.
     */
    static async readInput(inputElement) {
        const fr = new FileReader();
        fr.readAsArrayBuffer(inputElement.files[0]);

        return new Promise((resolve, reject) => {
            fr.onload = () => {
                resolve(fr.result);
            }
            fr.onerror = (err) => {
                reject(err);
            }
        });
    }

    /**
     * Reads a file selected in an <input type="file"> and decodes it as text.
     * Uses MIME type of the file to pick charset (default UTF-8).
     * @param {HTMLInputElement} inputElement - File input element with a selected file.
     * @returns {Promise<string>} Decoded text content.
     */
    static async readInputText(inputElement) {
        const fr = new FileReader();
        fr.readAsArrayBuffer(inputElement.files[0]);

        return new Promise((resolve, reject) => {
            fr.onload = () => {
                const arrayBuffer = fr.result;
                const decoder = FileHandler.#getDecoder(inputElement.files[0].type)
                const data = decoder.decode(arrayBuffer);
                resolve(data);
            }
            fr.onerror = (err) => {
                reject(err);
            }
        });
    }
}
