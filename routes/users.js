"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureLoggedIn, ensureAdmin, ensureUserOrAdmin } = require("../middleware/auth");
const { BadRequestError, ExpressError } = require("../expressError");
const User = require("../models/user");
const { createToken } = require("../helpers/tokens");
const userNewSchema = require("../schemas/userNew.json");
const userUpdateSchema = require("../schemas/userUpdate.json");

const router = express.Router();


/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: admin
 **/

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.register(req.body);
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});


/** GET / => { users: [ {username, firstName, lastName, email }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: admin
 **/

router.get("/", ensureAdmin, async function (req, res, next) {
  try {
    const users = await User.findAll();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});


/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, 
 * isAdmin, jobs }
 * Where jobs is [{ id, title, salary, equity,companyName }...]
 * Authorization required: correct user or admin
 **/

router.get("/:username", ensureUserOrAdmin, async function (req, res, next) {
  try {
    const user = await User.get(req.params.username);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: correct user or admin
 **/

router.patch("/:username", ensureUserOrAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.update(req.params.username, req.body);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

/** POST /[username]/jobs/[jobId] 
 * { username, jobId } => { applicationJobId }
 * 
 * Allows a user to apply for a job (or an admin 
 * to do it for them). Throws error if user has
 * already applied for that job.
 * 
 * Authorization required: correct user or admin
 */

router.post("/:username/jobs/:id", ensureUserOrAdmin, async (req, res, next) => {
  try {
    const username = req.params.username;
    const jobId = req.params.id;
    // check for duplicate application
    const duplicate = await User.getApplication(username, jobId);
    if (duplicate != undefined) {
      throw new ExpressError(`${username} has already applied for this job.`, 400)
    }
    const applicationJobId = await User.apply( username, jobId);
    return res.json({ applied: applicationJobId })
  } catch (err) {
    return next(err);
  }
})

/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: correct user or admin
 **/

router.delete("/:username", ensureUserOrAdmin, async function (req, res, next) {
  try {
    await User.remove(req.params.username);
    return res.json({ deleted: req.params.username });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
