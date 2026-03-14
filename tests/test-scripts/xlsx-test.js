import { XLSX2JSON } from "../../scripts/xlsx/XLSX2JSON.js";

export async function xlsxtest() {
    console.log("XLSX testing process works");

    const path = "./tests/resources/test-book.xlsx";

    try {
        const response = await fetch(path);
        if (!response.ok)
            throw new Error(`HTTP error! Resource not found at ${path}. Status: ${response.status}`);
        const data = await response.arrayBuffer();
        const parser = await XLSX2JSON.from(data);

        // await test0(parser);
        // await testSheetName(parser);
        // await test1(parser);
        // await test2(parser);
        // await test3(parser);
        // await test4(parser);
        // await test5(parser);
        // await test6(parser);
        await test7(parser);

    } catch (error) {
        console.error(error);
    }
}

async function test0(parser) {
    console.log("Wrong sheet name");
    let data = await parser
        .setSheetName("wrong")
        .hasNoHeader()
        .relaxValidation()
        .load();
    console.table(data);
}

async function test7(parser) {
    console.log("BE A WITNESS TO THIS");
    let data = await parser
        .setSheetName("Sheet1")
        .hasNoHeader()
        .relaxValidation()
        .load();
    console.table(data);
}

async function test6(parser) {
    console.log("NO RELAXATION");
    let data = await parser
        .setSheetName("Sheet3")
        .load();
    console.table(data);

    console.log("RELAXED");
    data = await parser
        .setSheetName("Sheet3")
        .relaxValidation()
        .load();
    console.table(data);
}

async function test5(parser) {
    console.log("COMPLETE TABLE");
    let data = await parser
        .setSheetName("groceries")
        .relaxValidation()
        .load();
    console.table(data);

    console.log("TOP LEFT TABLE (rubbish getting included)");
    data = await parser
        .setSheetName("groceries")
        .load();
    console.table(data);

    console.log("BOTTOM RIGHT TABLE (refined)");
    data = await parser
        .setSheetName("groceries")
        .setColumnBounds("B", "G")
        .setRowStart(8)
        .relaxValidation()
        .load();
    console.table(data);
}

async function test4(parser) {
    console.log("NO RELAXATION");
    let data = await parser
        .setSheetName("employees")
        .load();
    console.table(data);

    console.log("RELAXED");
    data = await parser
        .setSheetName("employees")
        .relaxValidation()
        .load();
    console.table(data);
}

async function test3(parser) {
    const data = await parser
        .setSheetName("Sheet4")
        .load();
    console.table(data);
}

async function test2(parser) {
    const data = await parser
        .setSheetName("checking")
        .load();
    console.table(data);
}

async function test1(parser) {
    let data = await parser
        .setSheetName("Sheet2")
        .load();
    console.table(data);
}

async function testSheetName(parser) {
    const allSheetNames = parser.getAllSheetNames();
    console.log("All sheet names: ", allSheetNames);
}