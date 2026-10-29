// Controller: reads the request, calls the model, sends the response.
const UserModel = require("../models/user.model");
const parsePositiveInt = require("../utils/parsePositiveInt");

// Pagination defaults.
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// GET /api/users?page=2&limit=10&name=ari
async function getUsers(req, res) {
  try {
    const { name } = req.query;

    const page = parsePositiveInt(req.query.page, 1);
    const requestedLimit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);

    if (page === null || requestedLimit === null) {
      return res.status(400).json({
        message: "page and limit must be positive whole numbers",
      });
    }

    // Never let a client ask for more than MAX_LIMIT documents.
    const limit = Math.min(requestedLimit, MAX_LIMIT);

    let searchText;

    if (name !== undefined) {
      // ?name=a&name=b gives an array, ?name[x]=1 gives an object. Only allow a string.
      if (typeof name !== "string") {
        return res.status(400).json({ message: "name must be a string" });
      }

      searchText = name.trim();

      if (!searchText) {
        return res.status(400).json({ message: "name cannot be empty" });
      }
    }

    const filter = UserModel.buildNameFilter(searchText);

    // Run both queries at the same time.
    const [users, total] = await Promise.all([
      UserModel.findUsers(filter, (page - 1) * limit, limit),
      UserModel.countUsers(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
}

// GET /api/users/:id
async function getUserById(req, res) {
  try {
    const user = await UserModel.findUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}

// POST /api/users
async function createUser(req, res) {
  try {
    const newUser = {
      ...req.validatedBody,
      createdAt: new Date(),
    };

    const user = await UserModel.createUser(newUser);

    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    // Duplicate key error from the unique email index.
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }

    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
}

// PUT /api/users/:id  (replace the whole user)
async function replaceUser(req, res) {
  try {
    const { id } = req.params;

    // Fetch the existing user (with the password hash) so createdAt and password can be kept.
    const existing = await UserModel.findUserById(id, true);

    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const replacement = {
      ...req.validatedBody,
      updatedAt: new Date(),
    };

    // Keep the original creation date if the old document had one.
    if (existing.createdAt) {
      replacement.createdAt = existing.createdAt;
    }

    // PUT replaces the whole document, so carry the stored password hash over,
    // otherwise the user could never log in again.
    if (existing.password) {
      replacement.password = existing.password;
    }

    const user = await UserModel.replaceUserById(id, replacement);

    // Null only if the user was deleted between the two calls.
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User replaced successfully", user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }

    console.error("Error replacing user:", error);
    res.status(500).json({ message: "Failed to replace user" });
  }
}

// PATCH /api/users/:id  (update only the sent fields)
async function updateUser(req, res) {
  try {
    const updates = {
      ...req.validatedBody,
      updatedAt: new Date(),
    };

    const user = await UserModel.updateUserById(req.params.id, updates);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }

    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
}

// DELETE /api/users/:id
async function deleteUser(req, res) {
  try {
    const deleted = await UserModel.deleteUserById(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User deleted successfully",
      deletedId: req.params.id,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  replaceUser,
  updateUser,
  deleteUser,
};
