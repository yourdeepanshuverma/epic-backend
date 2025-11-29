import { validationResult } from "express-validator";

function validate(rules) {
  return async (req, res, next) => {
    // run all rules
    await Promise.all(rules.map((rule) => rule.run(req)));

    // check errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    next();
  };
}

export default validate;
