import mongoose from 'mongoose';

const User = new mongoose.Schema({
    email : {type: String, required: true, unique: true},
    password: {type: String, required: true},
}, {collection: 'user-data'})

const Userdata = mongoose.model('UserData', User)

export default Userdata