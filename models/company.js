"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies with optional filters for minimum employees, maximum
   * employees, and name of the company. Filters can be passed in as an 
   * object to the function.
   * 
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(searchFilters = {}) {
    let query = 
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies`;
    
    const whereStatements = [];
    const values = [];

    const { name, minEmployees, maxEmployees } = searchFilters;

    if (minEmployees > maxEmployees) {
      throw new BadRequestError('min employees can not be greater the max employees');
    }

    if (name !== undefined) {
      values.push(`%${name}%`);
      whereStatements.push(`name ILIKE $${values.length}`);
    }

    if (minEmployees!== undefined) {
      values.push(minEmployees);
      whereStatements.push(`num_employees >= $${values.length}`);
    }

    if (maxEmployees !== undefined) {
      values.push(maxEmployees);
      whereStatements.push(`num_employees <= $${values.length}`);
    }

    if (whereStatements.length > 0) {
      query += ` WHERE ${whereStatements.join(" AND ")}`
    }

    query += " ORDER BY name";
    const finalQuery = await db.query(query, values);

    return finalQuery.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const res = await db.query(`SELECT * FROM companies WHERE handle = $1`, [handle]);
    console.log(res.rows)
    const companyRes = await db.query(
          `SELECT c.handle,
                  c.name,
                  c.description,
                  c.num_employees AS "numEmployees",
                  c.logo_url AS "logoUrl",
                  j.title,
                  j.salary,
                  j.equity,
                  j.id
           FROM companies AS c
           FULL JOIN jobs AS j
           ON c.handle = j.company_handle
           WHERE handle = $1`,
      [handle]);
    
    if (companyRes.rows.length === 0) throw new NotFoundError(`No company: ${handle}`);
    
    const jobs = companyRes.rows.map((row) => {
      return ({
        id: row.id,
        title: row.title,
        salary: row.salary,
        equity: row.equity
      });
    });
    const company = {
      handle: companyRes.rows[0].handle,
      name: companyRes.rows[0].name,
      description: companyRes.rows[0].description,
      numEmployees: companyRes.rows[0].numEmployees,
      logoUrl: companyRes.rows[0].logoUrl,
      jobs: jobs
    };

    return (company);
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}




module.exports = Company;
