"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
	commonBeforeAll,
	commonBeforeEach,
	commonAfterEach,
	commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
	const newJob = {
		title: "new",
		salary: 100000,
		equity: "0.02",
		companyHandle: "c1",
	};

	test("works", async function () {
		let job = await Job.create(newJob);
		expect(job).toEqual({
      id: expect.any(Number),
      title: "new",
      salary: 100000,
      equity: "0.02",
      companyHandle: "c1",
    });

		const result = await db.query(
			`SELECT id, title, salary,
                    equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'new'`
		);
		expect(result.rows[0]).toEqual(
      {
        id: expect.any(Number),
				title: "new",
        salary: 100000,
        equity: "0.02",
        companyHandle: "c1",
			},
		);
	});
});

/************************************** findAll */

describe("findAll", function () {
	test("works: no filter", async function () {
		let jobs = await Job.findAll();
		expect(jobs).toEqual([
			{
				id: expect.any(Number),
				title: "J1",
        salary: 150000,
        equity: "0.01",
        companyHandle: "c1",
			},
			{
				id: expect.any(Number),
				title: "J2",
        salary: 175000,
        equity: null,
        companyHandle: "c2",
			},
			{
				id: expect.any(Number),
				title: "J3",
        salary: 200000,
        equity: "0.03",
        companyHandle: "c3",
			},
		]);
	});

	test("works with only title filter", async () => {
		const result = await Job.findAll({ title: "J1" });
		expect(result).toEqual([
			{
				id: expect.any(Number),
				title: "J1",
        salary: 150000,
        equity: "0.01",
        companyHandle: "c1",
			},
		]);
	});

	test("works with only minimum salary filter", async () => {
		const result = await Job.findAll({ minSalary: 190000 });
		expect(result).toEqual([
			{
				id: expect.any(Number),
				title: "J3",
        salary: 200000,
        equity: "0.03",
        companyHandle: "c3",
			},
		]);
  });
  
  test("works with only has equity filter", async () => {
		const result = await Job.findAll({ hasEquity: true });
		expect(result).toEqual([
			{
				id: expect.any(Number),
				title: "J1",
        salary: 150000,
        equity: "0.01",
        companyHandle: "c1",
      },
      {
				id: expect.any(Number),
				title: "J3",
        salary: 200000,
        equity: "0.03",
        companyHandle: "c3",
			}
		]);
  });
  
  test("works with all filters", async () => {
    const result = await Job.findAll({
      title: "J1",
      minSalary: 100000,
      hasEquity: true,
    });
		expect(result).toEqual([
			{
				id: expect.any(Number),
				title: "J1",
        salary: 150000,
        equity: "0.01",
        companyHandle: "c1",
			},
		]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    const res = await db.query(`SELECT id FROM jobs WHERE title = 'J1'`);
    const jobId = res.rows[0].id
	  let job = await Job.get(jobId);
		expect(job).toEqual({
			  id: expect.any(Number),
				title: "J1",
        salary: 150000,
        equity: "0.01",
        companyHandle: "c1",
		});
	});

	test("not found if no such job", async function () {
		try {
			await Job.get(0);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/************************************** update */

describe("update", function () {
	const updateData = {
		title: "New",
		salary: 300000,
		equity: "0.05",
		};

  test("works", async function () {
    const res = await db.query(`SELECT id FROM jobs WHERE title = 'J1'`);
    const jobId = res.rows[0].id;
		let job = await Job.update(jobId, updateData);
		expect(job).toEqual({
      id: jobId,
      companyHandle: "c1",
			...updateData,
		});

		const result = await db.query(
			`SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${jobId}`
		);
		expect(result.rows).toEqual([
      {
        id: jobId,
				title: "New",
				salary: 300000,
				equity: "0.05",
				company_handle: "c1",
			},
		]);
	});

  test("works: null fields", async function () {
    const res = await db.query(`SELECT id FROM jobs WHERE title = 'J1'`);
    const jobId = res.rows[0].id;
		const updateDataSetNulls = {
			title: "New",
			salary: 300000,
			equity: null,
		};

		let job = await Job.update(jobId, updateDataSetNulls);
		expect(job).toEqual({
      id: jobId,
      companyHandle: "c1", 
			...updateDataSetNulls,
		});

		const result = await db.query(
			`SELECT id, title, salary, equity,             company_handle
       FROM jobs
       WHERE id = ${jobId}`
		);
		expect(result.rows).toEqual([
			{
				id: jobId,
				title: "New",
				salary: 300000,
			  equity: null,
				company_handle: "c1",
			},
		]);
	});

  test("not found if no such company", async function () {
  	try {
			await Job.update(0, updateData);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    const res = await db.query(`SELECT id FROM jobs WHERE title = 'J1'`);
    const jobId = res.rows[0].id;
		await Job.remove(jobId);
		const result = await db.query(
			`SELECT id FROM jobs WHERE id=${jobId}`
		);
		expect(result.rows.length).toEqual(0);
	});

	test("not found if no such job", async function () {
		try {
			await Job.remove(0);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});
