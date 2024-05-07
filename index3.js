const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const portNumber = 3000;
const secretKey = process.env.JWT_SECRET_KEY;
const adminPath = path.join(process.cwd(), "ADMINS.json");
const userPath = path.join(process.cwd(), "USERS.json");
const coursePath = path.join(process.cwd(), "COURSES.json");
let ADMINS = [];
let USERS = [];
let COURSES = [];

const app = express();
app.use(bodyParser.json());

const readFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return data;
  } catch (error) {
    console.error("Error reading file:", error);
    throw error;
  }
};

const restoreCache = async () => {
  try {
    ADMINS = JSON.parse(await readFile(adminPath)) || [];
    USERS = JSON.parse(await readFile(userPath)) || [];
    COURSES = JSON.parse(await readFile(coursePath)) || [];
  } catch (e) {
    console.error("Error in function restoring cache", e);
  }
};

const writeFile = async (filePath, content) => {
  try {
    await fs.writeFile(filePath, content, "utf-8");
  } catch (error) {
    console.error("Error writing file:", error);
    throw error;
  }
};

const checkIfUserExists = (type) => {
  return async (req, res, next) => {
    try {
      await restoreCache();
      let { username, password } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Please enter a username" });
      }
      if (!password) {
        return res.status(400).json({ message: "Please enter a username" });
      }
      username = username.trim();
      password = password.trim();
      let records = type === "Admin" ? ADMINS : USERS;
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

const userAuthentication = (type) => {
  return async (req, res, next) => {
    try {
      await restoreCache();
      let { username, password } = req.headers;
      if (!username) {
        return res.status(400).json({ message: "Please enter a username" });
      }
      if (!password) {
        return res.status(400).json({ message: "Please enter a password" });
      }
      username = username.trim();
      password = password.trim();
      let records = type === "Admin" ? ADMINS : USERS;
      const userIndex = records.findIndex(
        (x) => x.username === username && x.password === password
      );
      if (userIndex === -1) {
        res.status(403).json({ message: `${type} authentication failed` });
      } else {
        req.user = username;
        req.positionOfUser = userIndex;
        next();
      }
    } catch (e) {
      console.error("Error in middleware function userAuthentication", e);
      res.status(500).json({ message: "Server error" });
      throw e;
    }
  };
};

const generateJwt = (userType) => {
  return (req, res, next) => {
    try {
      const { user, positionOfUser } = req;
      const payload = {
        username: user,
        type: userType,
        positionOfUser,
      };
      const token = jwt.sign(payload, secretKey, { expiresIn: "1hr" });
      req.token = token;
      next();
    } catch (e) {
      console.error("Error in middleware function generateJwt", e);
      res.status(500).json({ message: "Server error" });
      throw e;
    }
  };
};

const authenticateJwt = (userType) => {
  return (req, res, next) => {
    try {
      const authHeaders = req.headers.authorization;
      if (authHeaders) {
        const token = authHeaders.split(" ")[1];
        jwt.verify(token, secretKey, (err, data) => {
          if (err) {
            res.status(400).json({ message: "JWT not verified" });
          } else {
            const { username, type, positionOfUser } = data;
            if (type !== userType) {
              res
                .status(400)
                .json({ message: "User is not verified for this resource" });
            } else {
              req.user = username;
              req.positionOfUser = positionOfUser;
              next();
            }
          }
        });
      } else {
        res.status(400).json({ message: "Please send auth headers" });
      }
    } catch (e) {
      console.error("Error in middleware function authenticateJwt", e);
      res.status(500).json({ message: "Server error" });
      throw e;
    }
  };
};

app.post(
  "/admin/signup",
  checkIfUserExists("Admin"),
  generateJwt("Admin"),
  async (req, res) => {
    try {
      const { user, pass, token } = req;
      const adminId = uuidv4();
      ADMINS.push({
        adminId,
        username: user,
        password: pass,
      });
      await writeFile(adminPath, JSON.stringify(ADMINS));
      res.status(201).json({ message: "Admin created successfully", token });
    } catch (e) {
      console.error("Error in post route /admin/signup", e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.post(
  "/admin/login",
  userAuthentication("Admin"),
  generateJwt("Admin"),
  (req, res) => {
    try {
      const { token } = req;
      res.status(200).json({ message: "Logged in successfully", token });
    } catch (e) {
      console.error("Error in post route /admin/login", e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.post("/admin/courses", authenticateJwt("Admin"), async (req, res) => {
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
    await writeFile(coursePath, JSON.stringify(COURSES));
    res.status(201).json({ message: "Course created successfully", courseId });
  } catch (e) {
    console.error("Error in post route /admin/courses", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.put(
  "/admin/courses/:courseId",
  authenticateJwt("Admin"),
  async (req, res) => {
    try {
      await restoreCache();
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
      await writeFile(coursePath, JSON.stringify(COURSES));
      res
        .status(200)
        .json({ message: "Course updated successfully", courseId });
    } catch (e) {
      console.error("Error in put route /admin/courses/:courseId", e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.get("/admin/courses", authenticateJwt("Admin"), async (req, res) => {
  try {
    await restoreCache();
    res.status(200).json({ courses: COURSES });
  } catch (e) {
    console.error("Error in get route /admin/courses/", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post(
  "/users/signup",
  checkIfUserExists("User"),
  generateJwt("User"),
  async (req, res) => {
    try {
      const { user, pass, token } = req;
      const userId = uuidv4();
      USERS.push({
        userId,
        username: user,
        password: pass,
        purchasedCourseIds: [],
      });
      await writeFile(userPath, JSON.stringify(USERS));
      res.status(201).json({ message: "User created successfully", token });
    } catch (e) {
      console.error("Error in post route /users/signup", e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.post(
  "/users/login",
  userAuthentication("User"),
  generateJwt("User"),
  (req, res) => {
    try {
      const { token } = req;
      res.status(200).json({ message: "Logged in successfully", token });
    } catch (e) {
      console.error("Error in post route /users/login", e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.get("/users/courses", authenticateJwt("User"), async (req, res) => {
  try {
    await restoreCache();
    res.status(200).json({ courses: COURSES });
  } catch (e) {
    console.error("Error in get route /users/courses/", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post(
  "/users/courses/:courseId",
  authenticateJwt("User"),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const courseIndex = COURSES.findIndex((c) => c.courseId === courseId);
      if (courseIndex === -1) {
        return res.status(404).json({ message: "Course not found" });
      }
      let purchasedCourse = COURSES[courseIndex];
      const { positionOfUser } = req;
      USERS[positionOfUser].purchasedCourseIds.push(purchasedCourse.courseId);
      await writeFile(userPath, JSON.stringify(USERS));
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
  authenticateJwt("User"),
  async (req, res) => {
    try {
      await restoreCache();
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
