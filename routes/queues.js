const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const User = require('../models/user');
const Queue = require('../models/queue');

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    const existingQueue = await Queue.findOne({ name: name });
    if (existingQueue) return res.status(400).send('Queue name already exists');

    const queue = new Queue({
      name: name,
      userCategories: [],
      availableCategories: []
    });

    await queue.save();
    res.status(201).send('Queue created successfully.');
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const queues = await Queue.find({}, '_id name');
    res.status(200).json(queues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/:queueId', async (req, res) => {
  try {
    const queueId = req.params.queueId;

    // Check if the queue with the given ID exists
    const queue = await Queue.findById(queueId);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    // Perform the deletion
    await Queue.findByIdAndDelete(queueId);

    res.status(200).json({ message: 'Queue deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/:queueId', async (req, res) => {
  try {
    const queueId = req.params.queueId;
    const { name } = req.body;

    // Check if the queue with the given ID exists
    const queue = await Queue.findById(queueId);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    // Update the queue fields
    queue.name = name;

    // Save the updated queue
    await queue.save();

    res.status(200).json({ message: 'Queue updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// for plan page
router.get('/:queueId/survey', async (req, res) => {  
  try {
    const queueId = req.params.queueId;

    const queue = await Queue.findById(queueId, 'survey availableCategories').populate('availableCategories');

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    const sanitizedCategories = queue.availableCategories.map(cat => {
      const { queue, ...sanitizedCategory } = cat.toObject(); // Exclude the 'queue' field
      return sanitizedCategory;
    });

    res.status(200).json({ _id: queue._id, survey: queue.survey, availableCategories: sanitizedCategories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/:queueId/survey', async (req, res) => {
  try {
    const queueId = req.params.queueId;

    const newSurvey = req.body.survey;

    const queue = await Queue.findById(queueId);

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    queue.survey = newSurvey;

    await queue.save();
    res.status(200).json({ message: 'Survey updated', queue: queue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/:queueId/available-users', async (req, res) => {
  try {
    const queueId = req.params.queueId;

    const queue = await Queue.findById(queueId, 'userCategories');

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    // Extract the user IDs that are already in the queue
    const usersInQueue = queue.userCategories.map(userCategory => userCategory.user.toString());

    // Find all clients in the system that are not in the queue
    const availableUsers = await User.find({
      _id: { $nin: usersInQueue },
      role: 'client'
    }, 'username _id');
    
    res.status(200).json(availableUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/:queueId/users', async (req, res) => {
  try {
    const queueId = req.params.queueId;

    // Find the queue and populate the userCategories field
    const queue = await Queue.findById(queueId).populate('userCategories.user userCategories.categories');

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    // Extract relevant information for each user
    const usersInfo = queue.userCategories.map((userCategory) => ({
      _id: userCategory.user._id,
      username: userCategory.user.username,
      categories: userCategory.categories.map(category => ({
        _id: category._id,
        name: category.name
      }))
    }));

    res.status(200).json(usersInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Adds user to queue
router.post('/:queueId/users/:userId', async (req, res) => {
  try {
    const queueId = req.params.queueId;
    const userId = req.params.userId;

    // Find the user and queue
    const user = await User.findById(userId);
    const queue = await Queue.findById(queueId);

    if (!user || !queue) {
      return res.status(404).json({ error: 'User or Queue not found' });
    }

    // Check if the user is already in the queue
    const existingUserCategory = queue.userCategories.find(uc => uc.user.equals(user._id));
    if (existingUserCategory) {
      return res.status(400).json({ error: 'User is already in the queue' });
    }

    // Add user to the queue's userCategories array
    queue.userCategories.push({
      user: user._id,
      categories: []
    });

    await queue.save();
    res.status(201).json({ message: 'User added to the queue successfully', queue: queue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Deletes user from queue
router.delete('/:queueId/users/:userId', async (req, res) => {
  try {
    const queueId = req.params.queueId;
    const userId = req.params.userId;

    // Find the user and queue
    const user = await User.findById(userId);
    const queue = await Queue.findById(queueId);

    if (!user || !queue) {
      return res.status(404).json({ error: 'User or Queue not found' });
    }

    // Remove the user from the queue's userCategories array
    queue.userCategories = queue.userCategories.filter(uc => !uc.user.equals(user._id));

    await queue.save();
    res.status(200).json({ message: 'User removed from the queue successfully', queue: queue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Updates categories list for a user
router.put('/:queueId/users/:userId', async (req, res) => {
  try {
    const queueId = req.params.queueId;
    const userId = req.params.userId;
    const newCategories = req.body.categories;

    // Find the user and queue
    const user = await User.findById(userId);
    const queue = await Queue.findById(queueId);

    if (!user || !queue) {
      return res.status(404).json({ error: 'User or Queue not found' });
    }

    // Find the user's category in the queue
    const userCategory = queue.userCategories.find(uc => uc.user.equals(user._id));

    if (!userCategory) {
      return res.status(404).json({ error: 'User not found in the queue' });
    }

    // Update the user's categories
    userCategory.categories = newCategories;

    await queue.save();
    res.status(200).json({ message: 'User categories updated successfully', queue: queue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get list of available categories for a queue
router.get('/:queueId/categories', async (req, res) => {
  try {
    const queueId = req.params.queueId;

    // Find the queue and populate the 'availableCategories' field
    const queue = await Queue.findById(queueId).populate('availableCategories');

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    // Extract relevant information for each category
    const categoriesInfo = queue.availableCategories.map(category => ({
      _id: category._id,
      name: category.name
    }));

    res.status(200).json(categoriesInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add new category to a queue
router.post('/:queueId/categories', async (req, res) => {
  try {
    const queueId = req.params.queueId;
    const categoryName = req.body.name;

    // Find the queue
    const queue = await Queue.findById(queueId);

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const existingCategory = await Category.findOne({name: categoryName});
    if (existingCategory) return res.status(400).send('Category with that name already exists');

    // Create and save the new category
    const newCategory = new Category({
      name: categoryName,
      queue: queueId
    });

    await newCategory.save();

    queue.availableCategories.push(newCategory._id);
    await queue.save();

    res.status(201).json({ message: 'Category added successfully', category: newCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Remove category from a queue
router.delete('/:queueId/categories/:categoryId', async (req, res) => {
  try {
    const queueId = req.params.queueId;
    const categoryId = req.params.categoryId;

    // Find the queue
    const queue = await Queue.findById(queueId);

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    queue.userCategories.forEach(userCategory => {
      userCategory.categories = userCategory.categories.filter(category => !category.equals(categoryId));
    });

    // Remove the category from the 'availableCategories' array in the queue
    queue.availableCategories = queue.availableCategories.filter(category => !category.equals(categoryId));
    await queue.save();

    // Delete the category document
    await Category.findByIdAndDelete(categoryId);

    res.status(200).json({ message: 'Category removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update category in a queue
router.put('/:queueId/categories/:categoryId', async (req, res) => {
  try {
    const queueId = req.params.queueId;
    const categoryId = req.params.categoryId;
    const updatedCategoryName = req.body.name;

    // Find the queue and category
    const queue = await Queue.findById(queueId);
    const category = await Category.findById(categoryId);

    if (!queue || !category) {
      return res.status(404).json({ error: 'Queue or Category not found' });
    }

    if (updatedCategoryName !== category.name) {
      const existingCategory = await Category.findOne({name: updatedCategoryName});
      if (existingCategory) return res.status(400).send('Category with that name already exists');
    }
    

    // Update the category name
    category.name = updatedCategoryName;
    await category.save();

    res.status(200).json({ message: 'Category updated successfully', category: category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

module.exports = router;