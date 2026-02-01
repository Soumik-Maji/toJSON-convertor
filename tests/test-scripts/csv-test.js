import { CSV2JSON } from "../../scripts/csv/CSV2JSON.js";

export function csvtest() {
    console.log("-------------------------------------------");
    console.log("CSV testing process works");

    test1();
    test2();
}

function test2() {
    const text = "Alice,15,B:Bob,14,'A,D':Eve,13,C:Sam,14,D:Dan,15,C,B";
    const { data, rejects } = CSV2JSON.from(text)
        .hasNoHeader()
        .setRowSeparator(":")
        .setColumnSeparator(",")
        .setTextQualifier("'")
        .load();

    console.log("data");
    console.table(data);
    console.log("\nrejects");
    console.log(rejects);
}

function test1() {

    const text = `
Below csv contains Team Erelic participant's data
,,name 1"
asc-081,Joe,analytics
bof-002,Sarah,analytics
bof-374,Sally,analytics
asc-066,Ted,developer
int-55,Bob,AI
int-56,Roxan,AI
int-20,Robert,AI
bof-044,Lily,developer
bof-456,Mark,developer

dek-111,Robin,"""backend"",frontend"
dek-112,Dennis,backend
dek-113,Jack,backend,
dek-114,Bert,frontend

This file was generated on 01/05/2025

prjId, prjName
1,legar
6,dip`;

    const parser = CSV2JSON.from(text);
    const { data, rejects } = parser
        .setSkipFirstNLines(1)
        // .setSkipFirstNLines(19)
        .setTextQualifier('"')
        .load();

    console.log("data");
    console.table(data);
    console.log("\nrejects");
    console.log(rejects);
}