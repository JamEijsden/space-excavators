'use strict'

const BCrypt = require('bcryptjs')
// Function to run in worker
const bcryptHash = async (password) => {
  return await BCrypt.hash(password, 8)
}

exports.bcryptHash = bcryptHash