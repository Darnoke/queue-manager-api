const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const User = require('../models/user');
const Question = require('../models/question');
const Queue = require('../models/queue');
const Worker = require('../models/worker');

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    const existingQueue = await Queue.findOne({ name: name });
    if (existingQueue) return res.status(400).send('Queue name already exists');

    const queue = new Queue({
      name: name,
      workers: [],
      clients: [],
      availableCategories: [],
      questions: [],
    });

    await queue.save();
    res.status(201).send('Queue created successfully.');
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/', async (req, res) => {
  try {
    const queues = await Queue.find({}, '_id name');
    res.status(200).json(queues);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
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

    for (let questionId of queue.questions) {
      Question.findByIdAndDelete(questionId);
    }

    for (let categoryId of queue.availableCategories) {
      Category.findByIdAndDelete(categoryId);
    }

    // Perform the deletion
    await Queue.findByIdAndDelete(queueId);

    res.status(200).json({ message: 'Queue deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
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
    res.status(500).send('Internal Server Error');
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
    res.status(500).send('Internal Server Error');
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

    const updatedQueue = await Queue.findById(queueId, 'survey questions');

    // update questions
    
    const questions = [];
    for (let i = 0; i < updatedQueue.survey.nodes.length; i++) {
      const node = updatedQueue.survey.nodes[i];

      if (node.type !== 'question') continue;

      const answers = [];

      for (let j = 0; j < updatedQueue.survey.edges.length; j++) { // find the edges to fill answers targets
        const edge = updatedQueue.survey.edges[j];
        if (edge.source === node.id) {
          const answer = updatedQueue.survey.nodes.find(n => n.id === edge.target);
          if (answer.type === 'end') {
            answers.push({
              id: answer.id,
              answer: node.data.answers.find(a => a.id === edge.sourceHandle).answer,
              isEnd: true,
              category: answer.data.categoryId,
            });
          } else {
            answers.push({
              id: answer.id,
              answer: node.data.answers.find(a => a.id === edge.sourceHandle).answer,
              isEnd: false,
              nextQuestion: answer._id,
            });
          }
        }
      }

      questions.push({
        _id: node._id,
        question: node.data.question,
        answers: answers,
        isStart: false,
      });
    }

    // find start node and mark it as start
    const startNodeId = updatedQueue.survey.nodes.find(n => n.type === 'start').id;
    const startNodeEdgeTarget = updatedQueue.survey.edges.find(e => e.source === startNodeId).target;
    const firstNode = updatedQueue.survey.nodes.find(n => n.id === startNodeEdgeTarget);

    questions.map(q => {
      if (q._id === firstNode._id) {
        q.isStart = true;
      }
      return q;
    });

    // remove unused questions
    const questionIds = questions.map(q => q._id);
    const questionsToDelete = updatedQueue.questions.filter(q => !questionIds.includes(q));
    for (let questionId of questionsToDelete) {
      Question.findByIdAndDelete(questionId);
    }

    // add or update questions
    Promise.all(
      questions.map((question) => {
        return Question.findByIdAndUpdate(
          question._id,
          question,
          { upsert: true, new: true, setDefaultsOnInsert: true },
        ).exec(); // executing the query to return a promise
      })
    )
    .then((results) => {
      // process results if needed
    })
    .catch((err) => {
      // handle errors
      console.error(err);
    });

    // save questions ids to queue
    updatedQueue.questions = questions.map(q => q._id);
    await updatedQueue.save();

    res.status(200).json({ message: 'Survey updated', queue: queue });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/:queueId/available-users', async (req, res) => {
  try {
    const queueId = req.params.queueId;

    const queue = await Queue.findById(queueId, 'workers').populate('workers', 'user');

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    // Extract the user IDs that are already in the queue
    const usersInQueue = queue.workers.map(worker => worker.user.toString());

    // Find all workers in the system that are not in the queue
    const availableUsers = await User.find({
      _id: { $nin: usersInQueue },
      role: 'worker'
    }, 'username _id');
    
    res.status(200).json(availableUsers);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/:queueId/users', async (req, res) => {
  try {
    const queueId = req.params.queueId;

    const queue = await Queue.findById(queueId).populate({
      path: 'workers',
      populate: {
        path: 'user categories',
        select: 'username name _id'
      }
    });

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    // Extract relevant information for each user
    const usersInfo = queue.workers.map((worker) => ({
      _id: worker.user._id,
      username: worker.user.username,
      categories: worker.categories.map(category => ({
        _id: category._id,
        name: category.name
      }))
    }));

    res.status(200).json(usersInfo);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Adds user to queue
router.post('/:queueId/users/:userId', async (req, res) => {
  try {
    const queueId = req.params.queueId;
    const userId = req.params.userId;

    // Find the user and queue
    const user = await User.findById(userId);
    const queue = await Queue.findById(queueId).populate('workers', 'user');

    if (!user || !queue) {
      return res.status(404).json({ error: 'User or Queue not found' });
    }

    // Check if the user is already in the queue
    const existingUserCategory = queue.workers.find(worker => worker.user.equals(user._id));
    if (existingUserCategory) {
      return res.status(400).json({ error: 'User is already in the queue' });
    }

    // Add user to the queue's workers array
    const newWorker = new Worker({
      queue: queueId,
      user: user._id,
      categories: [],
      clientActionsHistory: [],
    })

    await newWorker.save();

    queue.workers.push(newWorker._id);

    await queue.save();
    res.status(201).json({ message: 'User added to the queue successfully', queue: queue });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Deletes user from queue
router.delete('/:queueId/users/:userId', async (req, res) => {
  try {
    const queueId = req.params.queueId;
    const userId = req.params.userId;

    // Find the user and queue
    const user = await User.findById(userId);
    const queue = await Queue.findById(queueId).populate('workers', 'user');

    if (!user || !queue) {
      return res.status(404).json({ error: 'User or Queue not found' });
    }

    // Remove the user from the queue's workers array
    const workerToRemove = queue.workers.find(worker => worker.user.equals(user._id));
    queue.workers = queue.workers.filter(worker => !worker.equals(workerToRemove._id));

    Worker.findByIdAndDelete(workerToRemove._id);

    await queue.save();
    res.status(200).json({ message: 'User removed from the queue successfully', queue: queue });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
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
    const queue = await Queue.findById(queueId).populate({
      path: 'workers',
      populate: { path: 'categories user' }
    });

    if (!user || !queue) {
      return res.status(404).json({ error: 'User or Queue not found' });
    }

    // Find the user's category in the queue
    const worker = queue.workers.find(worker => worker.user.equals(user._id));

    if (!worker) {
      return res.status(404).json({ error: 'User not found in the queue' });
    }

    // Update the user's categories
    worker.categories = newCategories;

    await worker.save();
    await queue.save();
    res.status(200).json({ message: 'User categories updated successfully', queue: queue });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
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
    res.status(500).send('Internal Server Error');
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

    const existingCategory = await Category.findOne({name: categoryName, queue: queueId});
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
    res.status(500).send('Internal Server Error');
  }
});

// Remove category from a queue
router.delete('/:queueId/categories/:categoryId', async (req, res) => {
  try {
    const queueId = req.params.queueId;
    const categoryId = req.params.categoryId;

    // Find the queue
    const queue = await Queue.findById(queueId).populate('workers');

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    queue.workers.forEach(worker => {
      worker.categories = worker.categories.filter(category => !category.equals(categoryId));
    });

    await Promise.all(queue.workers.map(worker => worker.save()));

    // Remove the category from the 'availableCategories' array in the queue
    queue.availableCategories = queue.availableCategories.filter(category => !category.equals(categoryId));
    await queue.save();

    // Delete the category document
    await Category.findByIdAndDelete(categoryId);

    res.status(200).json({ message: 'Category removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
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
    res.status(500).send('Internal Server Error');
  }
})

module.exports = router;