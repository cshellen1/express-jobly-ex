"use strict";

const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function () {
	test("returns string of sql col names to update and paramaterizes the values", function () {
		const data = { numEmployees: 1000, logoUrl: "/logos/logo2.png" };
		const updateSql = sqlForPartialUpdate(data, {
			numEmployees: "num_employees",
			logoUrl: "logo_url",
		});
    expect(updateSql.setCols).toEqual(`"num_employees"=$1, "logo_url"=$2`);
    expect(updateSql.values).toEqual([1000, "/logos/logo2.png"])
	});
});
