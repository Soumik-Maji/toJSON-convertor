import { XML2JSON } from "../../scripts/xml/XML2JSON.js";

export async function xmltest() {
    console.log("XML testing process works");

    const xmlText = `
<chunk demo="true" id="root-node">
    <job id="1">
        <name alw="true">   opr-q1</name>
        <starttime>12:15</starttime>
        <status>success</status>
    </job>
    <run>
        <name>run1</name>
    </run>
    <job id="2">
        testing
        <name>akli <b>fort <b>rusca</b></b></name>
        <starttime>22:37</starttime>
        <status>failed</status>
    </job>
    <run>
        <name>run2</name>
    </run>
    <job id="3">
        <name>dso</name>
        <starttime>02:26</starttime>
        <status>running</status>
    </job>
    <job id="4">
        <name>vlxs</name>
        <starttime>14:09</starttime>
        <status>success</status>
    </job>
    <run>
        <name>run3</name>
    </run>
    <author id="auto-none-2155" num="chk">
        <id>none</id>
        <name>Automated</name>
    </author>
    <creator id="loa"></creator>
    <machine id="lak" />
    <pulltimestamp>23:45</pulltimestamp>
</chunk>
`;


    const parser = await XML2JSON.from(xmlText);
    let data;
    data = parser.preserveAttributes().load();
    console.log(JSON.stringify(data, null, 2));
    data = parser.load();
    console.log(JSON.stringify(data, null, 2));
}