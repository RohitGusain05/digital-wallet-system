const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isStrongPassword = (password) =>
  typeof password === 'string' &&
  password.length >= 8 &&
  /[A-Za-z]/.test(password) &&
  /\d/.test(password);

const isValidName = (name) =>
  typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 100;

module.exports = {
  isValidEmail,
  isStrongPassword,
  isValidName
};
