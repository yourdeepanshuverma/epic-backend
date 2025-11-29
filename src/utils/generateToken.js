import jwt from "jsonwebtoken";

const generateToken = (id, expiry = "30d") => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: expiry,
  });
};

export default generateToken;
