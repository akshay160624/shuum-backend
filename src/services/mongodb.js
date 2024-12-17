import mongoose from "mongoose";
import * as dotenv from "dotenv";
dotenv.config();
mongoose.Promise = Promise;

let connection;

const getMongodbClient = async () => {
  try {
    const options = {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    };
    await mongoose.connect(process.env.MONGODB_URI, options);
    mongoose.set("debug", true);
    connection = mongoose.connection;
    return mongoose.connection;
  } catch (error) {
    throw error;
  }
};

export const fetchOneFromDb = async (collectionName = "", filter = {}, project = {}, options = { limit: 0, skip: 0 }) => {
  try {
    if (!connection) {
      await getMongodbClient();
    }
    const collection = await connection.db.collection(collectionName);
    const result = await collection.findOne(filter);
    return result;
  } catch (error) {
    throw error;
  }
};

export const fetchAllFromDb = async (collectionName = "", filter = {}, project = {}, sort = {}, options = { limit: 0, skip: 0 }) => {
  try {
    if (!connection) {
      await getMongodbClient();
    }
    const collection = await connection.db.collection(collectionName);
    const result = await collection.find(filter).project(project).sort(sort).limit(options.limit).skip(options.skip).toArray();

    return result;
  } catch (error) {
    throw error;
  }
};

export const insertOneToDb = async (collectionName = "", data = {}) => {
  try {
    if (!connection) {
      await getMongodbClient();
    }
    const collection = await connection.db.collection(collectionName);
    const result = await collection.insertOne(data);
    return result;
  } catch (error) {
    throw error;
  }
};

export const updateOneToDb = async (collectionName = "", filter = {}, update = {}, options = { returnOriginal: false }) => {
  try {
    if (!connection) {
      await getMongodbClient();
    }
    const collection = await connection.db.collection(collectionName);
    const result = await collection.findOneAndUpdate(filter, { $set: update }, options);
    return result;
  } catch (error) {
    throw error;
  }
};

export const aggregateFromDb = async (collectionName = "", query = []) => {
  try {
    if (!connection) {
      await getMongodbClient();
    }
    const collection = await connection.db.collection(collectionName);
    const result = await collection.aggregate(query).toArray();
    return result;
  } catch (error) {
    throw error;
  }
};

export const insertManyToDb = async (collectionName = "", data = []) => {
  try {
    if (!connection) {
      await getMongodbClient();
    }
    const collection = await connection.db.collection(collectionName);
    const result = await collection.insertMany(data);
    return result;
  } catch (error) {
    throw error;
  }
};

export const deleteOneFromDb = async (collectionName = "", filter = {}) => {
  try {
    if (!connection) {
      await getMongodbClient();
    }
    const collection = await connection.db.collection(collectionName);
    const result = await collection.deleteMany(filter);
    return result;
  } catch (error) {
    throw error;
  }
};

export const updateManyToDb = async (collectionName = "", filter = {}, update = {}, options = { multi: true, returnOriginal: false }) => {
  try {
    if (!connection) {
      await getMongodbClient();
    }
    const collection = await connection.db.collection(collectionName);
    const result = await collection.updateMany(filter, { $set: update }, options);
    return result;
  } catch (error) {
    throw error;
  }
};
