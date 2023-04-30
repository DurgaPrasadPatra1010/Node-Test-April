const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const session = require("express-session");
const mongosession = require("connect-mongodb-session")(session);
const { cleanUpAndValidate, jwtSign, sendVerificationEmail, validateEmail } = require("./utils/AuthUtils")
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const userSchema = require("./models/UserSchema");
const bookSchema = require("./models/BookSchema")
const validator = require("validator");
const isAuth = require("./middleware/isAuth");





const app = express();
const PORT = process.env.PORT || 8000;

// database connect 
const MONGO_URI = `mongodb+srv://durgaprasadptr10:12345@cluster0.2pahg0d.mongodb.net/library-management`
mongoose.set("strictQuery", false);
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then((res) => {
        console.log("Connect to DB successfully")
    })
    .catch((err) => {
        console.log("failed connect", err);
    })

const store = new mongosession({
    uri: MONGO_URI,
    collection: "sessions"
})

app.use(session({
    secret: "hello",
    resave: false,
    saveUninitiaiized: false,
    store: store
}));





app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("home");
})
app.get("/register", (req, res) => {
    res.render("register");
})
app.get("/login", (req, res) => {
    res.render("login");
})


app.post("/register", async (req, res) => {
    console.log(req.body);
    const { name, email, username, phonenumber, password } = req.body;
    const phoneNumber = phonenumber.toString();
    try {

        await cleanUpAndValidate({ name, email, username, password, phoneNumber });
        // console.log("validate");
    } catch (err) {
        return res.send({ status: 400, message: err })
    }

    const hashedPassword = await bcrypt.hash(password, 7);
    console.log(hashedPassword);

    let user = new userSchema({
        name: name,
        username: username,
        password: hashedPassword,
        phoneNumber: phoneNumber,
        email: email,
        emailAuthenticated: false,
    });


    let userExists;
    try {
        userExists = await userSchema.findOne({ email });
    } catch (err) {
        return res.send({
            status: 400,
            message: "Internal error",
            error: err
        })
    }

    if (userExists) {
        return res.send({
            status: 400,
            message: "user already exists"
        })
    }

    const verificationToken = jwtSign(email);

    console.log("verificationTOken  : ", verificationToken);
    try {
        const userDB = await user.save();
        console.log(userDB);
        sendVerificationEmail(email, verificationToken);
        return res.send({
            status: 200,
            message: "Verification mail has been sent to your mail id",
            data: {
                _id: userDB._id,
                username: userDB.username,
                email: userDB.email,
            }
        })
    }
    catch (err) {
        return res.send({
            status: 400,
            message: "Server error",
            error: err,
        })
    }

})

app.get("/verifyEmail/:id", (req, res) => {
    const token = req.params.id;
    jwt.verify(token, "hellobuddy", async (err, verifiedJwt) => {
        console.log(verifiedJwt)

        if (err) res.send(err);

        const userDb = await userSchema.findOneAndUpdate(
            { email: verifiedJwt.email }
            , { emailAuthenticated: true }
        )

        if (userDb) {
            return res.status(200).redirect("/login")

        } else {
            return res.send({
                status: 400,
                message: "Invalid session link"
            })
        }
    })
    return res.status(200);
})

app.get("/forget_password", (req, res) => {
    res.render("forgetPassword");
})

app.get('/resendVerificationMail', (req, res) => {
    res.render('resendVerificationMail');
})

app.get("/forgetPassword/:id", (req, res) => {
    const token = req.params.id;
    jwt.verify(token, "hellobuddy", async (err, verifiedJwt) => {

        if (err) res.send(err);

        const userDb = await userSchema.findOneAndUpdate(
            { email: verifiedJwt.email }
            , { emailAuthenticated: true }
        )

        if (userDb) {
            return res.status(200).redirect("/dashboard")

        } else {
            return res.send({
                status: 400,
                message: "invalid session link"
            })
        }
    })
    return res.status(200);
})


