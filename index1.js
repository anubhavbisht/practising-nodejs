const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

const portNumber = 3000;
const app = express();
app.use(bodyParser.json());

let ADMINS = [];
let USERS = [];
let COURSES = [];

const authentication = (records, type) => {
  return (req, res, next) => {
    try {
      let { username, password } = req.headers;
      if (!username) {
        return res.status(400).json({ message: "Please enter a username" });
      }
      if (!password) {
        return res.status(400).json({ message: "Please enter a password" });
      }
      username = username.trim();
      password = password.trim();
      const userIndex = records.findIndex(
        (x) => x.username === username && x.password === password
      );
      if (userIndex === -1) {
        res.status(403).json({ message: `${type} authentication failed` });
      } else {
        req.positionOfUser = userIndex;
        next();
      }
    } catch (e) {
      console.error("Error in middleware function checkUserAuthentication", e);
      res.status(500).json({ message: "Server error" });
      throw e;
    }
  };
};

const checkIfUserExists = (records, type) => {
  return (req, res, next) => {
    try {
      let { username, password } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Please enter a username" });
      }
      if (!password) {
        return res.status(400).json({ message: "Please enter a username" });
      }
      username = username.trim();
      password = password.trim();
      const user = records.find((x) => x.username === username);
      if (user) {
        res.status(403).json({ message: `${type} already exists` });
      } else {
        req.user = username;
        req.pass = password;
        next();
      }
    } catch (e) {
      console.error("Error in middleware function checkIfUserExists", e);
      res.status(500).json({ message: "Server error" });
      throw e;
    }
  };
};

app.post("/admin/signup", checkIfUserExists(ADMINS, "Admin"), (req, res) => {
  try {
    const { user, pass } = req;
    const adminId = uuidv4();
    ADMINS.push({
      adminId,
      username: user,
      password: pass,
    });
    res.status(201).json({ message: "Admin created successfully", adminId });
  } catch (e) {
    console.error("Error in post route /admin/signup", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/admin/login", authentication(ADMINS, "Admin"), (req, res) => {
  try {
    res.status(200).json({ message: "Logged in successfully" });
  } catch (e) {
    console.error("Error in post route /admin/login", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/admin/courses", authentication(ADMINS, "Admin"), (req, res) => {
  try {
    let { title, description, price, courseLink } = req.body;
    if (!title) {
      return res
        .status(400)
        .json({ message: "Please enter a title for your course" });
    }
    if (!description) {
      return res
        .status(400)
        .json({ message: "Please enter a description for your course" });
    }
    if (!price) {
      return res
        .status(400)
        .json({ message: "Please enter a price for your course" });
    }
    if (!courseLink) {
      return res
        .status(400)
        .json({ message: "Please enter a courseLink for your course" });
    }
    title = title.trim();
    description = description.trim();
    price = price.trim();
    courseLink = courseLink.trim();
    const courseId = uuidv4();
    COURSES.push({
      courseId,
      title,
      description,
      price,
      courseLink,
    });
    res.status(201).json({ message: "Course created successfully", courseId });
  } catch (e) {
    console.error("Error in post route /admin/courses", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.put(
  "/admin/courses/:courseId",
  authentication(ADMINS, "Admin"),
  (req, res) => {
    try {
      const { courseId } = req.params;
      const courseIndex = COURSES.findIndex((c) => c.courseId === courseId);
      if (courseIndex === -1) {
        return res.status(404).json({ message: "Course not found" });
      }
      let { title, description, price, courseLink } = req.body;
      if (!title) {
        return res
          .status(400)
          .json({ message: "Please enter a title for your course" });
      }
      if (!description) {
        return res
          .status(400)
          .json({ message: "Please enter a description for your course" });
      }
      if (!price) {
        return res
          .status(400)
          .json({ message: "Please enter a price for your course" });
      }
      if (!courseLink) {
        return res
          .status(400)
          .json({ message: "Please enter a courseLink for your course" });
      }
      title = title.trim();
      description = description.trim();
      price = price.trim();
      courseLink = courseLink.trim();
      COURSES[courseIndex] = {
        courseId,
        title,
        description,
        price,
        courseLink,
      };
      res
        .status(200)
        .json({ message: "Course updated successfully", courseId });
    } catch (e) {
      console.error("Error in put route /admin/courses/:courseId", e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.get("/admin/courses", authentication(ADMINS, "Admin"), (req, res) => {
  try {
    res.status(200).json({ courses: COURSES });
  } catch (e) {
    console.error("Error in get route /admin/courses/", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/users/signup", checkIfUserExists(USERS, "User"), (req, res) => {
  try {
    const { user, pass } = req;
    const userId = uuidv4();
    USERS.push({
      userId,
      username: user,
      password: pass,
      purchasedCourseIds: [],
    });
    res.status(201).json({ message: "User created successfully", userId });
  } catch (e) {
    console.error("Error in post route /users/signup", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/users/login", authentication(USERS, "User"), (req, res) => {
  try {
    res.status(200).json({ message: "Logged in successfully" });
  } catch (e) {
    console.error("Error in post route /users/login", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/users/courses", authentication(USERS, "User"), (req, res) => {
  try {
    res.status(200).json({ courses: COURSES });
  } catch (e) {
    console.error("Error in get route /users/courses/", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post(
  "/users/courses/:courseId",
  authentication(USERS, "User"),
  (req, res) => {
    try {
      const { courseId } = req.params;
      const courseIndex = COURSES.findIndex((c) => c.courseId === courseId);
      if (courseIndex === -1) {
        return res.status(404).json({ message: "Course not found" });
      }
      let purchasedCourse = COURSES[courseIndex];
      const { positionOfUser } = req;
      USERS[positionOfUser].purchasedCourseIds.push(purchasedCourse.courseId);
      res
        .status(200)
        .json({ message: "Course purchased successfully", courseId });
    } catch (e) {
      console.error("Error in post route /users/courses/:courseId", e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.get(
  "/users/purchasedCourses",
  authentication(USERS, "User"),
  (req, res) => {
    try {
      const { positionOfUser } = req;
      let purchasedCoursesIdsForUser = USERS[positionOfUser].purchasedCourseIds;
      const purchasedCoursesOfUser = [];
      COURSES.forEach((x) => {
        if (purchasedCoursesIdsForUser.includes(x.courseId)) {
          purchasedCoursesOfUser.push(x);
        }
      });
      res.status(200).json({ courses: purchasedCoursesOfUser });
    } catch (e) {
      console.error("Error in get route /users/purchasedCourses", e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.use((req, res) => {
  res.status(404).send("Route not found");
});

app.listen(portNumber, () => {
  console.log("Server is listening on port::", portNumber);
});
