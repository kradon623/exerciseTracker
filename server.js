const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,   
}).then(() => console.log("Database connected!"))
  .catch(err => console.log(err));

  app.use(bodyParser.json()); 
  app.use(bodyParser.urlencoded({ extended: false }));  

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

const userSchema = new mongoose.Schema({
  username: String
});

const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: String
});

const User = mongoose.model('User', userSchema);

const Exercise = mongoose.model('Exercise', exerciseSchema);

app.post('/api/users', (req, res, next)=>{
  console.log('Post for users');
  var uname = req.body.username;
  User.findOne({username: uname}, (err, found)=>{
    if (err) return console.log(err);
    return found;
  }).then(a=>{
    if (a !== null){
      res.send('Username already taken');
    } else {
      next();
    }
  }).catch(err=>{console.log(err)})
}, (req, res, next)=>{
  var nuevoUsuario = new User({ username: req.body.username });
  nuevoUsuario.save((err, saved)=>{
    if (err) return console.log(err);
    console.log('Guardando... '+saved)
    next();
  })
}, (req, res)=>{
  User.findOne({username: req.body.username}, (err, found)=>{
    if (err) return console.log(err);
    return found;
  }).then(a=>{
    res.json({'username': a.username, '_id': a._id});
  })
}
);

app.get('/api/users', (req, res)=>{
  console.log('Get for users');
  User.find({}, (err, found)=>{
    if (err) return console.log(err);
    return found;
  }).then(a=>{
    res.send(a);
  })
}
);

app.post('/api/users/:_id/exercises', (req, res, next)=>{
  console.log('Post for exercises');
  if (req.body.date == "" || req.body.date == null || req.body.date == undefined){
    let date = Date();
    // Pasar la fecha si o si a la forma formateada
    date = date.slice(0, 15);
    req.date = date;
    console.log("Esta es la fecha formateada "+req.date)
  } else {
    // req.date = req.body.date
    let date = new Date(req.body.date).toDateString();
    req.date = date.slice(0,15);
    console.log("Esta es la fecha sin formatear "+req.body.date)
    console.log("Esta es la fecha formateada "+req.date)
  };
  req.duration = parseInt(req.body.duration);
  User.findById(req.params._id, (err, found)=>{
    if (err) return console.log('Error de busqueda: ' + err);
    return found;
  }).then(a=>{
    if (a === null){res.send("Username invalid")}
    req.username = a.username;
    next();
  }).catch(err=>{console.log(err)})  
}, (req, res, next) => {
  var nuevoEjercicio = new Exercise({
    userId: req.params._id,
    date: req.date,
    duration: req.body.duration,
    description: req.body.description
  });
  req.nuevoEjercicio = nuevoEjercicio;
  nuevoEjercicio.save((err, saved)=>{
    if (err) return console.log('Error al guardar: '+err);
    console.log('Ejercicio Guardado');
    next();
  });
}, (req, res) => {
  res.json({
    "_id": req.params._id,
    "username": req.username,
    "date": req.date,
    "duration": req.duration,
    "description": req.body.description
  })
}
);

app.get('/api/users/:_id/logs', (req, res, next)=>{
  console.log('Get for logs' + req.originalUrl);
  User.findById(req.params._id, (err, found)=>{
    if (err) return console.log(err);
    req.username = found.username
    console.log('Elusername1 '+req.username);
    return found;
  }).then(a=>{
    console.log('Transicion al siguiente middleware')
    next();
  }).catch(err=>{console.log(err)});
}, (req, res) => {
  var {from, to, limit} = req.query;
  console.log("Segundo Middleware")
  Exercise.find({userId: req.params._id}, (err, found)=>{
    if (err) return console.log(err);
    return found;
  }).then(a=>{
    // console.log('1 '+arr);
    var j = [];
    for (let i=0; i < a.length; i++) {
      j.push({
        description: a[i].description,
        duration: a[i].duration,
        date: a[i].date
      });
    };
    // begin copy
    if(from){
      const fromDate= new Date(from)
      j = j.filter(exe => new Date(exe.date) > fromDate);
    };
    
    if(to){
      const toDate = new Date(to)
      j = j.filter(exe => new Date(exe.date) < toDate);
    };
    
    if(limit){
      j = j.slice(0,limit);
    };
    // close copy
    console.log('Array compuesto '+j);
    console.log('Elusername2 '+req.username);
    res.json({
      _id: req.params._id,
      username: req.username,
      count: j.length,
      log: j
    });
    // console.log("array devuelta "+arr)
  }).catch(err=>{console.log(err)});
}
);
