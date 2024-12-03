const mongoose = require('mongoose');
require('dotenv').config();

const bcrypt = require('bcryptjs');

let Schema = mongoose.Schema;

// Define userSchema
const userSchema = new Schema({
  userName: { type: String, unique: true },
  password: String,
  email: String,
  loginHistory: [
    {
      dateTime: Date,
      userAgent: String,
    },
  ],
});

// Declare the User variable (to be initialized later)
let User;

function initialize() {
    return new Promise((resolve, reject) => {
      let db = mongoose.createConnection(process.env.MONGODB);
  
      db.on('error', (err) => {
        reject(err); // reject the promise with the provided error
      });
  
      db.once('open', () => {
        User = db.model('users', userSchema);
        console.log('USER db init')
        resolve();
      });
    });
  }

  // Register a new user
  function registerUser(userData) {
    return new Promise((resolve, reject) => {
      // Validate passwords match
      if (userData.password !== userData.password2) {
        reject('Passwords do not match. Please re-enter your password.');
        return;
      }
  
      // Hash the password
      bcrypt.hash(userData.password, 10)
        .then(hash => {
          // Create a new User object
          let newUser = new User({
            userName: userData.userName,
            password: hash,
            email: userData.email,
            loginHistory: [],
          });
  
          // Save the new user
          newUser.save()
            .then(() => {
              console.log(`User registered: ${userData.userName}`);
              resolve(); // Resolve the promise
            })
            .catch(err => {
              if (err.code === 11000) {
                reject('User Name already taken. Please choose another.');
              } else {
                reject(`There was an error creating the user: ${err.message}`);
              }
            });
        })
        .catch(err => {
          reject('Error hashing password.');
        });
    });
  }
  
  // Check user credentials
  function checkUser(userData) {
    console.log(`Checking user: ${userData.userName}`); // Log the username being checked
  
    return new Promise((resolve, reject) => {
      // Ensure the User model is initialized
      if (!User) {
        reject("User model not initialized. Please call initialize() first.");
        return;
      }
  
      // Find the user by userName (returns an array)
      User.find({ userName: userData.userName })
        .then((users) => {
          if (users.length === 0) {
            // No user found
            reject(`Unable to find user: ${userData.userName}`);
            return;
          }
  
          const user = users[0]; // Get the first user from the array
  
          // Compare the provided password with the stored hashed password
          bcrypt.compare(userData.password, user.password)
            .then((isMatch) => {
              if (!isMatch) {
                // If the password does not match
                reject(`Incorrect Password for user: ${userData.userName}`);
                return;
              }
  
              // Manage login history (maximum 8 entries)
              if (user.loginHistory.length === 8) {
                user.loginHistory.pop(); // Remove the oldest entry if history is full
              }
  
              // Add the current login to the beginning of the history
              user.loginHistory.unshift({
                dateTime: new Date().toString(),
                userAgent: userData.userAgent,
              });
  
              // Update the login history in the database
              User.updateOne(
                { userName: user.userName },
                { $set: { loginHistory: user.loginHistory } }
              )
                .then(() => {
                  console.log(`Login history updated for user: ${userData.userName}`);
                  resolve(user); // Resolve with the user object
                })
                .catch((err) => {
                  console.error(`Error updating login history: ${err.message}`);
                  reject(`There was an error updating the login history: ${err.message}`);
                });
            })
            .catch((err) => {
              console.error(`Error comparing passwords: ${err.message}`);
              reject(`There was an error comparing passwords: ${err.message}`);
            });
        })
        .catch((err) => {
          console.error(`Error finding the user: ${err.message}`);
          reject(`There was an error finding the user: ${err.message}`);
        });
    });
  }
  

  // Export functions
module.exports = {
    initialize,
    registerUser,
    checkUser,
  };


  