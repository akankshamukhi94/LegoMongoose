/********************************************************************************
* WEB322 – Assignment 04
* 
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
* 
* https://www.senecacollege.ca/about/policies/academic-integrity-policy.html
* 
* Name: _____________Akanksha_________ Student ID: _____155514227_________ Date: ___30-09-24___________
*
* Published URL: https://lego-mongoose.vercel.app/
*
********************************************************************************/
require('pg'); // explicitly require the "pg" module
const Sequelize = require('sequelize');
const express = require("express");
const legoData = require("./modules/legoSets");
const path = require("path");
const authData = require("./modules/auth-service")


const clientSessions = require("client-sessions");


const app = express();
const PORT = process.env.PORT || 8080; //  environment variable for flexibility

// Serve static files (e.g., images, CSS, JS) from the "public" folder
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
// Set up EJS for templating
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Initialize the LEGO data before setting up routes
legoData.initialize().then(
  authData.initialize().then(    console.log("users db initialized successfully")
)
);

app.use(
  clientSessions({
    cookieName: 'session', // this is the object name that will be added to 'req'
    secret: 'o6LjQ5EVNC28ZgK64hDELM18ScpFQr', // this should be a long un-guessable string.
    duration: 2 * 60 * 1000, // duration of the session in milliseconds (2 minutes)
    activeDuration: 1000 * 60, // the session will be extended by this many ms each request (1 minute)
  })
);

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});


function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

// Home route
app.get("/", (req, res) => {
  res.render("home", { page: '/' });
});

// About page route
app.get("/about", (req, res) => {
  res.render("about", { page: '/about' });
});

// Route to get LEGO sets by theme or all sets
app.get('/lego/sets', async (req, res) => {
  const theme = req.query.theme;
  try {
    let sets;
    if (theme) {
      sets = await legoData.getSetsByTheme(theme);
      if (!sets || sets.length === 0) {
        return res.status(404).render("404", {
          message: `No LEGO sets found for theme: ${theme}`,
          page: req.originalUrl
        });
      }
    } else {
      sets = await legoData.getAllSets();
    }

    res.render('sets', { sets, page: req.originalUrl });
  } catch (err) {
    console.error("Error fetching LEGO sets:", err);
    res.status(500).render("404", {
      message: "Unable to fetch LEGO sets. Please try again later.",
      page: req.originalUrl
    });
  }
});

// Route to get a specific LEGO set by its number
app.get("/lego/sets/:set_num", async (req, res) => {
  try {
    const set = await legoData.getSetByNum(req.params.set_num);
    if (!set) {
      return res.status(404).render("404", {
        message: `No LEGO set found with number: ${req.params.set_num}`,
        page: req.originalUrl
      });
    }
    res.render("set", { set, page: req.originalUrl });
  } catch (err) {
    console.error(`Error fetching set #${req.params.set_num}:`, err);
    res.status(500).render("404", {
      message: "Unable to find the requested LEGO set. Please try again later.",
      page: req.originalUrl
    });
  }
});

// Add Set route - display form
app.get("/lego/addSet", ensureLogin, async (req, res) => {
  try {
    const themes = await legoData.getAllThemes();
    // Add error checking for themes
    if (!themes) {
      throw new Error("Unable to fetch themes");
    }
    res.render("addSet", {
      themes: themes,
      page: '/lego/addSet'  // Add page parameter for navbar
    });
  } catch (err) {
    res.render("500", {
      message: `I'm sorry, but we have encountered the following error: ${err}`,
      page: '/lego/addSet'  // Add page parameter for navbar
    });
  }
});

// Add Set route - process form submission
app.post("/lego/addSet", ensureLogin, async (req, res) => {
  try {
    // Validate that all required fields are present
    const requiredFields = ['name', 'year', 'theme_id', 'num_parts', 'set_num', 'img_url'];
    for (let field of requiredFields) {
      if (!req.body[field]) {
        throw new Error(`${field} is required`);
      }
    }

    // Convert string values to appropriate types
    const setData = {
      name: req.body.name?.trim(),
      year: parseInt(req.body.year),
      theme_id: parseInt(req.body.theme_id),
      num_parts: parseInt(req.body.num_parts),
      set_num: req.body.set_num?.trim(),
      img_url: req.body.img_url?.trim()
    };

    // Validate converted values
    if (isNaN(setData.year) || isNaN(setData.theme_id) || isNaN(setData.num_parts)) {
      throw new Error("Invalid numeric value provided");
    }

    await legoData.addSet(setData);
    res.redirect("/lego/sets");
  } catch (err) {
    // Try to get themes again for re-rendering the form
    try {
      const themes = await legoData.getAllThemes();
      res.render("addSet", {
        themes: themes,
        page: '/lego/addSet',
        errorMessage: err.message,
        formData: req.body // Preserve form data
      });
    } catch (themeErr) {
      res.render("500", {
        message: `I'm sorry, but we have encountered the following error: ${err}`,
        page: '/lego/addSet'
      });
    }
  }
});

app.get("/lego/editSet/:num", ensureLogin, async (req, res) => {
  try {
    const [setData, themeData] = await Promise.all([
      legoData.getSetByNum(req.params.num),
      legoData.getAllThemes()
    ]);
    res.render("editSet", { themes: themeData, set: setData });
  } catch (err) {
    res.status(404).render("404", { message: err });
  }
});

app.post("/lego/editSet", ensureLogin, async (req, res) => {
  try {
    await legoData.editSet(req.body.set_num, req.body);
    res.redirect("/lego/sets");
  } catch (err) {
    res.render("500", {
      message: `I'm sorry, but we have encountered the following error: ${err}`
    });
  }
});

app.get("/lego/deleteSet/:num", ensureLogin, async (req, res) => {
  try {
    await legoData.deleteSet(req.params.num);
    res.redirect("/lego/sets");
  } catch (err) {
    res.render("500", {
      message: `I'm sorry, but we have encountered the following error: ${err}`
    });
  }
});



app.get('/login', (req, res) => {
  res.render('login', {
     errorMessage: null }); // Provide default values
});
app.get("/register", async (req, res) => {
  res.render("register", { successMessage: null, errorMessage: null,userName: null });
});

app.post("/register", async (req, res) => {
  try {
      await authData.registerUser(req.body);
      // Pass successMessage when registration is successful
      res.render("register", {
          successMessage: "Registration successful! Please proceed to log in.",
          userName:null,
          errorMessage: null // Explicitly set to null
      })
  } catch (err) {
      // Pass errorMessage when an error occurs
      res.render("register", {
          successMessage: null,
          userName:req.body.userName,
          // Explicitly set to null
          errorMessage: `Registration failed. Error: ${err.message || err}`,
      })
  }
});


// POST /login
app.post('/login', (req, res) => {
  req.body.userAgent = req.get('User-Agent');
  authData.checkUser(req.body).then((user) => {
    req.session.user = {
      userName: user.userName,
      email: user.email,
      loginHistory: user.loginHistory
    };
    res.redirect('/lego/sets');
  }).catch((err) => {
    res.render('login', { errorMessage: err, userName: req.body.userName });
  });
});

// GET /logout
app.get('/logout', (req, res) => {
  req.session.reset();
  res.redirect('/');
});

// GET /userHistory
app.get('/userHistory', ensureLogin, (req, res) => {
  res.render('userHistory');
});

// Custom 404 page for unmatched routes
app.use((req, res) => {
  res.status(404).render("404", {
    message: `Page not found: ${req.originalUrl}`,
    page: req.originalUrl
  });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port HTTP://localhost:${PORT}`);
});
