"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
	commonBeforeAll,
	commonBeforeEach,
	commonAfterEach,
	commonAfterAll,
    u1Token,
    adminToken,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
		title: "new",
		salary: 10000,
		equity: 0.01,
		companyHandle: "c1"
	};

	test("ok for users with admin", async function () {
		const resp = await request(app)
			.post("/jobs")
			.send(newJob)
			.set("authorization", `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        equity: "0.01",
        salary: 10000,
        title: "new",
        companyHandle: "c1"
      }
    });
	});
  
  

	test("bad request with missing data", async function () {
		const resp = await request(app)
			.post("/jobs")
			.send({
				title: "new1",
				salary: 10,
			})
			.set("authorization", `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});

	test("bad request with invalid data", async function () {
		const resp = await request(app)
			.post("/jobs")
			.send({
				...newJob,
				salary: "not-a-number",
			})
			.set("authorization", `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
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
          salary: 200000,
          equity: "0.02",
          companyHandle: "c2",
        },
        {
          id: expect.any(Number),
          title: "J3",
          salary: 250000,
          equity: "0.03",
          companyHandle: "c3",
        },
      ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });

  test("works with filters", async function () {
    const resp = await request(app).get(
      "/jobs?title=J2&minSalary=10000&hasEquity=true"
    );
    expect(resp.body).toEqual({
      jobs: [
        {
          id: expect.any(Number),
          title: "J2",
          salary: 200000,
          equity: "0.02",
          companyHandle: "c2",
        },
      ],
    });
  });

  test("doesnt break with invalid filters added to query", async function () {
    const resp = await request(app).get("/jobs?title=J2&notValid=fake");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: expect.any(Number),
          title: "J2",
          salary: 200000,
          equity: "0.02",
          companyHandle: "c2",
        },
      ],
    });
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    let j1Res = await db.query(`SELECT id FROM jobs WHERE title='J1'`);
    let testId = j1Res.rows[0].id; 
    
		const resp = await request(app).get(`/jobs/${testId}`);
		expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
				title: "J1",
        salary: 150000,
        equity: "0.01",
        companyHandle: "c1",
			},
		});
	});

	test("not found for no such job", async function () {
		const resp = await request(app).get(`/jobs/0`);
		expect(resp.statusCode).toEqual(404);
	});
});

/************************************** PATCH /jobs/:handle */

describe("PATCH /jobs/:id", function () {
  test("works for users with admin", async function () {
    let j1Res = await db.query(`SELECT id FROM jobs WHERE title='J1'`);
    let testId = j1Res.rows[0].id;
		const resp = await request(app)
			.patch(`/jobs/${testId}`)
			.send({
				salary: 350000,
			})
			.set("authorization", `Bearer ${adminToken}`);
		expect(resp.body).toEqual({
			job: {
				id: expect.any(Number),
				title: "J1",
				salary: 350000,
        equity: "0.01",
        companyHandle: "c1",
			},
		});
	});

  test("unauth for anon", async function () {
    let j1Res = await db.query(`SELECT id FROM jobs WHERE title='J1'`);
    let testId = j1Res.rows[0].id;
		const resp = await request(app).patch(`/jobs/${testId}`).send({
			title: "J9-new",
    });
		expect(resp.statusCode).toEqual(401);
	});

	test("not found on no such job", async function () {
		const resp = await request(app)
			.patch(`/jobs/0`)
			.send({
				title: "new nope",
			})
			.set("authorization", `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(404);
	});

  test("bad request on companyHandle change attempt", async function () {
    let j1Res = await db.query(`SELECT id FROM jobs WHERE title='J1'`);
    let testId = j1Res.rows[0].id;
		const resp = await request(app)
			.patch(`/jobs/${testId}`)
			.send({
				companyHandle: "c1-new",
			})
			.set("authorization", `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});

  test("bad request on invalid data", async function () {
    let j1Res = await db.query(`SELECT id FROM jobs WHERE title='J1'`);
    let testId = j1Res.rows[0].id;
		const resp = await request(app)
			.patch(`/jobs/${testId}`)
			.send({
				salary: "not-a-number",
			})
			.set("authorization", `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});
});

/************************************** DELETE /jobs/:handle */

describe("DELETE /jobs/:id", function () {
  test("works for users", async function () {
    let j1Res = await db.query(`SELECT id FROM jobs WHERE title='J1'`);
    let testId = j1Res.rows[0].id;
		const resp = await request(app)
			.delete(`/jobs/${testId}`)
			.set("authorization", `Bearer ${adminToken}`);
		expect(resp.body).toEqual({ deleted: `${testId}` });
	});

  test("unauth for anon", async function () {
    let j1Res = await db.query(`SELECT id FROM jobs WHERE title='J1'`);
    let testId = j1Res.rows[0].id;
		const resp = await request(app).delete(`/jobs/${testId}`);
		expect(resp.statusCode).toEqual(401);
	});

	test("not found for no such job", async function () {
		const resp = await request(app)
			.delete(`/jobs/0`)
			.set("authorization", `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(404);
	});
});
