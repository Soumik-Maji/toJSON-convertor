/**
 * @internal
 * ParserValidator
 * ---------------
 * Internal utility class for performing lightweight validation.
 *
 * Provides:
 * - Type validation against a fixed set of supported JavaScript types.
 * - Custom condition-based validation with error reporting.
 *
 * Errors are reported using `throw new Error(...)`.
 * This class is intended for **internal use only** and its API may change.
 */
export class ParserValidator {

    /**
     * Allowed data types for validation.
     * Frozen to prevent modification at runtime.
     *
     * @readonly
     * @enum {string}
     */
    static dataTypes = Object.freeze({
        string: "string",
        number: "number",
        boolean: "boolean",
        object: "object",
        function: "function"
    });

    /**
     * Validates that a value matches the expected data type.
     *
     * @param {*} n - The value to validate.
     * @param {string} type - The expected type. Must be one of ParserValidator.dataTypes.
     * @example
     * ParserValidator.validateDataType(123, ParserValidator.dataTypes.number); // OK
     * ParserValidator.validateDataType("abc", ParserValidator.dataTypes.number); // Error
     */
    static validateDataType(n, type) {
        if (!(Object.values(ParserValidator.dataTypes)).includes(type))
            throw new Error(`${type} is not a valid data type.`);

        if (typeof n !== type)
            throw new Error(`Data type of ${n} is not ${type}.`);
    }

    /**
     * Runs a custom validation check based on a condition.
     * If the condition evaluates to true, an error is reported.
     *
     * @param {boolean} condition - Condition that indicates a validation failure.
     * @param {string} errorMessage - Message to display when validation fails.
     * @example
     * ParserValidator.customValidator(value < 0, "Value must not be negative");
     */
    static customValidator(condition, errorMessage) {
        if (condition)
            throw new Error(errorMessage);
    }
}