app.post("/login", async (req, res) => {
    // console.log(req);
    const { loginId, password } = req.body;

    if (typeof loginId !== "string" ||
        typeof password !== "string" ||
        !loginId ||
        !password) {
        return res.send({
            status: 400,
            message: "Invaid data"
        })
    }

    let userDB;
    try {
        if (validator.isEmail(loginId)) {
            userDB = await userSchema.findOne({ email: loginId });
        } else {
            userDB = await userSchema.findOne({ username: loginId });
        }

        if (!userDB) {
            return res.send({
                status: 400,
                message: "User not found. Please register first"
            })
        }



        if (userDB.emailAuthenticated == false) {
            return res.send({
                status: 400,
                message: "Please verify your email"
            })
        }


        //password compare
        const isMatch = await bcrypt.compare(password, userDB.password);
        if (!isMatch) {
            return res.send({
                status: 400,
                message: "Invalid Password",
                data: req.body
            })
        }

        req.session.isAuth = true;
        req.session.user = {
            username: userDB.username,
            email: userDB.email,
            userId: userDB._id,
        }
        // console.log("hello")

        res.redirect("/dashboard")
    }
    catch (err) {
        return res.send({
            status: 400,
            message: "internal server error",
            error: err,
        })
    }
})



//route for forget password
app.post('/forgetPassword', async (req, res) => {
    console.log(req.body);
    const { loginId, oldpassword, newpassword } = req.body;
    console.log(loginId)


    if (!loginId || !oldpassword || !newpassword) {
        return res.send({
            status: 405,
            message: `missing credentials`,
        })
    }
    if (typeof loginId !== "string" || typeof oldpassword !== "string" || typeof newpassword !== "string") {
        return res.send({
            status: 400,
            message: "invalid credentials",
        })
    }

    try {
        let isUser;

        console.log(validator.isEmail('loginId'))
        if (validator.isEmail('loginId')) {
            isUser = await userSchema.findOne({ email: loginId });
        } else {
            isUser = await userSchema.findOne({ username: loginId });
        }
        console.log(isUser);
        if (!isUser) {
            return res.send({
                status: 400,
                message: "user not exist",
            })
        };

        if (!isUser.emailAuth) {
            console.log(isUser.emailAuth);
            return res.send({
                status: 400,
                message: "please verify email first",
            })
        };
        //validate password is correct or not
        const isMatch = await bcrypt.compare(oldpassword, isUser.password);
        if (!isMatch) {
            return res.send({
                status: 400,
                message: 'Password is not matched',
            })
        }
        try {
            const hashPassword = await bcrypt.hash(newpassword, 7);
            const update = await userSchema.findOneAndUpdate({ username: loginId }, { password: hashPassword });

        } catch (error) {
            return res.status({
                status: 400,
                message: "error in db while changing  the password",
                error: error,
            })
        }
        return res.status(200).redirect('login')
    } catch (error) {
        console.log(error);
        return res.send({
            status: 400,
            message: "User does not exist",
            error: error,
        })
    }
})


app.post('/resendVerificationMail', async (req, res) => {
    console.log(req.body);
    const { loginId } = req.body;
    if (validator.isEmail(loginId)) {

        const token = jwtSign(loginId);
        // console.log(token);
        try {
            sendVerificationEmail(loginId, token);
            return res.status(200).redirect("/login");
        } catch (error) {
            console.log(error);
            return res.send({
                status: 400,
                message: "error in resend varification mail",
                error: error,
            })
        }
    } else {
        return res.send("Please provide a valid email address")
    }
})


app.get("/dashboard", isAuth, async (req, res) => {
    console.log(req.body)
    const username = req.session.user.username;


    try {
        const bookdata = await bookSchema.find({ username: username })
        // console.log(bookdata)
        res.render("dashboard", {
            bData: bookdata
        })

    } catch (err) {
        return res.send({
            status: 500,
            message: "Database error",
            error: err,
        });
    }
})
app.post("/dashboard", isAuth, (req, res) => {
    console.log(req.session.user)
})

app.get("./newPassword", (req, res) => {
    res.render("inputpassword")
})

//books api
app.post("/addBook", isAuth, async (req, res) => {
    // console.log("HEllo")
    console.log(req.body);
    // console.log(req.body['book-title']);

    const booktitle = req.body['book-title'];
    const bookauthor = req.body['author-name'];
    const bookprice = req.body['book-price'];
    const bookcategory = req.body['book-category'];



    //intialize book schema and store it in Db
    const newBook = new bookSchema({
        title: booktitle,
        author: bookauthor,
        price: bookprice,
        category: bookcategory,
        username: req.session.user.username
    });

    // const newBook = new bookSchema(req.body)

    try {
        const booksDb = await newBook.save();

        console.log(newBook);
        console.log(booksDb);

        res.redirect("/dashboard")
    } catch (error) {
        return res.send({
            status: 500,
            message: "Database error",
            error: error,
        });
    }
});

app.listen(PORT, () => {
    console.log(`My server is ${PORT}`)
})