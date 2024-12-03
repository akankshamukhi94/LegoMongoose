// modules/legoSets.js
require('dotenv').config();
const Sequelize = require('sequelize');




// Initialize function to populate the sets array
function initialize() {
    return sequelize.sync()
        .then(() => {
            console.log("Database synchronized successfully.");
            return Promise.resolve(); // Resolve the promise if sync is successful
        })
        .catch((error) => {
            console.error("Failed to synchronize database:", error.message);
            return Promise.reject("Initialization failed: " + error.message); // Reject the promise with the error message
        });
}


// Function to get all sets
function getAllSets() {
    return Set.findAll({ include: [Theme] })
        .then((sets) => {
            if (sets.length > 0) {
                return Promise.resolve(sets);
            } else {
                return Promise.reject("No sets available.");
            }
        })
        .catch((error) => {
            return Promise.reject("Failed to fetch sets: " + error.message);
        });
}


// Function to get a set by its number
function getSetByNum(setNum) {
    return Set.findAll({ include: [Theme], where: { set_num: setNum } })
        .then((sets) => {
            if (sets.length > 0) {
                return Promise.resolve(sets[0]); // Return the first matching set
            } else {
                return Promise.reject("Unable to find requested set");
            }
        })
        .catch((error) => {
            return Promise.reject("Failed to fetch set: " + error.message);
        });
}


// Function to get sets by theme
function getSetsByTheme(theme) {
    return Set.findAll({
        include: [Theme],
        where: {
            '$theme.name$': {
                [Sequelize.Op.iLike]: `%${theme}%`, // Case-insensitive substring match
            },
        },
    })
        .then((sets) => {
            if (sets.length > 0) {
                return Promise.resolve(sets);
            } else {
                return Promise.reject("Unable to find requested sets");
            }
        })
        .catch((error) => {
            return Promise.reject("Failed to fetch sets: " + error.message);
        });
}


//export the functions as a module
module.exports = { initialize, getAllSets, getSetByNum, getSetsByTheme }

module.exports.getAllThemes = function() {
    return new Promise((resolve, reject) => {
        Theme.findAll({ 
            order: [['name', 'ASC']] // Sort themes by name
        })
            .then(themes => {
                // Make sure we're returning plain objects
                const themeData = themes.map(theme => ({
                    id: theme.id,
                    name: theme.name
                }));
                resolve(themeData);
            })
            .catch(err => {
                reject(err);
            });
    });
};

module.exports.addSet = function(setData) {
    return new Promise((resolve, reject) => {
        Set.create(setData)
            .then(() => {
                resolve();
            })
            .catch((err) => {
                reject(err.errors ? err.errors[0].message : err.message);
            });
    });
};

function editSet(set_num, setData) {
    return new Promise((resolve, reject) => {
        Set.update(setData, {
            where: {
                set_num: set_num
            }
        })
        .then(() => {
            resolve();
        })
        .catch((err) => {
            reject(err.errors ? err.errors[0].message : err.message);
        });
    });
}

module.exports.editSet = editSet;


function deleteSet(set_num) {
    return new Promise((resolve, reject) => {
        Set.destroy({
            where: {
                set_num: set_num
            }
        })
        .then(() => {
            resolve();
        })
        .catch((err) => {
            reject(err.errors ? err.errors[0].message : err.message);
        });
    });
}
 
module.exports.deleteSet = deleteSet;


//sequelize
let sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: "postgres",
        port: 5432,
        dialectModule: require("pg"),
        dialectOptions: {
            ssl: { rejectUnauthorized: false },
        },
    }
);

// define modals
// Theme
const Theme = sequelize.define("theme", {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false,
    },
}, { timestamps: false });

// Set
const Set = sequelize.define("set", {
    set_num: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    year: {
        type: Sequelize.INTEGER,
        allowNull: false,
    }, num_parts: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    theme_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: Theme,
            key: "id",
        },
    },
    img_url: {
        type: Sequelize.STRING,
        allowNull: false,
    },



}, { timestamps: false });


// associate the models
Set.belongsTo(Theme, { foreignKey: "theme_id" });


