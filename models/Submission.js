const { ObjectId } = require("mongodb");
const { getDB } = require("../config/database");

class Submission {
  constructor() {
    this.collectionName = "submissions";
  }

  /**
   * Get MongoDB collection
   */
  getCollection() {
    const db = getDB();
    return db.collection(this.collectionName);
  }

  /**
   * Create a new submission
   */
  async create(submissionData) {
    const collection = this.getCollection();

    // Validate
    this.validateSubmissionData(submissionData);

    const document = {
      ...submissionData,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active",
    };

    const result = await collection.insertOne(document);

    if (!result.insertedId) {
      throw new Error("Failed to create submission");
    }

    return { _id: result.insertedId, ...document };
  }

  /**
   * Find submission by ID
   */
  async findById(id) {
    if (!ObjectId.isValid(id)) {
      throw new Error("Invalid submission ID format");
    }
    const collection = this.getCollection();
    return collection.findOne({ _id: new ObjectId(id), status: "active" });
  }

  /**
   * Find submission by email
   */
  async findByEmail(email) {
    const collection = this.getCollection();
    return collection.findOne({ email, status: "active" });
  }

  /**
   * Validate submission data
   */
  validateSubmissionData(data) {
    const required = ["name", "email", "phone"];
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`${field} is required`);
      }
    }

    if (!/^[a-zA-Z\s]{3,30}$/.test(data.name)) {
      throw new Error("Invalid name format");
    }

    if (!/^\d{10}$/.test(data.phone)) {
      throw new Error("Phone must be exactly 10 digits");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error("Invalid email format");
    }
  }
}

module.exports = new Submission();
