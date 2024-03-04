"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
    /** Create a job (from data), update db, return new job data.
     *
     * data should be { title, salary, equity, companyHandle }
     *
     * Returns { id, title, salary, equity, companyHandle }
     *
     * */
  
    static async create({ title, salary, equity, companyHandle }) {
  
      const result = await db.query(
            `INSERT INTO jobs
             (title, salary, equity, company_handle)
             VALUES ($1, $2, $3, $4)
             RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
          [
            title,
            salary,
            equity,
            companyHandle,
          ],
      );
      const job = result.rows[0];
  
      return job;
    }
  
    /** Find all jobs with optional filters for 
     * minimum salary, if it has equity, and title 
     * of the job. Filters can be passed in as an 
     * object to the function.
     * 
     * Returns [{ id, title, salary, equity, 
     * companyHandle }, ...]
     * */
  
    static async findAll(searchFilters = {}) {
      let query = 
            `SELECT id,
                    company_handle AS "companyHandle",
                    title,
                    salary,
                    equity
             FROM jobs`;
      
      const whereStatements = [];
      const values = [];
  
      const { title, minSalary, hasEquity } = searchFilters;

      if (title !== undefined) {
        values.push(`%${title}%`);
        whereStatements.push(`title ILIKE $${values.length}`);
      }
  
      if (minSalary !== undefined) {
        values.push(minSalary);
        whereStatements.push(`salary >= $${values.length}`);
      }
  
      if (hasEquity !== undefined) {
        values.push("0");
        whereStatements.push(`equity > $${values.length}`);
      }
  
      if (whereStatements.length > 0) {
        query += ` WHERE ${whereStatements.join(" AND ")}`
      }
  
      query += " ORDER BY salary";
      const finalQuery = await db.query(query, values);
  
      return finalQuery.rows;
    }
  
    /** Given a job id, return data about job.
     *
     * Returns { id, title, salary, equity, companyHandle }
     *
     * Throws NotFoundError if not found.
     **/
  
    static async get(id) {
      const jobRes = await db.query(
            `SELECT id,
                    title,
                    salary,
                    company_handle AS "companyHandle",
                    equity
             FROM jobs
             WHERE id = $1`,
          [id]);
  
      const job = jobRes.rows[0];
  
      if (!job) throw new NotFoundError(`No job with the id of: ${job}`);
  
      return job;
    }
  
    /** Update job data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain all the
     * fields; this only changes provided ones.
     *
     * Data can include: {title, salary, equity}
     *
     * Returns {id, title, salary, equity, companyHandle}
     *
     * Throws NotFoundError if not found.
     */
  
    static async update(id, data) {
      const { setCols, values } = sqlForPartialUpdate(
          data,
          {});
      const idVarIdx = "$" + (values.length + 1);
  
      const querySql = `UPDATE jobs
                        SET ${setCols} 
                        WHERE id = ${idVarIdx} 
                        RETURNING id, 
                                  title, 
                                  salary, 
                                  company_handle AS "companyHandle",
                                  equity`;
      const result = await db.query(querySql, [...values, id]);
      const job = result.rows[0];
  
      if (!job) throw new NotFoundError(`No job with id of: ${id}`);
  
      return job;
    }
  
    /** Delete given job from database; returns undefined.
     *
     * Throws NotFoundError if job not found.
     **/
  
    static async remove(id) {
      const result = await db.query(
            `DELETE
             FROM jobs
             WHERE id = $1
             RETURNING id`,
          [id]);
      if (result.rows.length === 0) throw new NotFoundError(`No job with the id of: ${id}`);
    }
  }
  
  
  
  
  module.exports = Job;
  