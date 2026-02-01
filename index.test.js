import { csvtest } from "./tests/test-scripts/csv-test.js";
import { jsontest } from "./tests/test-scripts/json-test.js";
import { xmltest } from "./tests/test-scripts/xml-test.js";
import { xlsxtest } from "./tests/test-scripts/xlsx-test.js";

csvtest();
jsontest();
xmltest();
xlsxtest();